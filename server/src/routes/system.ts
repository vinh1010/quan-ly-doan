import { Router } from "express";
import { listAccounts, setAccountStatus } from "../controllers/accounts.controller";
import { listAuditLogs } from "../controllers/auditLogs.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/http";

export const accountRoutes = Router();
accountRoutes.use(requireAuth, requireRole("SUPERIOR", "ADMIN"));
accountRoutes.get("/", asyncHandler(listAccounts));
accountRoutes.patch("/:id/status", asyncHandler(setAccountStatus));

export const auditLogRoutes = Router();
auditLogRoutes.use(requireAuth, requireRole("SUPERIOR", "ADMIN"));
auditLogRoutes.get("/", asyncHandler(listAuditLogs));
