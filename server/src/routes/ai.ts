import { Router } from "express";
import { draftDocument, draftSocialPost } from "../controllers/ai.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/http";

// Mở cho mọi vai trò đã đăng nhập (kể cả SECRETARY) — tính năng hỗ trợ soạn thảo dành chủ yếu
// cho Bí thư/Phó Bí thư Đoàn xã, không giới hạn theo phạm vi địa bàn vì không đụng tới dữ liệu CSDL.
export const aiRoutes = Router();
aiRoutes.use(requireAuth);
aiRoutes.post("/draft", asyncHandler(draftDocument));
aiRoutes.post("/social-post", asyncHandler(draftSocialPost));
