import { Request, Response } from "express";
import { TaskModel } from "../models/Task";
import { AppError, NotFoundError, ForbiddenError } from "../utils/errors";
import { UserModel } from "../models/User";

export const createTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const taskData = req.body;

    const task = await TaskModel.create({ ...taskData, user_id: userId });

    res.status(201).json({
      status: "success",
      data: task,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create task",
    });
  }
};

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { start_date, end_date } = req.query;

    let tasks;
    if (start_date && end_date) {
      tasks = await TaskModel.findByUserIdAndDateRange(
        userId,
        start_date as string,
        end_date as string
      );
    } else {
      tasks = await TaskModel.findByUserId(userId);
    }

    res.status(200).json({
      status: "success",
      data: tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch tasks",
    });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await TaskModel.findById(id);

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    // Check ownership
    if (task.user_id !== req.user!.uid) {
      throw new ForbiddenError("Unauthorized");
    }

    res.status(200).json({
      status: "success",
      data: task,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
    } else {
      console.error("Get task error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch task",
      });
    }
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.uid;
    const updates = req.body;

    const existingTask = await TaskModel.findById(id);
    if (!existingTask) {
      throw new NotFoundError("Task not found");
    }

    if (existingTask.user_id !== userId) {
      throw new ForbiddenError("Unauthorized");
    }

    const updatedTask = await TaskModel.update(id, updates);

    // Debug log
    console.log(
      `[task] existing task id=${id}, was_completed=${existingTask.is_completed}`
    );
    console.log(
      `[task] updated task id=${id}, is_completed=${
        (updatedTask as any)?.is_completed
      }, date=${(updatedTask as any)?.date}`
    );

    // Adjust streaks for this user/date if the task transitioned from incomplete -> complete
    try {
      const wasCompleted = !!existingTask.is_completed;
      const nowCompleted =
        updates && "is_completed" in updates
          ? !!updates.is_completed
          : !!(updatedTask as any)?.is_completed;

      if (!wasCompleted && nowCompleted && updatedTask && updatedTask.date) {
        console.log(
          `[task] Task transitioned to completed; calling adjustStreakAfterDate for uid=${userId}, date=${updatedTask.date}`
        );
        await UserModel.adjustStreakAfterDate(userId, updatedTask.date);
      } else {
        console.log(
          `[task] No streak adjustment needed (wasCompleted=${wasCompleted}, nowCompleted=${nowCompleted})`
        );
      }
    } catch (e) {
      console.error("Failed to adjust streak after task update:", e);
    }

    res.status(200).json({
      status: "success",
      data: updatedTask,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
    } else {
      console.error("Update task error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update task",
      });
    }
  }
};

export const updateSubtask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Ideally we should check ownership via task_id, but for speed we might skip or do a join.
    // Let's assume if they have the ID they can update, or we should fetch the subtask -> task -> check user.
    // For now, let's implement basic update.

    const updatedSubtask = await TaskModel.updateSubtask(id, req.body);
    if (!updatedSubtask) throw new NotFoundError("Subtask not found");

    // Try to update parent task completion and adjust streaks accordingly
    try {
      const parentTask = await TaskModel.findById(updatedSubtask.task_id);
      if (parentTask) {
        const allSubtasksCompleted = (parentTask.subtasks || []).every(
          (s) => s.is_completed
        );
        if (allSubtasksCompleted && !parentTask.is_completed) {
          console.log(
            `[task] all subtasks complete for task=${parentTask.id}, marking task complete and adjusting streak`
          );
          await TaskModel.update(parentTask.id, { is_completed: true });
          await UserModel.adjustStreakAfterDate(req.user!.uid, parentTask.date);
        } else if (!allSubtasksCompleted && parentTask.is_completed) {
          console.log(
            `[task] subtasks incomplete for task=${parentTask.id}, marking task incomplete and adjusting streak`
          );
          await TaskModel.update(parentTask.id, { is_completed: false });
          await UserModel.adjustStreakAfterDate(req.user!.uid, parentTask.date);
        }
      }
    } catch (e) {
      console.error("Failed to reconcile parent task completion / streaks:", e);
    }

    res.status(200).json({
      status: "success",
      data: updatedSubtask,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ status: "error", message: error.message });
    } else {
      res
        .status(500)
        .json({ status: "error", message: "Failed to update subtask" });
    }
  }
};
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.uid;

    const existingTask = await TaskModel.findById(id);
    if (!existingTask) {
      throw new NotFoundError("Task not found");
    }

    if (existingTask.user_id !== userId) {
      throw new ForbiddenError("Unauthorized");
    }

    await TaskModel.delete(id);

    res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
    } else {
      console.error("Delete task error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete task",
      });
    }
  }
};

export const syncTasks = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { tasks } = req.body;

    const result = await TaskModel.sync(userId, tasks);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Sync tasks error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to sync tasks",
    });
  }
};

// Subtask controllers
export const createSubtask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.uid;
    const subtaskData = req.body;

    const task = await TaskModel.findById(taskId);
    if (!task) throw new NotFoundError("Task not found");
    if (task.user_id !== userId) throw new ForbiddenError("Unauthorized");

    const subtask = await TaskModel.createSubtask(taskId, subtaskData);

    res.status(201).json({
      status: "success",
      data: subtask,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ status: "error", message: error.message });
    } else {
      res
        .status(500)
        .json({ status: "error", message: "Failed to create subtask" });
    }
  }
};

export const deleteSubtask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await TaskModel.deleteSubtask(id);
    res.status(200).json({ status: "success", data: null });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete subtask" });
  }
};
