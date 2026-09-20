import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { audit } from "../lib/http";
import { unitWithDescendants } from "./units.controller";

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

export async function listSecretaries(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const q = parsed.data;

  const where: Prisma.SecretaryWhereInput = { deletedAt: null };
  if (q.name) where.fullName = { contains: q.name, mode: "insensitive" };
  if (q.phone) where.phone = { contains: q.phone };
  if (q.cccd) where.cccd = { contains: q.cccd };
  if (q.status) where.status = q.status;
  if (q.unitId) where.unitId = { in: await unitWithDescendants(q.unitId) };
  // nhiệm kỳ bắt đầu trong khoảng [termFrom, termTo]
  if (q.termFrom || q.termTo) {
    where.termStart = {
      ...(q.termFrom ? { gte: new Date(q.termFrom) } : {}),
      ...(q.termTo ? { lte: new Date(q.termTo) } : {}),
    };
  }

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

export async function getSecretary(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const item = await prisma.secretary.findFirst({
    where: { id, deletedAt: null },
    include: listInclude,
  });
  if (!item) return res.status(404).json({ message: "Không tìm thấy Bí thư" });

  // số đoàn viên quản lý của đơn vị (dùng cho màn xem chi tiết)
  const unit = await prisma.unit.findUnique({ where: { id: item.unitId }, select: { memberCount: true } });
  await audit(req, "VIEW", "Secretary", id);
  res.json({ item: { ...item, memberCount: unit?.memberCount ?? 0 } });
}

export async function createSecretary(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const v = parsed.data;

  const unit = await prisma.unit.findUnique({ where: { id: v.unitId } });
  if (!unit) return res.status(400).json({ message: "Đơn vị không tồn tại", errors: { unitId: "Đơn vị không tồn tại" } });

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

  const current = await prisma.secretary.findFirst({ where: { id, deletedAt: null } });
  if (!current) return res.status(404).json({ message: "Không tìm thấy Bí thư" });

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

  const current = await prisma.secretary.findFirst({ where: { id, deletedAt: null } });
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
