import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { prisma } from "../prisma";

export interface AuthPayload {
  sub: number;
  username: string;
  role: string;
  iat?: number; // giây, do jsonwebtoken tự thêm
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthPayload;
  }
}

/**
 * Xác thực JWT rồi đối chiếu với DB để phiên bị thu hồi ngay khi:
 * - tài khoản bị khóa hoặc bị xóa;
 * - mật khẩu đã được đổi sau thời điểm token được cấp.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as unknown as AuthPayload;
  } catch {
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true, role: true, passwordChangedAt: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ message: "Tài khoản không còn hiệu lực" });
    }
    if (user.passwordChangedAt && Math.floor(user.passwordChangedAt.getTime() / 1000) > (payload.iat ?? 0)) {
      return res.status(401).json({ message: "Mật khẩu đã thay đổi, vui lòng đăng nhập lại" });
    }
    // lấy vai trò từ DB để đổi vai trò có hiệu lực ngay, không phụ thuộc token cũ
    req.auth = { ...payload, role: user.role };
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Không có quyền thực hiện thao tác này" });
    }
    next();
  };
}
