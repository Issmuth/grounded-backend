import { Router } from "express";
import { chat, confirmAction } from "../controllers/aiController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/chat", authMiddleware, chat);
router.post("/confirm", authMiddleware, confirmAction);

export default router;
