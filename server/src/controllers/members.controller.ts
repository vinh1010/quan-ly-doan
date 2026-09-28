import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { audit } from "../lib/http";
import { inScope, narrowUnits, scopeOf, unitWithDescendants } from "./units.controller";

/**
 * Danh sách Đoàn viên (roster) — tối giản: họ tên + đơn vị, để có người mà xếp loại.
 * Cùng khuôn mẫu với documents/evaluations: SECRETARY + SUPERIOR + ADMIN đều thao tác được,
 * lọc theo phạm vi địa bàn (scopeOf/inScope).
 */

const OUT_OF_SCOPE = "Bạn không có quyền thao tác trên đơn vị này";

const memberSchema = z.object({
  fullName: z.string({ required_error: "Vui lòng nhập họ tên" }).trim().min(1, "Vui lòng nhập họ tên").max(150),
  dob: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "MOVED"]).default("ACTIVE"),
  note: z.string().trim().max(500).optional().nullable().transform((v) => (v ? v : null)),
  unitId: z.coerce.number({ invalid_type_error: "Vui lòng chọn đơn vị" }).int().positive("Vui lòng chọn đơn vị"),
});

function sendValidationError(res: Response, error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!errors[key]) errors[key] = issue.message;
  }
  return res.status(400).json({ message: Object.values(errors)[0] ?? "Dữ liệu không hợp lệ", errors });
}

const toData = (v: z.infer<typeof memberSchema>) => ({
  fullName: v.fullName,
  dob: v.dob ? new Date(v.dob) : null,
  gender: v.gender ?? null,
  status: v.status,
  note: v.note,
  unitId: v.unitId,
});

const listInclude = {
  unit: { select: { id: true, name: true, level: true } },
} satisfies Prisma.MemberInclude;

const listQuery = z.object({
  name: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MOVED"]).optional(),
  unitId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export async function listMembers(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const q = parsed.data;

  const where: Prisma.MemberWhereInput = { deletedAt: null };
  if (q.name) where.fullName = { contains: q.name, mode: "insensitive" };
  if (q.status) where.status = q.status;
  const scope = await scopeOf(req);
  const unitIds = narrowUnits(scope, q.unitId ? await unitWithDescendants(q.unitId) : undefined);
  if (unitIds) where.unitId = { in: unitIds };

  const [total, items] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      include: listInclude,
      orderBy: [{ fullName: "asc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  await audit(req, "SEARCH", "Member", undefined, { filters: req.query, total });
  res.json({ items, total, page: q.page, pageSize: q.pageSize });
}

export async function createMember(req: Request, res: Response) {
  const parsed = memberSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const v = parsed.data;

  const unit = await prisma.unit.findUnique({ where: { id: v.unitId } });
  if (!unit) return res.status(400).json({ message: "Đơn vị không tồn tại", errors: { unitId: "Đơn vị không tồn tại" } });
  if (!inScope(await scopeOf(req), v.unitId)) {
    return res.status(403).json({ message: OUT_OF_SCOPE, errors: { unitId: OUT_OF_SCOPE } });
  }

  const item = await prisma.member.create({ data: { ...toData(v), createdById: req.auth!.sub }, include: listInclude });
  await audit(req, "CREATE", "Member", item.id, { fullName: item.fullName });
  res.status(201).json({ item, message: "Thêm mới Đoàn viên thành công" });
}

export async function updateMember(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const parsed = memberSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const v = parsed.data;

  const scope = await scopeOf(req);
  const current = await prisma.member.findFirst({ where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) } });
  if (!current) return res.status(404).json({ message: "Không tìm thấy Đoàn viên" });
  if (!inScope(scope, v.unitId)) {
    return res.status(403).json({ message: OUT_OF_SCOPE, errors: { unitId: OUT_OF_SCOPE } });
  }

  const item = await prisma.member.update({ where: { id }, data: toData(v), include: listInclude });
  await audit(req, "UPDATE", "Member", id, { fullName: item.fullName });
  res.json({ item, message: "Cập nhật Đoàn viên thành công" });
}

export async function deleteMember(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const scope = await scopeOf(req);
  const current = await prisma.member.findFirst({ where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) } });
  if (!current) return res.status(404).json({ message: "Không tìm thấy Đoàn viên" });

  await prisma.member.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(req, "DELETE", "Member", id, { fullName: current.fullName });
  res.json({ message: "Xóa Đoàn viên thành công" });
}
