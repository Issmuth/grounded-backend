import { Router } from "express";
import * as voiceToolsController from "../controllers/voiceToolsController";

const router = Router();

/**
 * Voice Tools Routes
 * These endpoints are called by ElevenLabs agent as server tools.
 * They do NOT use Firebase auth middleware because ElevenLabs
 * passes user context via dynamic variables in the request body.
 */

// POST /api/voice/tools/tasks - Get user's tasks (server tool)
router.post("/tools/tasks", voiceToolsController.getTasks);

// POST /api/voice/tools/action - Create/update/delete tasks (server tool)
router.post("/tools/action", voiceToolsController.proposeAction);

export default router;
