import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { audit } from "../lib/http";
import { createPdfBuffer } from "../lib/pdf";
import { inScope, narrowUnits, scopeOf, unitWithDescendants } from "./units.controller";

const OUT_OF_SCOPE = "Bạn không có quyền thao tác trên đơn vị này";

const POSITION_LABEL = { BI_THU: "Bí thư Đoàn cơ sở", PHO_BI_THU: "Phó Bí thư" } as const;
const STATUS_LABEL = { ACTIVE: "Đang hoạt động", ENDED: "Đã kết thúc" } as const;
const GENDER_LABEL = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" } as const;

// ---------- Validation ----------

const optText = z
  .string()
  .trim()
  .max(255, "Tối đa 255 ký tự")
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const dateStr = (label: string) =>
  z
    .string({ required_error: `Vui lòng nhập ${label}` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} không hợp lệ`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `${label} không hợp lệ`);

const optDate = (label: string) =>
  z
    .union([dateStr(label), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null));

const passwordRule = z
  .string()
  .min(6, "Mật khẩu tối thiểu 6 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu phải có chữ")
  .regex(/\d/, "Mật khẩu phải có số");

// Ảnh đại diện lưu trực tiếp trong DB dưới dạng data URL (client đã nén về ~256px), tối đa ~220KB.
// Không gửi trường này = giữ ảnh cũ; gửi "" hoặc null = xóa ảnh.
const avatarField = z
  .union([
    z
      .string()
      .max(300_000, "Ảnh quá lớn")
      .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, "Ảnh không hợp lệ"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

const profileShape = {
  avatarUrl: avatarField,
  fullName: z.string({ required_error: "Vui lòng nhập họ tên" }).trim().min(1, "Vui lòng nhập họ tên").max(150),
  dob: dateStr("ngày sinh"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { errorMap: () => ({ message: "Vui lòng chọn giới tính" }) }),
  phone: z
    .string({ required_error: "Vui lòng nhập số điện thoại" })
    .trim()
    .regex(/^(0|\+84)\d{9}$/, "Số điện thoại không hợp lệ"),
  cccd: z
    .string({ required_error: "Vui lòng nhập số CCCD/CMND" })
    .trim()
    .regex(/^(\d{9}|\d{12})$/, "CCCD/CMND phải gồm 9 hoặc 12 chữ số"),
  cccdIssuedDate: optDate("ngày cấp"),
  cccdIssuedPlace: optText,
  email: z
    .union([z.string().trim().email("Email không hợp lệ"), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  ethnicity: optText,
  religion: optText,
  address: optText,
  education: optText,
  training: optText,
  maritalStatus: optText,
  memberCode: optText,
  politicalTheory: optText,
  itLevel: optText,
  language: optText,
  hometownProvince: optText,
  hometownWard: optText,
  residenceProvince: optText,
  residenceWard: optText,
  unionJoinDate: optDate("thời gian vào Đoàn"),
  unionJoinPlace: optText,
  cardIssuePlace: optText,
  partyJoinDate: optDate("thời gian vào Đảng"),
  partyPosition: optText,
  association: optText,
  occupation: optText,
  unitId: z.coerce.number({ invalid_type_error: "Vui lòng chọn đơn vị cơ sở" }).int().positive("Vui lòng chọn đơn vị cơ sở"),
  position: z.enum(["BI_THU", "PHO_BI_THU"]).default("BI_THU"),
  termStart: dateStr("ngày bắt đầu nhiệm kỳ"),
  termEnd: optDate("ngày kết thúc nhiệm kỳ"),
  termLabel: optText,
  status: z.enum(["ACTIVE", "ENDED"]).default("ACTIVE"),
};

function checkDates(
  v: { dob: string; termStart: string; termEnd: string | null; status: string },
  ctx: z.RefinementCtx,
) {
  if (v.dob >= v.termStart) {
    ctx.addIssue({ code: "custom", path: ["dob"], message: "Ngày sinh phải trước ngày bắt đầu nhiệm kỳ" });
  }
  if (v.termEnd && v.termEnd < v.termStart) {
    ctx.addIssue({ code: "custom", path: ["termEnd"], message: "Ngày kết thúc phải sau ngày bắt đầu" });
  }
}

const createSchema = z
  .object({
    ...profileShape,
    username: z
      .string({ required_error: "Vui lòng nhập tên đăng nhập" })
      .trim()
      .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
      .max(50)
      .regex(/^[A-Za-z0-9._-]+$/, "Chỉ gồm chữ không dấu, số, . _ -"),
    password: passwordRule,
    confirmPassword: z.string({ required_error: "Vui lòng xác nhận mật khẩu" }),
  })
  .superRefine((v, ctx) => {
    checkDates(v, ctx);
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp" });
    }
  });

const updateSchema = z
  .object({
    ...profileShape,
    // để trống = giữ nguyên mật khẩu cũ (RB9)
    password: z.union([passwordRule, z.literal(""), z.null()]).optional(),
    confirmPassword: z.string().optional().nullable(),
    accountStatus: z.enum(["ACTIVE", "LOCKED"]).optional(),
  })
  .superRefine((v, ctx) => {
    checkDates(v, ctx);
    if (v.password && v.password !== v.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp" });
    }
  });

function sendValidationError(res: Response, error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!errors[key]) errors[key] = issue.message;
  }
  return res.status(400).json({ message: Object.values(errors)[0] ?? "Dữ liệu không hợp lệ", errors });
}

/** Chuyển lỗi ràng buộc của Postgres thành thông báo cho người dùng. */
function sendDbError(res: Response, e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = String(e.meta?.target ?? "");
    if (target.includes("cccd")) {
      return res.status(409).json({ message: "Số CCCD/CMND đã tồn tại", errors: { cccd: "Số CCCD/CMND đã tồn tại" } });
    }
    if (target.includes("username")) {
      return res
        .status(409)
        .json({ message: "Tên đăng nhập đã tồn tại", errors: { username: "Tên đăng nhập đã tồn tại" } });
    }
    return res.status(409).json({ message: "Dữ liệu bị trùng" });
  }
  throw e;
}

const dateOrNull = (v: string | null) => (v ? new Date(v) : null);

function profileData(v: z.infer<z.ZodObject<typeof profileShape>>) {
  return {
    avatarUrl: v.avatarUrl,
    fullName: v.fullName,
    dob: new Date(v.dob),
    gender: v.gender,
    phone: v.phone,
    email: v.email,
    cccd: v.cccd,
    cccdIssuedDate: dateOrNull(v.cccdIssuedDate),
    cccdIssuedPlace: v.cccdIssuedPlace,
    ethnicity: v.ethnicity,
    religion: v.religion,
    address: v.address,
    education: v.education,
    training: v.training,
    maritalStatus: v.maritalStatus,
    memberCode: v.memberCode,
    politicalTheory: v.politicalTheory,
    itLevel: v.itLevel,
    language: v.language,
    hometownProvince: v.hometownProvince,
    hometownWard: v.hometownWard,
    residenceProvince: v.residenceProvince,
    residenceWard: v.residenceWard,
    unionJoinDate: dateOrNull(v.unionJoinDate),
    unionJoinPlace: v.unionJoinPlace,
    cardIssuePlace: v.cardIssuePlace,
    partyJoinDate: dateOrNull(v.partyJoinDate),
    partyPosition: v.partyPosition,
    association: v.association,
    occupation: v.occupation,
    unitId: v.unitId,
    position: v.position,
    termStart: new Date(v.termStart),
    termEnd: dateOrNull(v.termEnd),
    termLabel: v.termLabel,
    status: v.status,
  };
}

const listInclude = {
  unit: { select: { id: true, name: true, level: true, parent: { select: { id: true, name: true } } } },
  user: { select: { id: true, username: true, status: true } },
} satisfies Prisma.SecretaryInclude;

// ---------- Handlers ----------

const listQuery = z.object({
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  cccd: z.string().trim().optional(),
  unitId: z.coerce.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "ENDED"]).optional(),
  termFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  termTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

/** Dùng chung cho danh sách + xuất Excel, để hai nơi luôn lọc giống hệt nhau. */
async function buildSecretaryWhere(req: Request, q: z.infer<typeof listQuery>): Promise<Prisma.SecretaryWhereInput> {
  const where: Prisma.SecretaryWhereInput = { deletedAt: null };
  if (q.name) where.fullName = { contains: q.name, mode: "insensitive" };
  if (q.phone) where.phone = { contains: q.phone };
  if (q.cccd) where.cccd = { contains: q.cccd };
  if (q.status) where.status = q.status;
  // chỉ trong phạm vi địa bàn của người dùng; đơn vị chọn ngoài phạm vi cho ra danh sách rỗng
  const scope = await scopeOf(req);
  const unitIds = narrowUnits(scope, q.unitId ? await unitWithDescendants(q.unitId) : undefined);
  if (unitIds) where.unitId = { in: unitIds };
  // nhiệm kỳ bắt đầu trong khoảng [termFrom, termTo]
  if (q.termFrom || q.termTo) {
    where.termStart = {
      ...(q.termFrom ? { gte: new Date(q.termFrom) } : {}),
      ...(q.termTo ? { lte: new Date(q.termTo) } : {}),
    };
  }
  return where;
}

export async function listSecretaries(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const q = parsed.data;
  const where = await buildSecretaryWhere(req, q);

  const [total, items] = await Promise.all([
    prisma.secretary.count({ where }),
    prisma.secretary.findMany({
      where,
      include: listInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  await audit(req, "SEARCH", "Secretary", undefined, { filters: req.query, total });
  res.json({ items, total, page: q.page, pageSize: q.pageSize });
}

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2260CF" } };

/** Xuất Excel đúng kết quả đang lọc trên trang danh sách (mục 4.6) — không giới hạn theo trang. */
export async function exportSecretariesXlsx(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const where = await buildSecretaryWhere(req, parsed.data);

  const list = await prisma.secretary.findMany({
    where,
    include: { unit: { select: { name: true } } },
    orderBy: [{ unit: { name: "asc" } }, { position: "asc" }, { fullName: "asc" }],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Hệ thống Quản lý Công tác Đoàn";
  wb.created = new Date();

  const ws = wb.addWorksheet("Danh sách cán bộ");
  ws.columns = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Họ và tên", key: "fullName", width: 26 },
    { header: "Chức vụ", key: "position", width: 20 },
    { header: "Đơn vị", key: "unit", width: 32 },
    { header: "Giới tính", key: "gender", width: 10 },
    { header: "Ngày sinh", key: "dob", width: 13 },
    { header: "Số điện thoại", key: "phone", width: 15 },
    { header: "Email", key: "email", width: 28 },
    { header: "CCCD/CMND", key: "cccd", width: 16 },
    { header: "Bắt đầu nhiệm kỳ", key: "termStart", width: 17 },
    { header: "Kết thúc nhiệm kỳ", key: "termEnd", width: 17 },
    { header: "Trạng thái", key: "status", width: 16 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.eachCell((c) => (c.fill = HEADER_FILL));

  list.forEach((s, i) =>
    ws.addRow({
      stt: i + 1,
      fullName: s.fullName,
      position: POSITION_LABEL[s.position],
      unit: s.unit.name,
      gender: GENDER_LABEL[s.gender],
      dob: s.dob,
      phone: s.phone,
      email: s.email ?? "",
      cccd: s.cccd,
      termStart: s.termStart,
      termEnd: s.termEnd ?? "",
      status: STATUS_LABEL[s.status],
    }),
  );
  for (const key of ["dob", "termStart", "termEnd"]) ws.getColumn(key).numFmt = "dd/mm/yyyy";
  // định dạng văn bản để Excel không cắt số 0 đầu của CCCD và SĐT
  for (const key of ["cccd", "phone"]) ws.getColumn(key).numFmt = "@";
  ws.views = [{ state: "frozen", ySplit: 1 }];

  await audit(req, "EXPORT", "Secretary", undefined, { filters: req.query, total: list.length });

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="danh-sach-bi-thu-${stamp}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

export async function getSecretary(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const scope = await scopeOf(req);
  const item = await prisma.secretary.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
    include: listInclude,
  });
  // ngoài phạm vi cũng trả 404 để không lộ việc bản ghi có tồn tại
  if (!item) return res.status(404).json({ message: "Không tìm thấy Bí thư" });

  // số đoàn viên quản lý của đơn vị (dùng cho màn xem chi tiết) — đếm từ bảng Đoàn viên thật,
  // không dùng Unit.memberCount (trường đếm cũ, không nơi nào cập nhật nên luôn bằng 0)
  const memberCount = await prisma.member.count({ where: { unitId: item.unitId, deletedAt: null } });
  await audit(req, "VIEW", "Secretary", id);
  res.json({ item: { ...item, memberCount } });
}

export async function createSecretary(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const v = parsed.data;

  const unit = await prisma.unit.findUnique({ where: { id: v.unitId } });
  if (!unit) return res.status(400).json({ message: "Đơn vị không tồn tại", errors: { unitId: "Đơn vị không tồn tại" } });
  if (!inScope(await scopeOf(req), v.unitId)) {
    return res.status(403).json({ message: OUT_OF_SCOPE, errors: { unitId: OUT_OF_SCOPE } });
  }

  try {
    const passwordHash = await bcrypt.hash(v.password, 10);
    const item = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: v.username,
          passwordHash,
          role: "SECRETARY",
          fullName: v.fullName,
          email: v.email,
          unitId: v.unitId,
          passwordChangedAt: new Date(),
        },
      });
      return tx.secretary.create({
        data: { ...profileData(v), userId: user.id },
        include: listInclude,
      });
    });
    await audit(req, "CREATE", "Secretary", item.id, { fullName: item.fullName, username: v.username });
    res.status(201).json({ item, message: "Thêm mới Bí thư thành công" });
  } catch (e) {
    return sendDbError(res, e);
  }
}

export async function updateSecretary(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const v = parsed.data;

  const scope = await scopeOf(req);
  const current = await prisma.secretary.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });
  if (!current) return res.status(404).json({ message: "Không tìm thấy Bí thư" });
  // không được chuyển hồ sơ sang đơn vị ngoài phạm vi của mình
  if (!inScope(scope, v.unitId)) {
    return res.status(403).json({ message: OUT_OF_SCOPE, errors: { unitId: OUT_OF_SCOPE } });
  }

  try {
    const item = await prisma.$transaction(async (tx) => {
      if (current.userId) {
        await tx.user.update({
          where: { id: current.userId },
          data: {
            fullName: v.fullName,
            email: v.email,
            unitId: v.unitId,
            ...(v.accountStatus ? { status: v.accountStatus } : {}),
            ...(v.password
              ? { passwordHash: await bcrypt.hash(v.password, 10), passwordChangedAt: new Date() }
              : {}),
          },
        });
      }
      return tx.secretary.update({ where: { id }, data: profileData(v), include: listInclude });
    });
    await audit(req, "UPDATE", "Secretary", id, { passwordChanged: !!v.password });
    res.json({ item, message: "Cập nhật thông tin thành công" });
  } catch (e) {
    return sendDbError(res, e);
  }
}

/** Xóa mềm. Không cho xóa Bí thư đang tại chức (RB5, UC4). */
export async function deleteSecretary(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const scope = await scopeOf(req);
  const current = await prisma.secretary.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });
  if (!current) return res.status(404).json({ message: "Không tìm thấy Bí thư" });

  const today = new Date();
  const inTerm = current.status === "ACTIVE" && (!current.termEnd || current.termEnd >= today);
  if (inTerm) {
    return res.status(409).json({
      message:
        "Không thể xóa Bí thư đang tại chức. Hãy cập nhật trạng thái sang “Đã kết thúc” trước khi xóa.",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.secretary.update({ where: { id }, data: { deletedAt: today } });
    if (current.userId) await tx.user.update({ where: { id: current.userId }, data: { status: "LOCKED" } });
  });
  await audit(req, "DELETE", "Secretary", id, { fullName: current.fullName });
  res.json({ message: "Xóa dữ liệu thành công" });
}

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.coerce.number().int().positive())
    .min(1, "Chưa chọn Bí thư nào")
    .max(100, "Chỉ xóa tối đa 100 mục trong một lần"),
});

/**
 * Xóa hàng loạt (mềm). Cùng quy tắc RB5 với xóa từng cái: bỏ qua (không xóa) những người
 * đang tại chức thay vì hủy toàn bộ thao tác, để không phải chọn lại từ đầu khi lỡ chọn nhầm.
 */
export async function deleteSecretariesBulk(req: Request, res: Response) {
  const parsed = bulkDeleteSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const ids = [...new Set(parsed.data.ids)];

  const scope = await scopeOf(req);
  const found = await prisma.secretary.findMany({
    where: { id: { in: ids }, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });

  const today = new Date();
  const inTerm = found.filter((s) => s.status === "ACTIVE" && (!s.termEnd || s.termEnd >= today));
  const toDelete = found.filter((s) => !inTerm.includes(s));
  const foundIds = new Set(found.map((s) => s.id));
  const notFoundCount = ids.filter((id) => !foundIds.has(id)).length;

  if (toDelete.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.secretary.updateMany({ where: { id: { in: toDelete.map((s) => s.id) } }, data: { deletedAt: today } });
      const userIds = toDelete.map((s) => s.userId).filter((id): id is number => id != null);
      if (userIds.length > 0) await tx.user.updateMany({ where: { id: { in: userIds } }, data: { status: "LOCKED" } });
    });
    for (const s of toDelete) await audit(req, "DELETE", "Secretary", s.id, { fullName: s.fullName, bulk: true });
  }

  res.json({
    message: `Đã xóa ${toDelete.length}/${ids.length} mục đã chọn`,
    deletedCount: toDelete.length,
    skippedInTerm: inTerm.map((s) => ({ id: s.id, fullName: s.fullName })),
    notFoundCount,
  });
}

const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("vi-VN") : "");
const kv = (label: string, value: string | null | undefined) => [
  { text: label, style: "label" },
  { text: value || "—", style: "value" },
];

type SecretaryWithRelations = Prisma.SecretaryGetPayload<{ include: typeof listInclude }>;

/** Dựng buffer PDF hồ sơ — dùng chung cho cán bộ cấp trên xem người khác và Bí thư tự xem mình. */
async function buildSecretaryPdf(item: SecretaryWithRelations): Promise<Buffer> {
  const twoCol = (rows: [string, string | null | undefined][]) => ({
    columns: [0, 1].map((c) => ({
      width: "*",
      table: {
        widths: ["auto", "*"],
        body: rows.filter((_, i) => i % 2 === c).map(([label, value]) => kv(label, value)),
      },
      layout: "noBorders",
    })),
    columnGap: 16,
  });

  return createPdfBuffer({
    content: [
      {
        columns: [
          item.avatarUrl
            ? { image: item.avatarUrl, width: 70, height: 70, fit: [70, 70] }
            : { text: "", width: 70 },
          {
            width: "*",
            stack: [
              { text: item.fullName.toUpperCase(), style: "h1" },
              { text: `${POSITION_LABEL[item.position]} — ${item.unit.name}`, style: "muted" },
              { text: `Trạng thái: ${STATUS_LABEL[item.status]}`, style: "muted" },
            ],
            margin: [12, 4, 0, 0],
          },
        ],
        margin: [0, 0, 0, 14],
      },
      { text: "Thông tin cá nhân", style: "h2" },
      twoCol([
        ["Ngày sinh", fmtDate(item.dob)],
        ["Giới tính", GENDER_LABEL[item.gender]],
        ["Dân tộc", item.ethnicity],
        ["Tôn giáo", item.religion],
        ["CCCD/CMND", item.cccd],
        ["Ngày cấp", fmtDate(item.cccdIssuedDate)],
        ["Nơi cấp", item.cccdIssuedPlace],
        ["Số điện thoại", item.phone],
        ["Email", item.email],
        ["Địa chỉ", item.address],
        ["Trình độ văn hóa", item.education],
        ["Trình độ chuyên môn", item.training],
        ["Lý luận chính trị", item.politicalTheory],
        ["Trình độ tin học", item.itLevel],
        ["Ngoại ngữ", item.language],
        ["Tình trạng hôn nhân", item.maritalStatus],
        ["Nghề nghiệp hiện nay", item.occupation],
      ]),
      { text: "Quê quán & thường trú", style: "h2" },
      twoCol([
        ["Quê quán (Tỉnh/thành)", item.hometownProvince],
        ["Quê quán (Xã/phường)", item.hometownWard],
        ["Thường trú (Tỉnh/thành)", item.residenceProvince],
        ["Thường trú (Xã/phường)", item.residenceWard],
      ]),
      { text: "Đoàn — Đảng", style: "h2" },
      twoCol([
        ["Mã định danh đoàn viên", item.memberCode],
        ["Thời gian vào Đoàn", fmtDate(item.unionJoinDate)],
        ["Nơi vào Đoàn", item.unionJoinPlace],
        ["Nơi cấp thẻ", item.cardIssuePlace],
        ["Thời gian vào Đảng", fmtDate(item.partyJoinDate)],
        ["Chức vụ Đảng", item.partyPosition],
        ["Hiệp hội", item.association],
      ]),
      { text: "Nhiệm kỳ", style: "h2" },
      twoCol([
        ["Bắt đầu nhiệm kỳ", fmtDate(item.termStart)],
        ["Kết thúc nhiệm kỳ", fmtDate(item.termEnd)],
        ["Nhiệm kỳ", item.termLabel],
      ]),
      { text: `Xuất lúc: ${new Date().toLocaleString("vi-VN")}`, style: "muted", margin: [0, 16, 0, 0] },
    ],
    styles: {
      h1: { fontSize: 15, bold: true },
      h2: { fontSize: 11, bold: true, color: "#2260CF", margin: [0, 10, 0, 4] },
      muted: { fontSize: 9, color: "#666666" },
      label: { fontSize: 9, color: "#666666", margin: [0, 2, 8, 2] },
      value: { fontSize: 10, margin: [0, 2, 0, 2] },
    },
  });
}

/** Xuất PDF hồ sơ một Bí thư (mục 5.3 — export từ trang xem chi tiết, dành cho cán bộ cấp trên). */
export async function exportSecretaryPdf(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const scope = await scopeOf(req);
  const item = await prisma.secretary.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
    include: listInclude,
  });
  if (!item) return res.status(404).json({ message: "Không tìm thấy Bí thư" });

  const buffer = await buildSecretaryPdf(item);
  await audit(req, "EXPORT", "Secretary", id, { fullName: item.fullName, format: "pdf" });

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="ho-so-${id}-${stamp}.pdf"`);
  res.send(buffer);
}

/** Hồ sơ của chính mình — dành cho tài khoản vai trò SECRETARY (chỉ xem, không sửa). */
async function findMySecretary(req: Request) {
  if (req.auth!.role !== "SECRETARY") return null;
  return prisma.secretary.findFirst({
    where: { userId: req.auth!.sub, deletedAt: null },
    include: listInclude,
  });
}

export async function getMySecretary(req: Request, res: Response) {
  const item = await findMySecretary(req);
  if (!item) return res.status(404).json({ message: "Không tìm thấy hồ sơ của bạn" });

  const memberCount = await prisma.member.count({ where: { unitId: item.unitId, deletedAt: null } });
  await audit(req, "VIEW", "Secretary", item.id, { self: true });
  res.json({ item: { ...item, memberCount } });
}

export async function exportMySecretaryPdf(req: Request, res: Response) {
  const item = await findMySecretary(req);
  if (!item) return res.status(404).json({ message: "Không tìm thấy hồ sơ của bạn" });

  const buffer = await buildSecretaryPdf(item);
  await audit(req, "EXPORT", "Secretary", item.id, { fullName: item.fullName, format: "pdf", self: true });

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="ho-so-cua-toi-${stamp}.pdf"`);
  res.send(buffer);
}
