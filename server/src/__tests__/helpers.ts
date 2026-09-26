import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../prisma";

export const app = createApp();

/** Xóa sạch dữ liệu nghiệp vụ, giữ lại kết nối, để mỗi file test bắt đầu từ trạng thái sạch. */
export async function resetDb() {
  await prisma.auditLog.deleteMany();
  await prisma.secretary.deleteMany();
  await prisma.user.deleteMany();
  await prisma.unit.deleteMany();
}

const PASSWORD = "Abc123x";

/**
 * Dựng cây đơn vị và các tài khoản mốc dùng chung cho nhiều test:
 *
 *   Huyện đoàn A
 *   └─ Xã A (huyenA.xaA)          -- SUPERIOR: superiorA
 *      └─ Cơ sở A1 (huyenA.coSoA1) -- SECRETARY: secretaryA1 (đang tại chức)
 *   Huyện đoàn B
 *   └─ Xã B (huyenB.xaB)          -- SUPERIOR: superiorB  (ngoài phạm vi của superiorA)
 */
export async function seedBase() {
  const huyenA = await prisma.unit.create({ data: { name: "Huyện đoàn A", level: "HUYEN" } });
  const xaA = await prisma.unit.create({ data: { name: "Xã A", level: "XA_PHUONG", parentId: huyenA.id, memberCount: 100 } });
  const coSoA1 = await prisma.unit.create({ data: { name: "Cơ sở A1", level: "CO_SO", parentId: xaA.id, memberCount: 40 } });

  const huyenB = await prisma.unit.create({ data: { name: "Huyện đoàn B", level: "HUYEN" } });
  const xaB = await prisma.unit.create({ data: { name: "Xã B", level: "XA_PHUONG", parentId: huyenB.id, memberCount: 50 } });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const admin = await prisma.user.create({
    data: { username: "admin.test", passwordHash, role: "ADMIN", fullName: "Quản trị test", passwordChangedAt: new Date() },
  });
  const superiorA = await prisma.user.create({
    data: { username: "superiorA.test", passwordHash, role: "SUPERIOR", fullName: "Cán bộ xã A", unitId: xaA.id, passwordChangedAt: new Date() },
  });
  const superiorB = await prisma.user.create({
    data: { username: "superiorB.test", passwordHash, role: "SUPERIOR", fullName: "Cán bộ xã B", unitId: xaB.id, passwordChangedAt: new Date() },
  });

  const secUser = await prisma.user.create({
    data: { username: "secretaryA1.test", passwordHash, role: "SECRETARY", fullName: "Bí thư A1", unitId: coSoA1.id, passwordChangedAt: new Date() },
  });
  const secretaryA1 = await prisma.secretary.create({
    data: {
      userId: secUser.id,
      unitId: coSoA1.id,
      fullName: "Bí thư A1",
      dob: new Date("1995-01-01"),
      gender: "MALE",
      phone: "0911111111",
      cccd: "001199900001",
      position: "BI_THU",
      termStart: new Date("2024-01-01"),
      termEnd: new Date("2027-01-01"),
      status: "ACTIVE",
    },
  });

  return { huyenA, xaA, coSoA1, huyenB, xaB, admin, superiorA, superiorB, secUser, secretaryA1, PASSWORD };
}

export async function loginAs(username: string, password = PASSWORD) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  if (res.status !== 200) throw new Error(`Đăng nhập thất bại cho ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}

export function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}
