import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { audit } from "../lib/http";
import { inScope, narrowUnits, scopeOf, unitWithDescendants } from "./units.controller";

/**
 * Quản lý công văn đến (chức năng "Nhận công văn").
 * Cùng khuôn mẫu với secretaries.controller.ts: validate bằng Zod, lọc theo phạm vi địa bàn
 * (scopeOf/inScope), xóa mềm, ghi nhật ký hoạt động.
 */

const OUT_OF_SCOPE = "Bạn không có quyền thao tác trên đơn vị này";

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

const optText = z
  .string()
  .trim()
  .max(1000, "Tối đa 1000 ký tự")
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const docSchema = z.object({
  number: z.string({ required_error: "Vui lòng nhập số công văn" }).trim().min(1, "Vui lòng nhập số công văn").max(100),
  summary: z.string({ required_error: "Vui lòng nhập trích yếu" }).trim().min(1, "Vui lòng nhập trích yếu").max(2000),
  sender: z.string({ required_error: "Vui lòng nhập nơi gửi" }).trim().min(1, "Vui lòng nhập nơi gửi").max(255),
  issuedDate: dateStr("ngày ban hành"),
  receivedDate: dateStr("ngày nhận"),
  type: z.enum(["CHI_DAO", "THONG_BAO", "MOI_HOP", "KHAC"]).default("KHAC"),
  status: z.enum(["CHUA_XU_LY", "DANG_XU_LY", "DA_XU_LY"]).default("CHUA_XU_LY"),
  deadline: optDate("hạn xử lý"),
  assignedTo: optText,
  note: optText,
  unitId: z.coerce.number({ invalid_type_error: "Vui lòng chọn đơn vị phụ trách" }).int().positive("Vui lòng chọn đơn vị phụ trách"),
});

function sendValidationError(res: Response, error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!errors[key]) errors[key] = issue.message;
  }
  return res.status(400).json({ message: Object.values(errors)[0] ?? "Dữ liệu không hợp lệ", errors });
}

const toData = (v: z.infer<typeof docSchema>) => ({
  number: v.number,
  summary: v.summary,
  sender: v.sender,
  issuedDate: new Date(v.issuedDate),
  receivedDate: new Date(v.receivedDate),
  type: v.type,
  status: v.status,
  deadline: v.deadline ? new Date(v.deadline) : null,
  assignedTo: v.assignedTo,
  note: v.note,
  unitId: v.unitId,
});

const listInclude = {
  unit: { select: { id: true, name: true, level: true, parentId: true } },
  createdBy: { select: { id: true, username: true, fullName: true } },
  confirmedBy: { select: { id: true, username: true, fullName: true } },
  _count: { select: { forwards: true } },
} satisfies Prisma.IncomingDocumentInclude;

const detailInclude = {
  ...listInclude,
  forwards: {
    orderBy: { createdAt: "asc" },
    include: {
      fromUnit: { select: { id: true, name: true } },
      toUnit: { select: { id: true, name: true } },
      forwardedBy: { select: { id: true, username: true, fullName: true } },
    },
  },
} satisfies Prisma.IncomingDocumentInclude;

