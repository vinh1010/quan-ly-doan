import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, type UnitLevel } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureUnit(name: string, level: UnitLevel, parentId?: number, memberCount = 0) {
  const found = await prisma.unit.findFirst({ where: { name } });
  if (found) return found;
  return prisma.unit.create({ data: { name, level, parentId, memberCount } });
}

async function main() {
  const username = process.env.SEED_USERNAME ?? "Doanxaphucat.hni";
  const password = process.env.SEED_PASSWORD ?? "Abc@123";

  const huyen = await ensureUnit("Huyện đoàn Phúc Thọ", "HUYEN");
  const xa = await ensureUnit("Đoàn xã Phúc Cát", "XA_PHUONG", huyen.id);

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role: "SUPERIOR",
      fullName: "Cán bộ Đoàn cấp trên",
      unitId: xa.id,
    },
  });

  // Tài khoản ADMIN đầu tiên (không giới hạn đơn vị): chỉ tạo khi khai báo cả tên và mật khẩu trong môi trường.
  // Không ghi đè nếu đã tồn tại, nên đổi mật khẩu trên giao diện sẽ không bị seed đặt lại.
  const adminName = process.env.SEED_ADMIN_USERNAME?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminName && adminPassword) {
    await prisma.user.upsert({
      where: { username: adminName },
      update: {},
      create: {
        username: adminName,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "ADMIN",
        fullName: "Quản trị hệ thống",
        passwordChangedAt: new Date(),
      },
    });
    console.log(`Tài khoản ADMIN: ${adminName}`);
  }

  // Trên host công khai đặt SEED_SAMPLES=false để không tạo tài khoản mẫu (mật khẩu mẫu ai cũng đoán được)
  if (process.env.SEED_SAMPLES === "false") {
    console.log(`Seed xong (không có dữ liệu mẫu). Tài khoản cán bộ cấp trên: ${username}`);
    return;
  }

  // Đơn vị cơ sở + Bí thư mẫu (để có dữ liệu thử danh sách / tìm kiếm / xóa)
  const cs1 = await ensureUnit("Đoàn cơ sở Thôn Phúc Hạ", "CO_SO", xa.id, 86);
  const cs2 = await ensureUnit("Đoàn cơ sở Thôn Phúc Thượng", "CO_SO", xa.id, 64);
  const cs3 = await ensureUnit("Đoàn cơ sở Trường THCS Phúc Cát", "CO_SO", xa.id, 42);

  const samples = [
    {
      username: "bithu.phucha", fullName: "Nguyễn Văn An", dob: "1995-03-12", gender: "MALE" as const,
      phone: "0912345678", cccd: "001095000123", unitId: cs1.id, position: "BI_THU" as const,
      termStart: "2024-01-01", termEnd: "2027-01-01", termLabel: "2024 - 2027", status: "ACTIVE" as const,
    },
    {
      username: "bithu.phucthuong", fullName: "Trần Thị Bình", dob: "1997-07-25", gender: "FEMALE" as const,
      phone: "0987654321", cccd: "001197000456", unitId: cs2.id, position: "BI_THU" as const,
      termStart: "2024-01-01", termEnd: "2027-01-01", termLabel: "2024 - 2027", status: "ACTIVE" as const,
    },
    {
      username: "phobithu.phucthuong", fullName: "Lê Hoàng Cường", dob: "1998-11-02", gender: "MALE" as const,
      phone: "0903111222", cccd: "001098000789", unitId: cs2.id, position: "PHO_BI_THU" as const,
      termStart: "2024-01-01", termEnd: "2027-01-01", termLabel: "2024 - 2027", status: "ACTIVE" as const,
    },
    {
      // đã kết thúc nhiệm kỳ: dùng để thử chức năng xóa
      username: "bithu.thcs.cu", fullName: "Phạm Minh Đức", dob: "1993-05-30", gender: "MALE" as const,
      phone: "0934555666", cccd: "001093000321", unitId: cs3.id, position: "BI_THU" as const,
      termStart: "2019-01-01", termEnd: "2023-12-31", termLabel: "2019 - 2023", status: "ENDED" as const,
    },
  ];

  const passwordHash = await bcrypt.hash("Abc123", 10);
  for (const s of samples) {
    const extra = {
      hometownProvince: "Thành phố Hà Nội", hometownWard: "Xã Phúc Cát",
      residenceProvince: "Thành phố Hà Nội", residenceWard: "Xã Phúc Cát",
      training: "Cử nhân", politicalTheory: "Trung cấp", education: "Hệ 12/12",
      unionJoinDate: new Date("2010-03-26"), unionJoinPlace: "Xã Phúc Cát", cardIssuePlace: "Huyện đoàn Phúc Thọ",
      partyJoinDate: s.position === "BI_THU" ? new Date("2018-05-19") : null,
      partyPosition: s.position === "BI_THU" ? "Đảng viên" : null,
      occupation: "Cán bộ Đoàn", email: `${s.username.replace(/\./g, "")}@example.com`,
    };
    const existing = await prisma.secretary.findUnique({ where: { cccd: s.cccd } });
    if (existing) {
      await prisma.secretary.update({ where: { id: existing.id }, data: extra });
      continue;
    }
    const user = await prisma.user.create({
      data: {
        username: s.username, passwordHash, role: "SECRETARY", fullName: s.fullName,
        unitId: s.unitId, status: s.status === "ACTIVE" ? "ACTIVE" : "LOCKED",
      },
    });
    await prisma.secretary.create({
      data: {
        userId: user.id, unitId: s.unitId, fullName: s.fullName, dob: new Date(s.dob), gender: s.gender,
        phone: s.phone, cccd: s.cccd, position: s.position, termStart: new Date(s.termStart),
        termEnd: new Date(s.termEnd), termLabel: s.termLabel, status: s.status,
        ethnicity: "Kinh", address: "Xã Phúc Cát, Huyện Phúc Thọ, Hà Nội", ...extra,
      },
    });
  }

  console.log(`Seed xong. Tài khoản cán bộ cấp trên: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
