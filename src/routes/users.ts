import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createOrUpdateUser,
  getCurrentUser,
} from "../controllers/userController";

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// POST /api/users - Create or update user profile
router.post("/", createOrUpdateUser);

// GET /api/users/me - Get current user profile
router.get("/me", getCurrentUser);

export default router;
