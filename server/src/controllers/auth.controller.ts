import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../prisma";

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
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok || (role && user.role !== role)) {
    return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
  }
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ message: "Tài khoản đã bị tạm khóa" });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? "8h") as jwt.SignOptions["expiresIn"] },
  );
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
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

export async function logout(req: Request, res: Response) {
  await prisma.auditLog.create({
    data: { userId: req.auth!.sub, action: "LOGOUT", target: req.auth!.username },
  });
  res.json({ message: "Đã đăng xuất" });
}
