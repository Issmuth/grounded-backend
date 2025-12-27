import { Router } from "express";
import healthRoutes from "./health";
import authRoutes from "./auth";
import userRoutes from "./users";
import taskRoutes from "./tasks";
import aiRoutes from "./ai";
import chatRoutes from "./chatRoutes";

const router = Router();

// Health check routes (no authentication required)
router.use("/health", healthRoutes);

// Authentication routes
router.use("/api/auth", authRoutes);

// API routes (authentication required - handled in individual route files)
router.use("/api/users", userRoutes);
router.use("/api/tasks", taskRoutes);
router.use("/api/ai", aiRoutes);
router.use("/api/chat", chatRoutes);

export default router;
