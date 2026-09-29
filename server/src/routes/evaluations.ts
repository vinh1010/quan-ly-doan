import { Router } from "express";
import {
  approveEvaluation,
  createEvaluation,
  deleteEvaluation,
  forwardEvaluation,
  getEvaluation,
  listEvaluations,
  listMyEvaluations,
  reopenEvaluation,
  setGrades,
  updateEvaluation,
} from "../controllers/evaluations.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/http";

export const evaluationRoutes = Router();
// Khác các route quản lý khác: cho phép cả SECRETARY (Bí thư cấp thôn) tự nhập cho đơn vị của mình.
evaluationRoutes.use(requireAuth, requireRole("SECRETARY", "SUPERIOR", "ADMIN"));
evaluationRoutes.get("/", asyncHandler(listEvaluations));
evaluationRoutes.post("/", asyncHandler(createEvaluation));
evaluationRoutes.get("/mine", asyncHandler(listMyEvaluations));
evaluationRoutes.get("/:id", asyncHandler(getEvaluation));
evaluationRoutes.put("/:id", asyncHandler(updateEvaluation));
evaluationRoutes.delete("/:id", asyncHandler(deleteEvaluation));
evaluationRoutes.post("/:id/forward", asyncHandler(forwardEvaluation));
evaluationRoutes.put("/:id/grades", asyncHandler(setGrades));
evaluationRoutes.post("/:id/approve", asyncHandler(approveEvaluation));
evaluationRoutes.post("/:id/reopen", asyncHandler(reopenEvaluation));
