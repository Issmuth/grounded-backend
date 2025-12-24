import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import * as taskController from "../controllers/taskController";

const router = Router();

// Protect all routes
router.use(authMiddleware);

router.post("/", taskController.createTask);
router.get("/", taskController.getAllTasks);
router.post("/sync", taskController.syncTasks);

router.get("/:id", taskController.getTaskById);
router.put("/:id", taskController.updateTask);
router.delete("/:id", taskController.deleteTask);

// Subtask routes
router.post("/:taskId/subtasks", taskController.createSubtask);
router.put("/subtasks/:id", taskController.updateSubtask);
router.delete("/subtasks/:id", taskController.deleteSubtask);

export default router;
