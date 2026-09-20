import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  sub: number;
  username: string;
  role: string;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthPayload;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as unknown as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
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
