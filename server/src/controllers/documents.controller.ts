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
  unit: { select: { id: true, name: true, level: true } },
  createdBy: { select: { id: true, username: true, fullName: true } },
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
    include: listInclude,
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
