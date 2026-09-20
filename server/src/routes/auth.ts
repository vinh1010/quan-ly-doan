import { Router } from "express";
import { changePassword, login, logout, me } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/http";

const router = Router();

router.post("/login", asyncHandler(login));
router.get("/me", requireAuth, asyncHandler(me));
router.post("/change-password", requireAuth, asyncHandler(changePassword));
router.post("/logout", requireAuth, asyncHandler(logout));

export default router;
