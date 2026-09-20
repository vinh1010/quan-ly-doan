import { Router } from "express";
import {
  createSecretary,
  deleteSecretary,
  getSecretary,
  listSecretaries,
  updateSecretary,
} from "../controllers/secretaries.controller";
import { listUnits } from "../controllers/units.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/http";

export const secretaryRoutes = Router();
secretaryRoutes.use(requireAuth, requireRole("SUPERIOR", "ADMIN"));
secretaryRoutes.get("/", asyncHandler(listSecretaries));
secretaryRoutes.post("/", asyncHandler(createSecretary));
secretaryRoutes.get("/:id", asyncHandler(getSecretary));
secretaryRoutes.put("/:id", asyncHandler(updateSecretary));
secretaryRoutes.delete("/:id", asyncHandler(deleteSecretary));

export const unitRoutes = Router();
unitRoutes.use(requireAuth);
unitRoutes.get("/", asyncHandler(listUnits));
