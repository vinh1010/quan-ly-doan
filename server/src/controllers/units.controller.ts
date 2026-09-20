import type { Request, Response } from "express";
import type { UnitLevel } from "@prisma/client";
import { prisma } from "../prisma";

const LEVELS: UnitLevel[] = ["TINH", "HUYEN", "XA_PHUONG", "CO_SO", "CHI_DOAN"];

/**
 * Phạm vi địa bàn của người đang đăng nhập: id đơn vị của họ và mọi đơn vị con cháu.
 * - ADMIN: null = không giới hạn.
 * - Cán bộ cấp trên: đơn vị của mình và các đơn vị trực thuộc; chưa gán đơn vị thì không thấy gì.
 */
export async function scopeOf(req: Request): Promise<number[] | null> {
  if (req.auth!.role === "ADMIN") return null;
  const unitId = req.auth!.unitId;
  return unitId ? unitWithDescendants(unitId) : [];
}

export const inScope = (scope: number[] | null, unitId: number) => scope === null || scope.includes(unitId);

/**
 * Thu hẹp bộ lọc đơn vị người dùng chọn về trong phạm vi được phép.
 * Trả về undefined nghĩa là không cần lọc theo đơn vị (ADMIN, không chọn đơn vị nào).
 */
export function narrowUnits(scope: number[] | null, requested?: number[]): number[] | undefined {
  if (scope === null) return requested;
  return requested ? requested.filter((id) => scope.includes(id)) : scope;
}

export async function listUnits(req: Request, res: Response) {
  const level = LEVELS.find((l) => l === req.query.level);
  const scope = await scopeOf(req);
  const units = await prisma.unit.findMany({
    where: { isActive: true, ...(level ? { level } : {}), ...(scope ? { id: { in: scope } } : {}) },
    select: { id: true, code: true, name: true, level: true, parentId: true },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
  res.json({ items: units });
}

/** Trả về id của đơn vị và mọi đơn vị con cháu (dùng cho lọc theo khu vực). */
export async function unitWithDescendants(unitId: number): Promise<number[]> {
  const all = await prisma.unit.findMany({ select: { id: true, parentId: true } });
  const ids = [unitId];
  for (let i = 0; i < ids.length; i++) {
    for (const u of all) if (u.parentId === ids[i]) ids.push(u.id);
  }
  return ids;
}