const listQuery = z.object({
  number: z.string().trim().optional(),
  status: z.enum(["CHUA_XU_LY", "DANG_XU_LY", "DA_XU_LY"]).optional(),
  type: z.enum(["CHI_DAO", "THONG_BAO", "MOI_HOP", "KHAC"]).optional(),
  unitId: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

async function buildWhere(req: Request, q: z.infer<typeof listQuery>): Promise<Prisma.IncomingDocumentWhereInput> {
  const where: Prisma.IncomingDocumentWhereInput = { deletedAt: null };
  if (q.number) where.number = { contains: q.number, mode: "insensitive" };
  if (q.status) where.status = q.status;
  if (q.type) where.type = q.type;
  const scope = await scopeOf(req);
  const unitIds = narrowUnits(scope, q.unitId ? await unitWithDescendants(q.unitId) : undefined);
  if (unitIds) where.unitId = { in: unitIds };
  if (q.from || q.to) {
    where.receivedDate = {
      ...(q.from ? { gte: new Date(q.from) } : {}),
      ...(q.to ? { lte: new Date(q.to) } : {}),
    };
  }
  return where;
}

export async function listDocuments(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const q = parsed.data;
  const where = await buildWhere(req, q);

  const [total, items] = await Promise.all([
    prisma.incomingDocument.count({ where }),
    prisma.incomingDocument.findMany({
      where,
      include: listInclude,
      orderBy: [{ receivedDate: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  await audit(req, "SEARCH", "IncomingDocument", undefined, { filters: req.query, total });
  res.json({ items, total, page: q.page, pageSize: q.pageSize });
}

export async function getDocument(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const scope = await scopeOf(req);
  const item = await prisma.incomingDocument.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
    include: detailInclude,
  });
  if (!item) return res.status(404).json({ message: "Không tìm thấy công văn" });

  await audit(req, "VIEW", "IncomingDocument", id);
  res.json({ item });
}

export async function createDocument(req: Request, res: Response) {
  const parsed = docSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const v = parsed.data;

  const unit = await prisma.unit.findUnique({ where: { id: v.unitId } });
  if (!unit) return res.status(400).json({ message: "Đơn vị không tồn tại", errors: { unitId: "Đơn vị không tồn tại" } });
  if (!inScope(await scopeOf(req), v.unitId)) {
    return res.status(403).json({ message: OUT_OF_SCOPE, errors: { unitId: OUT_OF_SCOPE } });
  }

  const item = await prisma.incomingDocument.create({
    data: { ...toData(v), createdById: req.auth!.sub },
    include: listInclude,
  });
  await audit(req, "CREATE", "IncomingDocument", item.id, { number: item.number, summary: item.summary });
  res.status(201).json({ item, message: "Thêm mới công văn thành công" });
}

export async function updateDocument(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const parsed = docSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const v = parsed.data;

  const scope = await scopeOf(req);
  const current = await prisma.incomingDocument.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });
  if (!current) return res.status(404).json({ message: "Không tìm thấy công văn" });
  if (current.confirmedAt) {
    return res.status(409).json({ message: "Công văn đã được xác nhận thực hiện, không thể sửa" });
  }
  if (!inScope(scope, v.unitId)) {
    return res.status(403).json({ message: OUT_OF_SCOPE, errors: { unitId: OUT_OF_SCOPE } });
  }

  const item = await prisma.incomingDocument.update({ where: { id }, data: toData(v), include: listInclude });
  await audit(req, "UPDATE", "IncomingDocument", id, { number: item.number });
  res.json({ item, message: "Cập nhật công văn thành công" });
}

export async function deleteDocument(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const scope = await scopeOf(req);
  const current = await prisma.incomingDocument.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });
  if (!current) return res.status(404).json({ message: "Không tìm thấy công văn" });

  await prisma.incomingDocument.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(req, "DELETE", "IncomingDocument", id, { number: current.number });
  res.json({ message: "Xóa công văn thành công" });
}

const forwardSchema = z.object({
  toUnitId: z.coerce.number({ invalid_type_error: "Vui lòng chọn đơn vị nhận" }).int().positive("Vui lòng chọn đơn vị nhận"),
  note: optText,
});

/**
 * Chuyển tiếp: đổi đơn vị phụ trách sang đơn vị con trong phạm vi của người chuyển,
 * đồng thời lưu 1 dòng lịch sử (DocumentForward) — không tạo bản ghi công văn mới.
 */
export async function forwardDocument(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const parsed = forwardSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const v = parsed.data;

  const scope = await scopeOf(req);
  const current = await prisma.incomingDocument.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });
  if (!current) return res.status(404).json({ message: "Không tìm thấy công văn" });
  if (current.confirmedAt) {
    return res.status(409).json({ message: "Công văn đã được xác nhận thực hiện, không thể chuyển tiếp" });
  }
  if (v.toUnitId === current.unitId) {
    return res.status(400).json({ message: "Đơn vị nhận trùng với đơn vị đang phụ trách", errors: { toUnitId: "Đơn vị nhận trùng với đơn vị đang phụ trách" } });
  }
  const toUnit = await prisma.unit.findUnique({ where: { id: v.toUnitId } });
  if (!toUnit) return res.status(400).json({ message: "Đơn vị không tồn tại", errors: { toUnitId: "Đơn vị không tồn tại" } });
  if (!inScope(scope, v.toUnitId)) {
    return res.status(403).json({ message: OUT_OF_SCOPE, errors: { toUnitId: OUT_OF_SCOPE } });
  }

  const item = await prisma.$transaction(async (tx) => {
    await tx.documentForward.create({
      data: { documentId: id, fromUnitId: current.unitId, toUnitId: v.toUnitId, forwardedById: req.auth!.sub, note: v.note },
    });
    return tx.incomingDocument.update({ where: { id }, data: { unitId: v.toUnitId }, include: detailInclude });
  });

  await audit(req, "UPDATE", "IncomingDocument", id, { forward: true, fromUnitId: current.unitId, toUnitId: v.toUnitId });
  res.json({ item, message: `Đã chuyển tiếp công văn sang ${toUnit.name}` });
}

const confirmSchema = z.object({ resultNote: optText });

/** Xác nhận đã thực hiện: chỉ đơn vị đang phụ trách (unitId hiện tại) mới xác nhận được; ADMIN xác nhận được mọi nơi. */
export async function confirmDocument(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);

  const scope = await scopeOf(req);
  const current = await prisma.incomingDocument.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });
  if (!current) return res.status(404).json({ message: "Không tìm thấy công văn" });
  if (req.auth!.role !== "ADMIN" && current.unitId !== req.auth!.unitId) {
    return res.status(403).json({ message: "Chỉ đơn vị đang phụ trách công văn này mới xác nhận được" });
  }
  if (current.confirmedAt) {
    return res.status(409).json({ message: "Công văn này đã được xác nhận trước đó" });
  }

  const item = await prisma.incomingDocument.update({
    where: { id },
    data: { status: "DA_XU_LY", confirmedAt: new Date(), confirmedById: req.auth!.sub, resultNote: parsed.data.resultNote },
    include: detailInclude,
  });
  await audit(req, "UPDATE", "IncomingDocument", id, { confirm: true });
  res.json({ item, message: "Đã xác nhận thực hiện công văn" });
}
