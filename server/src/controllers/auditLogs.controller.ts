import type { Request, Response } from "express";
import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ");

const listQuery = z.object({
  action: z.nativeEnum(AuditAction).optional(),
  search: z.string().trim().optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Nhật ký hoạt động. ADMIN xem toàn bộ; cán bộ cấp trên chỉ xem thao tác của chính mình. */
export async function listAuditLogs(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const q = parsed.data;

  const where: Prisma.AuditLogWhereInput = {};
  if (req.auth!.role !== "ADMIN") where.userId = req.auth!.sub;
  if (q.action) where.action = q.action;
  if (q.search) where.user = { username: { contains: q.search, mode: "insensitive" } };
  if (q.from || q.to) {
    where.createdAt = {
      ...(q.from ? { gte: new Date(`${q.from}T00:00:00`) } : {}),
      ...(q.to ? { lte: new Date(`${q.to}T23:59:59.999`) } : {}),
    };
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        target: true,
        targetId: true,
        detail: true,
        ip: true,
        createdAt: true,
        user: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  res.json({ items, total, page: q.page, pageSize: q.pageSize });
}
