import { Router } from "express";
import healthRoutes from "./health";
import authRoutes from "./auth";
import userRoutes from "./users";

const router = Router();

// Health check routes (no authentication required)
router.use("/health", healthRoutes);

// Authentication routes
router.use("/api/auth", authRoutes);

// API routes (authentication required - handled in individual route files)
router.use("/api/users", userRoutes);

export default router;
