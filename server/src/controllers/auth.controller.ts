import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../prisma";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

const loginSchema = z.object({
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  role: z.enum(["SUPERIOR", "SECRETARY"]).optional(),
});

function publicUser(u: {
  id: number;
  username: string;
  role: string;
  fullName: string | null;
  unit?: { id: number; name: string } | null;
}) {
  return { id: u.id, username: u.username, role: u.role, fullName: u.fullName, unit: u.unit ?? null };
}

function signToken(user: { id: number; username: string; role: string }) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "8h") as jwt.SignOptions["expiresIn"],
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }
  const { username, password, role } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { username },
    include: { unit: { select: { id: true, name: true } } },
  });
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return res.status(429).json({ message: `Nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutes} phút` });
  }
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok || (role && user.role !== role)) {
    if (user) {
      // sai mật khẩu quá MAX_FAILED_LOGINS lần liên tiếp thì khóa tạm LOCK_MINUTES phút
      const failed = user.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
        },
      });
    }
    return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
  }
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ message: "Tài khoản đã bị tạm khóa" });
  }

  const token = signToken(user);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "LOGIN", target: user.username },
  });

  res.json({ token, user: publicUser(user) });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.sub },
    include: { unit: { select: { id: true, name: true } } },
  });
  if (!user || user.status !== "ACTIVE") {
    return res.status(401).json({ message: "Tài khoản không còn hiệu lực" });
  }
  res.json({ user: publicUser(user) });
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: "Vui lòng nhập mật khẩu hiện tại" }).min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string({ required_error: "Vui lòng nhập mật khẩu mới" })
      .min(6, "Mật khẩu tối thiểu 6 ký tự")
      .regex(/[A-Za-z]/, "Mật khẩu phải có chữ")
      .regex(/\d/, "Mật khẩu phải có số"),
    confirmPassword: z.string({ required_error: "Vui lòng xác nhận mật khẩu mới" }),
  })
  .superRefine((v, ctx) => {
    if (v.newPassword !== v.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp" });
    }
    if (v.newPassword === v.currentPassword) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Mật khẩu mới phải khác mật khẩu hiện tại" });
    }
  });

/** Đổi mật khẩu của chính người đang đăng nhập (chức năng 1.3). */
export async function changePassword(req: Request, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
    return res.status(400).json({ message: parsed.error.issues[0].message, errors });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
  if (!user || user.status !== "ACTIVE") {
    return res.status(401).json({ message: "Tài khoản không còn hiệu lực" });
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    const message = "Mật khẩu hiện tại không đúng";
    return res.status(400).json({ message, errors: { currentPassword: message } });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10), passwordChangedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "CHANGE_PASSWORD", target: user.username, ip: req.ip },
  });
  // các phiên cũ (kể cả trên thiết bị khác) bị thu hồi; trả token mới để phiên hiện tại tiếp tục dùng
  res.json({ message: "Đổi mật khẩu thành công", token: signToken(user) });
}

export async function logout(req: Request, res: Response) {
  await prisma.auditLog.create({
    data: { userId: req.auth!.sub, action: "LOGOUT", target: req.auth!.username },
  });
  res.json({ message: "Đã đăng xuất" });
}
