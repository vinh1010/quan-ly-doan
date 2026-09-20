import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { audit } from "../lib/http";
import { inScope, scopeOf } from "./units.controller";

/**
 * Quản lý tài khoản cán bộ cấp trên (vai trò ADMIN và SUPERIOR).
 * - ADMIN: tạo được ADMIN hoặc SUPERIOR ở bất kỳ đơn vị nào.
 * - SUPERIOR: chỉ tạo và quản lý tài khoản SUPERIOR thuộc đơn vị trong phạm vi địa bàn của mình.
 */

const passwordRule = z
  .string({ required_error: "Vui lòng nhập mật khẩu" })
  .min(6, "Mật khẩu tối thiểu 6 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu phải có chữ")
  .regex(/\d/, "Mật khẩu phải có số");

const createSchema = z
  .object({
    username: z
      .string({ required_error: "Vui lòng nhập tên đăng nhập" })
      .trim()
      .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
      .max(50)
      .regex(/^[A-Za-z0-9._-]+$/, "Chỉ gồm chữ không dấu, số, . _ -"),
    fullName: z.string({ required_error: "Vui lòng nhập họ tên" }).trim().min(1, "Vui lòng nhập họ tên").max(150),
    email: z
      .union([z.string().trim().email("Email không hợp lệ"), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v ? v : null)),
    role: z.enum(["ADMIN", "SUPERIOR"], { errorMap: () => ({ message: "Vai trò không hợp lệ" }) }).default("SUPERIOR"),
    unitId: z.coerce.number().int().positive().optional().nullable(),
    password: passwordRule,
    confirmPassword: z.string({ required_error: "Vui lòng xác nhận mật khẩu" }),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp" });
    }
    if (v.role === "SUPERIOR" && !v.unitId) {
      ctx.addIssue({ code: "custom", path: ["unitId"], message: "Vui lòng chọn đơn vị" });
    }
  });

const listQuery = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "LOCKED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const officerSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  unit: { select: { id: true, name: true, level: true } },
} satisfies Prisma.UserSelect;

function validationError(res: Response, error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[issue.path.join(".") || "_"] ??= issue.message;
  return res.status(400).json({ message: Object.values(errors)[0] ?? "Dữ liệu không hợp lệ", errors });
}

/** Điều kiện chọn các tài khoản cấp trên mà người đang đăng nhập được quản lý. */
async function manageable(req: Request): Promise<Prisma.UserWhereInput> {
  if (req.auth!.role === "ADMIN") return { role: { in: ["ADMIN", "SUPERIOR"] } };
  return { role: "SUPERIOR", unitId: { in: (await scopeOf(req)) ?? [] } };
}

export async function listOfficers(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const q = parsed.data;

  const where: Prisma.UserWhereInput = { AND: [await manageable(req)] };
  if (q.status) (where.AND as Prisma.UserWhereInput[]).push({ status: q.status });
  if (q.search) {
    (where.AND as Prisma.UserWhereInput[]).push({
      OR: [
        { username: { contains: q.search, mode: "insensitive" } },
        { fullName: { contains: q.search, mode: "insensitive" } },
      ],
    });
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: officerSelect,
      orderBy: [{ role: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  res.json({ items, total, page: q.page, pageSize: q.pageSize });
}

export async function createOfficer(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const v = parsed.data;
  const isAdmin = req.auth!.role === "ADMIN";

  if (!isAdmin && v.role !== "SUPERIOR") {
    return res.status(403).json({ message: "Bạn chỉ được tạo tài khoản cán bộ cấp trên", errors: { role: "Không có quyền" } });
  }
  if (v.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: v.unitId } });
    if (!unit) return res.status(400).json({ message: "Đơn vị không tồn tại", errors: { unitId: "Đơn vị không tồn tại" } });
    if (!inScope(await scopeOf(req), v.unitId)) {
      const message = "Bạn không có quyền tạo tài khoản cho đơn vị này";
      return res.status(403).json({ message, errors: { unitId: message } });
    }
  }

  try {
    const user = await prisma.user.create({
      data: {
        username: v.username,
        passwordHash: await bcrypt.hash(v.password, 10),
        role: v.role,
        fullName: v.fullName,
        email: v.email,
        unitId: v.role === "ADMIN" ? (v.unitId ?? null) : v.unitId!,
        passwordChangedAt: new Date(),
      },
      select: officerSelect,
    });
    await audit(req, "CREATE", "Officer", user.id, { username: user.username, role: user.role });
    res.status(201).json({ item: user, message: "Tạo tài khoản thành công" });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ message: "Tên đăng nhập đã tồn tại", errors: { username: "Tên đăng nhập đã tồn tại" } });
    }
    throw e;
  }
}

/** Tìm tài khoản cấp trên trong phạm vi được quản lý; không có quyền thì coi như không tồn tại. */
async function findManageable(req: Request, id: number) {
  return prisma.user.findFirst({ where: { AND: [{ id }, await manageable(req)] }, select: officerSelect });
}

export async function setOfficerStatus(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });
  const parsed = z.object({ status: z.enum(["ACTIVE", "LOCKED"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Trạng thái không hợp lệ" });
  const { status } = parsed.data;

  if (id === req.auth!.sub) return res.status(409).json({ message: "Không thể tự khóa tài khoản của chính mình" });
  const target = await findManageable(req, id);
  if (!target) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
  if (target.status === status) return res.json({ message: "Trạng thái không thay đổi", status });

  await prisma.user.update({
    where: { id },
    data: { status, ...(status === "ACTIVE" ? { failedLoginCount: 0, lockedUntil: null } : {}) },
  });
  await audit(req, status === "LOCKED" ? "LOCK_ACCOUNT" : "UNLOCK_ACCOUNT", "Officer", id, { username: target.username });
  res.json({ message: status === "LOCKED" ? "Đã tạm khóa tài khoản" : "Đã kích hoạt tài khoản", status });
}

/** Đặt lại mật khẩu; mọi phiên đăng nhập cũ của tài khoản đó bị thu hồi. */
export async function resetOfficerPassword(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });
  const parsed = z
    .object({ password: passwordRule, confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp" })
    .safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  // đổi mật khẩu của chính mình phải qua chức năng Đổi mật khẩu (có nhập mật khẩu hiện tại)
  if (id === req.auth!.sub) {
    return res.status(409).json({ message: "Hãy dùng chức năng Đổi mật khẩu để đổi mật khẩu của chính bạn" });
  }
  const target = await findManageable(req, id);
  if (!target) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  await audit(req, "CHANGE_PASSWORD", "Officer", id, { username: target.username, resetBy: req.auth!.username });
  res.json({ message: "Đã đặt lại mật khẩu" });
}
