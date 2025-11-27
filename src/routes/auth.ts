import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { googleAuth } from "../controllers/authController";

const router = Router();

// POST /api/auth/google - Authenticate with Google (verify token)
router.post("/google", authMiddleware, googleAuth);

export default router;
