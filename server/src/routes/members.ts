import { Router } from "express";
import { createMember, deleteMember, listMembers, updateMember } from "../controllers/members.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/http";

export const memberRoutes = Router();
// Giống đánh giá xếp loại: cho phép cả SECRETARY (Bí thư cấp thôn) tự thêm Đoàn viên của mình.
memberRoutes.use(requireAuth, requireRole("SECRETARY", "SUPERIOR", "ADMIN"));
memberRoutes.get("/", asyncHandler(listMembers));
memberRoutes.post("/", asyncHandler(createMember));
memberRoutes.put("/:id", asyncHandler(updateMember));
memberRoutes.delete("/:id", asyncHandler(deleteMember));
