import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { audit } from "../lib/http";
import { inScope, narrowUnits, scopeOf, unitWithDescendants } from "./units.controller";

/**
 * Đánh giá, xếp loại Đoàn viên — theo TỪNG Đoàn viên (không phải số liệu tổng hợp theo khu vực).
 * Một "đợt đánh giá" (MemberEvaluation) gắn với 1 đơn vị (thôn) + 1 năm, bên trong chứa xếp loại
 * của từng người (MemberGrade). Bí thư cấp thôn tự nhập rồi "chuyển lên" cấp trên (thôn -> xã ->
 * huyện): mỗi lần chuyển chỉ đổi đơn vị đang giữ đợt, toàn bộ xếp loại bên trong đi theo — không
 * cần chọn đơn vị vì luôn là 1 chặng duy nhất. Khác công văn ở chỗ không có bước "xác nhận".
 */

const OUT_OF_SCOPE = "Bạn không có quyền thao tác trên đơn vị này";
const GRADES = ["XUAT_SAC", "TOT", "KHA", "TRUNG_BINH", "YEU"] as const;

const evalSchema = z.object({
  year: z.coerce.number({ invalid_type_error: "Vui lòng nhập năm đánh giá" }).int().min(2000, "Năm không hợp lệ").max(2100, "Năm không hợp lệ"),
  note: z.string().trim().max(1000, "Tối đa 1000 ký tự").optional().nullable().transform((v) => (v ? v : null)),
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

const listInclude = {
  unit: { select: { id: true, name: true, level: true, parentId: true } },
  createdBy: { select: { id: true, username: true, fullName: true } },
  _count: { select: { forwards: true, grades: true } },
} satisfies Prisma.MemberEvaluationInclude;

const detailInclude = {
  ...listInclude,
  grades: {
    include: { member: { select: { id: true, fullName: true, unitId: true } } },
    orderBy: { member: { fullName: "asc" } },
  },
  forwards: {
    orderBy: { createdAt: "asc" },
    include: {
      fromUnit: { select: { id: true, name: true } },
      toUnit: { select: { id: true, name: true } },
      forwardedBy: { select: { id: true, username: true, fullName: true } },
    },
  },
} satisfies Prisma.MemberEvaluationInclude;

const listQuery = z.object({
  year: z.coerce.number().int().optional(),
  unitId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export async function listEvaluations(req: Request, res: Response) {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const q = parsed.data;

  const where: Prisma.MemberEvaluationWhereInput = { deletedAt: null };
  if (q.year) where.year = q.year;
  const scope = await scopeOf(req);
  const unitIds = narrowUnits(scope, q.unitId ? await unitWithDescendants(q.unitId) : undefined);
  if (unitIds) where.unitId = { in: unitIds };

  const [total, items] = await Promise.all([
    prisma.memberEvaluation.count({ where }),
    prisma.memberEvaluation.findMany({
      where,
      include: listInclude,
      orderBy: [{ year: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  await audit(req, "SEARCH", "MemberEvaluation", undefined, { filters: req.query, total });
  res.json({ items, total, page: q.page, pageSize: q.pageSize });
}

/**
 * Đợt đánh giá do chính người đang đăng nhập tạo, không giới hạn theo phạm vi địa bàn hiện tại —
 * để Bí thư cấp thôn vẫn thấy đợt mình tạo ngay cả sau khi đã chuyển lên cấp trên (lúc đó
 * unitId không còn trong phạm vi của họ nữa nên listEvaluations không trả về). Dùng cho Trang chủ.
 */
export async function listMyEvaluations(req: Request, res: Response) {
  const parsed = z.object({ year: z.coerce.number().int().optional() }).safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error);

  const items = await prisma.memberEvaluation.findMany({
    where: { deletedAt: null, createdById: req.auth!.sub, ...(parsed.data.year ? { year: parsed.data.year } : {}) },
    include: listInclude,
    orderBy: [{ year: "desc" }, { id: "desc" }],
    take: 20,
  });
  res.json({ items });
}

export async function getEvaluation(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const scope = await scopeOf(req);
  const item = await prisma.memberEvaluation.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
    include: detailInclude,
  });
  if (!item) return res.status(404).json({ message: "Không tìm thấy đợt đánh giá" });

  await audit(req, "VIEW", "MemberEvaluation", id);
  res.json({ item });
}

export async function createEvaluation(req: Request, res: Response) {
  const parsed = evalSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const v = parsed.data;

  const unit = await prisma.unit.findUnique({ where: { id: v.unitId } });
  if (!unit) return res.status(400).json({ message: "Đơn vị không tồn tại", errors: { unitId: "Đơn vị không tồn tại" } });
  if (!inScope(await scopeOf(req), v.unitId)) {
    return res.status(403).json({ message: OUT_OF_SCOPE, errors: { unitId: OUT_OF_SCOPE } });
  }

  const item = await prisma.memberEvaluation.create({
    data: { year: v.year, note: v.note, unitId: v.unitId, createdById: req.auth!.sub },
    include: listInclude,
  });
  await audit(req, "CREATE", "MemberEvaluation", item.id, { year: item.year, unitId: item.unitId });
  res.status(201).json({ item, message: "Tạo đợt đánh giá thành công" });
}

export async function updateEvaluation(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const parsed = z
    .object({ year: z.coerce.number().int().min(2000).max(2100), note: z.string().trim().max(1000).optional().nullable().transform((v) => (v ? v : null)) })
    .safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);

  const scope = await scopeOf(req);
  const current = await prisma.memberEvaluation.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });
  if (!current) return res.status(404).json({ message: "Không tìm thấy đợt đánh giá" });

  const item = await prisma.memberEvaluation.update({ where: { id }, data: parsed.data, include: listInclude });
  await audit(req, "UPDATE", "MemberEvaluation", id, { year: item.year });
  res.json({ item, message: "Cập nhật đợt đánh giá thành công" });
}

export async function deleteEvaluation(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const scope = await scopeOf(req);
  const current = await prisma.memberEvaluation.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });
  if (!current) return res.status(404).json({ message: "Không tìm thấy đợt đánh giá" });

  await prisma.memberEvaluation.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(req, "DELETE", "MemberEvaluation", id, { year: current.year });
  res.json({ message: "Xóa đợt đánh giá thành công" });
}

const gradesSchema = z.object({
  grades: z
    .array(
      z.object({
        memberId: z.coerce.number().int().positive(),
        grade: z.enum(GRADES, { errorMap: () => ({ message: "Xếp loại không hợp lệ" }) }),
        note: z.string().trim().max(500).optional().nullable().transform((v) => (v ? v : null)),
      }),
    )
    .min(1, "Chưa chọn Đoàn viên nào")
    .max(500, "Tối đa 500 Đoàn viên một lần lưu"),
});

/** Lưu (thêm/sửa) xếp loại của từng Đoàn viên trong 1 đợt đánh giá — lưu đè theo memberId. */
export async function setGrades(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const parsed = gradesSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const { grades } = parsed.data;

  const scope = await scopeOf(req);
  const evaluation = await prisma.memberEvaluation.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
  });
  if (!evaluation) return res.status(404).json({ message: "Không tìm thấy đợt đánh giá" });

  const memberIds = [...new Set(grades.map((g) => g.memberId))];
  const members = await prisma.member.findMany({ where: { id: { in: memberIds }, deletedAt: null } });
  if (members.length !== memberIds.length) {
    return res.status(400).json({ message: "Có Đoàn viên không tồn tại trong danh sách" });
  }
  const outOfScope = members.find((m) => !inScope(scope, m.unitId));
  if (outOfScope) {
    return res.status(403).json({ message: `${OUT_OF_SCOPE}: ${outOfScope.fullName}` });
  }

  await prisma.$transaction(
    grades.map((g) =>
      prisma.memberGrade.upsert({
        where: { evaluationId_memberId: { evaluationId: id, memberId: g.memberId } },
        create: { evaluationId: id, memberId: g.memberId, grade: g.grade, note: g.note },
        update: { grade: g.grade, note: g.note },
      }),
    ),
  );

  const item = await prisma.memberEvaluation.findUniqueOrThrow({ where: { id }, include: detailInclude });
  await audit(req, "UPDATE", "MemberEvaluation", id, { grades: grades.length });
  res.json({ item, message: `Đã lưu xếp loại cho ${grades.length} Đoàn viên` });
}

