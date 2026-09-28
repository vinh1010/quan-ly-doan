import { Router } from "express";
import {
  createSecretary,
  deleteSecretariesBulk,
  deleteSecretary,
  exportMySecretaryPdf,
  exportSecretariesXlsx,
  exportSecretaryPdf,
  getMySecretary,
  getSecretary,
  listSecretaries,
  updateSecretary,
} from "../controllers/secretaries.controller";
import { listUnits } from "../controllers/units.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/http";

export const secretaryRoutes = Router();
// Hồ sơ của chính mình (vai trò SECRETARY) — đặt trước requireRole bên dưới vì
// nhóm route còn lại chỉ dành cho SUPERIOR/ADMIN.
secretaryRoutes.get("/me", requireAuth, asyncHandler(getMySecretary));
secretaryRoutes.get("/me/export-pdf", requireAuth, asyncHandler(exportMySecretaryPdf));

secretaryRoutes.use(requireAuth, requireRole("SUPERIOR", "ADMIN"));
secretaryRoutes.get("/", asyncHandler(listSecretaries));
secretaryRoutes.post("/", asyncHandler(createSecretary));
secretaryRoutes.post("/bulk-delete", asyncHandler(deleteSecretariesBulk));
secretaryRoutes.get("/export", asyncHandler(exportSecretariesXlsx));
secretaryRoutes.get("/:id", asyncHandler(getSecretary));
secretaryRoutes.get("/:id/export-pdf", asyncHandler(exportSecretaryPdf));
secretaryRoutes.put("/:id", asyncHandler(updateSecretary));
secretaryRoutes.delete("/:id", asyncHandler(deleteSecretary));

export const unitRoutes = Router();
unitRoutes.use(requireAuth);
unitRoutes.get("/", asyncHandler(listUnits));
