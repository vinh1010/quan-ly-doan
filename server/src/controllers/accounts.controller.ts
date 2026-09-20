import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { audit } from "../lib/http";
import { unitWithDescendants } from "./units.controller";

const listQuery = z.object({
  search: z.string().trim().optional(),
  unitId: z.coerce.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "LOCKED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const statusBody = z.object({ status: z.enum(["ACTIVE", "LOCKED"], { errorMap: () => ({ message: "Trạng thái không hợp lệ" }) }) });

const accountSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  unit: { select: { id: true, name: true } },
  secretary: { select: { id: true, position: true, status: true, deletedAt: true } },
} satisfies Prisma.UserSelect;

/** Danh sách tài khoản Bí thư đã cấp (mục 4.3 trong giao diện). */
export async function listAccounts(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const q = parsed.data;

  const where: Prisma.UserWhereInput = { role: "SECRETARY" };
  if (q.status) where.status = q.status;
  if (q.unitId) where.unitId = { in: await unitWithDescendants(q.unitId) };
  if (q.search) {
    where.OR = [
      { username: { contains: q.search, mode: "insensitive" } },
      { fullName: { contains: q.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: accountSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  res.json({ items, total, page: q.page, pageSize: q.pageSize });
}

/** Kích hoạt / tạm khóa tài khoản Bí thư. */
export async function setAccountStatus(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const parsed = statusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { status } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { id, role: "SECRETARY" },
    select: { id: true, username: true, status: true, secretary: { select: { deletedAt: true } } },
  });
  if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
  if (user.secretary?.deletedAt && status === "ACTIVE") {
    return res.status(409).json({ message: "Hồ sơ Bí thư đã bị xóa, không thể kích hoạt lại tài khoản" });
  }
  if (user.status === status) {
    return res.json({ message: "Trạng thái không thay đổi", status });
  }

  await prisma.user.update({
    where: { id },
    data: { status, ...(status === "ACTIVE" ? { failedLoginCount: 0, lockedUntil: null } : {}) },
  });
  await audit(req, status === "LOCKED" ? "LOCK_ACCOUNT" : "UNLOCK_ACCOUNT", "User", id, { username: user.username });
  res.json({
    message: status === "LOCKED" ? "Đã tạm khóa tài khoản" : "Đã kích hoạt tài khoản",
    status,
  });
}
