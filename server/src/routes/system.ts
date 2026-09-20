import { Router } from "express";
import { listAccounts, setAccountStatus } from "../controllers/accounts.controller";
import { listAuditLogs } from "../controllers/auditLogs.controller";
import { exportReport, reportByArea } from "../controllers/reports.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/http";

export const accountRoutes = Router();
accountRoutes.use(requireAuth, requireRole("SUPERIOR", "ADMIN"));
accountRoutes.get("/", asyncHandler(listAccounts));
accountRoutes.patch("/:id/status", asyncHandler(setAccountStatus));

export const reportRoutes = Router();
reportRoutes.use(requireAuth, requireRole("SUPERIOR", "ADMIN"));
reportRoutes.get("/by-area", asyncHandler(reportByArea));
reportRoutes.get("/export", asyncHandler(exportReport));

export const auditLogRoutes = Router();
auditLogRoutes.use(requireAuth, requireRole("SUPERIOR", "ADMIN"));
auditLogRoutes.get("/", asyncHandler(listAuditLogs));
