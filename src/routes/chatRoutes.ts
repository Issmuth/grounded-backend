import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getChatHistory,
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  getOrCreateActiveSession,
  sendMessage,
  confirmAction,
  getRecentChats,
  saveVoiceTranscript,
} from "../controllers/chatController";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Chat history and recent chats
router.get("/history", getChatHistory);
router.get("/recent", getRecentChats);

// Session management
router.get("/sessions", getSessions);
router.post("/sessions", createSession);
router.get("/sessions/active", getOrCreateActiveSession);
router.get("/sessions/:id", getSession);
router.put("/sessions/:id", updateSession);
router.delete("/sessions/:id", deleteSession);

// Messaging
router.post("/message", sendMessage);
router.post("/confirm", confirmAction);

// Voice transcript (Requirements: 3.4, 7.1, 7.2, 7.3, 7.4)
router.post("/voice-transcript", saveVoiceTranscript);

export default router;
