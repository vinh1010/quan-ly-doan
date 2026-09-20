import type { NextFunction, Request, RequestHandler, Response } from "express";
import { prisma } from "../prisma";
import type { AuditAction } from "@prisma/client";

// Express 4 không tự bắt lỗi của handler async
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function audit(
  req: Request,
  action: AuditAction,
  target: string,
  targetId?: number,
  detail?: Record<string, unknown>,
) {
  return prisma.auditLog.create({
    data: {
      userId: req.auth!.sub,
      action,
      target,
      targetId,
      detail: detail as object | undefined,
      ip: req.ip,
    },
  });
}
