import type { Request, Response } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { prisma } from "../prisma";
import { audit } from "../lib/http";
import { unitWithDescendants } from "./units.controller";

const query = z.object({ unitId: z.coerce.number().int().positive().optional() });

const POSITION_LABEL = { BI_THU: "Bí thư Đoàn cơ sở", PHO_BI_THU: "Phó Bí thư" } as const;
const STATUS_LABEL = { ACTIVE: "Đang hoạt động", ENDED: "Đã kết thúc" } as const;
const GENDER_LABEL = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" } as const;

export interface AreaRow {
  unitId: number;
  name: string;
  parentName: string | null;
  secretaries: number;
  deputies: number;
  members: number;
}

/**
 * Thống kê theo khu vực (xã/phường): số Bí thư, Phó Bí thư đang hoạt động
 * và số Đoàn viên quản lý (tổng của các đơn vị cơ sở trực thuộc).
 * Nếu chọn một đơn vị thì chỉ thống kê các khu vực nằm trong đơn vị đó.
 */
async function buildAreaReport(unitId?: number): Promise<AreaRow[]> {
  const scope = unitId ? await unitWithDescendants(unitId) : undefined;
  const areas = await prisma.unit.findMany({
    where: { level: "XA_PHUONG", isActive: true, ...(scope ? { id: { in: scope } } : {}) },
    select: { id: true, name: true, parent: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const [units, secretaries] = await Promise.all([
    prisma.unit.findMany({ select: { id: true, parentId: true, memberCount: true } }),
    prisma.secretary.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { unitId: true, position: true },
    }),
  ]);
  const children = new Map<number, number[]>();
  for (const u of units) {
    if (u.parentId != null) children.set(u.parentId, [...(children.get(u.parentId) ?? []), u.id]);
  }
  const memberOf = new Map(units.map((u) => [u.id, u.memberCount]));

  return areas.map((a) => {
    const ids = new Set([a.id]);
    for (const id of ids) for (const c of children.get(id) ?? []) ids.add(c);
    let members = 0;
    for (const id of ids) members += memberOf.get(id) ?? 0;
    const inArea = secretaries.filter((s) => ids.has(s.unitId));
    return {
      unitId: a.id,
      name: a.name,
      parentName: a.parent?.name ?? null,
      secretaries: inArea.filter((s) => s.position === "BI_THU").length,
      deputies: inArea.filter((s) => s.position === "PHO_BI_THU").length,
      members,
    };
  });
}

export async function reportByArea(req: Request, res: Response) {
  const parsed = query.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Đơn vị không hợp lệ" });
  const items = await buildAreaReport(parsed.data.unitId);
  const total = items.reduce(
    (t, r) => ({ secretaries: t.secretaries + r.secretaries, deputies: t.deputies + r.deputies, members: t.members + r.members }),
    { secretaries: 0, deputies: 0, members: 0 },
  );
  await audit(req, "VIEW", "Report", undefined, { unitId: parsed.data.unitId ?? null });
  res.json({ items, total });
}

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2260CF" } };

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.eachCell((c) => (c.fill = HEADER_FILL));
}

/** Xuất Excel gồm 2 sheet: thống kê theo khu vực và danh sách Bí thư/Phó Bí thư. */
export async function exportReport(req: Request, res: Response) {
  const parsed = query.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Đơn vị không hợp lệ" });
  const { unitId } = parsed.data;

  const rows = await buildAreaReport(unitId);
  const scope = unitId ? await unitWithDescendants(unitId) : undefined;
  const list = await prisma.secretary.findMany({
    where: { deletedAt: null, ...(scope ? { unitId: { in: scope } } : {}) },
    include: { unit: { select: { name: true } } },
    orderBy: [{ unit: { name: "asc" } }, { position: "asc" }, { fullName: "asc" }],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Hệ thống Quản lý Công tác Đoàn";
  wb.created = new Date();

  const ws1 = wb.addWorksheet("Thống kê theo khu vực");
  ws1.columns = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Khu vực (xã/phường)", key: "name", width: 34 },
    { header: "Thuộc", key: "parent", width: 30 },
    { header: "Số Bí thư", key: "secretaries", width: 12 },
    { header: "Số Phó Bí thư", key: "deputies", width: 14 },
    { header: "Số Đoàn viên quản lý", key: "members", width: 22 },
  ];
  styleHeader(ws1.getRow(1));
  rows.forEach((r, i) =>
    ws1.addRow({ stt: i + 1, name: r.name, parent: r.parentName ?? "", secretaries: r.secretaries, deputies: r.deputies, members: r.members }),
  );
  const sum = (k: "secretaries" | "deputies" | "members") => rows.reduce((t, r) => t + r[k], 0);
  const totalRow = ws1.addRow({ name: "Tổng cộng", secretaries: sum("secretaries"), deputies: sum("deputies"), members: sum("members") });
  totalRow.font = { bold: true };

  const ws2 = wb.addWorksheet("Danh sách cán bộ");
  ws2.columns = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Họ và tên", key: "fullName", width: 26 },
    { header: "Chức vụ", key: "position", width: 20 },
    { header: "Đơn vị", key: "unit", width: 32 },
    { header: "Giới tính", key: "gender", width: 10 },
    { header: "Ngày sinh", key: "dob", width: 13 },
    { header: "Số điện thoại", key: "phone", width: 15 },
    { header: "Email", key: "email", width: 28 },
    { header: "CCCD/CMND", key: "cccd", width: 16 },
    { header: "Bắt đầu nhiệm kỳ", key: "termStart", width: 17 },
    { header: "Kết thúc nhiệm kỳ", key: "termEnd", width: 17 },
    { header: "Trạng thái", key: "status", width: 16 },
  ];
  styleHeader(ws2.getRow(1));
  list.forEach((s, i) =>
    ws2.addRow({
      stt: i + 1,
      fullName: s.fullName,
      position: POSITION_LABEL[s.position],
      unit: s.unit.name,
      gender: GENDER_LABEL[s.gender],
      dob: s.dob,
      phone: s.phone,
      email: s.email ?? "",
      cccd: s.cccd,
      termStart: s.termStart,
      termEnd: s.termEnd ?? "",
      status: STATUS_LABEL[s.status],
    }),
  );
  for (const key of ["dob", "termStart", "termEnd"]) ws2.getColumn(key).numFmt = "dd/mm/yyyy";
  // định dạng văn bản để Excel không cắt số 0 đầu của CCCD và SĐT
  for (const key of ["cccd", "phone"]) ws2.getColumn(key).numFmt = "@";
  for (const ws of [ws1, ws2]) ws.views = [{ state: "frozen", ySplit: 1 }];

  await audit(req, "EXPORT", "Report", undefined, { unitId: unitId ?? null, areas: rows.length, secretaries: list.length });

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="bao-cao-bi-thu-${stamp}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}
