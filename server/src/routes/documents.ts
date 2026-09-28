import { Router } from "express";
import {
  confirmDocument,
  createDocument,
  deleteDocument,
  forwardDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from "../controllers/documents.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/http";

export const documentRoutes = Router();
documentRoutes.use(requireAuth, requireRole("SUPERIOR", "ADMIN"));
documentRoutes.get("/", asyncHandler(listDocuments));
documentRoutes.post("/", asyncHandler(createDocument));
documentRoutes.get("/:id", asyncHandler(getDocument));
documentRoutes.put("/:id", asyncHandler(updateDocument));
documentRoutes.delete("/:id", asyncHandler(deleteDocument));
documentRoutes.post("/:id/forward", asyncHandler(forwardDocument));
documentRoutes.post("/:id/confirm", asyncHandler(confirmDocument));
