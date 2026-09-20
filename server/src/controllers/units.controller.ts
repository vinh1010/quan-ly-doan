import type { Request, Response } from "express";
import type { UnitLevel } from "@prisma/client";
import { prisma } from "../prisma";

const LEVELS: UnitLevel[] = ["TINH", "HUYEN", "XA_PHUONG", "CO_SO", "CHI_DOAN"];

export async function listUnits(req: Request, res: Response) {
  const level = LEVELS.find((l) => l === req.query.level);
  const units = await prisma.unit.findMany({
    where: { isActive: true, ...(level ? { level } : {}) },
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