/**
 * Chuyển lên cấp trên: luôn là đơn vị CHA trực tiếp của đơn vị đang giữ (thôn -> xã -> huyện),
 * không cho chọn đơn vị khác — tránh nhảy cấp hoặc chuyển sai nhánh. Toàn bộ xếp loại bên trong
 * đợt (MemberGrade) đi theo nguyên vẹn vì chúng gắn với evaluationId, không phải unitId.
 */
export async function forwardEvaluation(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Mã không hợp lệ" });

  const noteSchema = z.object({ note: z.string().trim().max(1000).optional().nullable().transform((v) => (v ? v : null)) });
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);

  const scope = await scopeOf(req);
  const current = await prisma.memberEvaluation.findFirst({
    where: { id, deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
    include: { unit: { select: { id: true, name: true, parentId: true } } },
  });
  if (!current) return res.status(404).json({ message: "Không tìm thấy đợt đánh giá" });

  const toUnitId = current.unit.parentId;
  if (!toUnitId) {
    return res.status(400).json({ message: `${current.unit.name} không còn cấp trên để chuyển lên` });
  }
  const toUnit = await prisma.unit.findUnique({ where: { id: toUnitId } });
  if (!toUnit) return res.status(400).json({ message: "Đơn vị cấp trên không tồn tại" });

  const item = await prisma.$transaction(async (tx) => {
    await tx.evaluationForward.create({
      data: { evaluationId: id, fromUnitId: current.unitId, toUnitId, forwardedById: req.auth!.sub, note: parsed.data.note },
    });
    return tx.memberEvaluation.update({ where: { id }, data: { unitId: toUnitId }, include: detailInclude });
  });

  await audit(req, "UPDATE", "MemberEvaluation", id, { forward: true, fromUnitId: current.unitId, toUnitId });
  res.json({ item, message: `Đã chuyển lên ${toUnit.name}` });
}
