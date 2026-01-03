import { Request, Response } from "express";
import { TaskModel, Task } from "../models/Task";
import { logger } from "../utils/logger";

// Types for ElevenLabs server tool requests
interface GetTasksRequest {
  query?: string;
  date?: string;
  user_id: string; // Passed via ElevenLabs dynamic variables
}

interface ProposeActionRequest {
  action: "create_task" | "update_task" | "delete_task";
  user_id: string; // Passed via ElevenLabs dynamic variables
  task_id?: string;
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  priority?: string;
}

// Response types for voice-friendly output
interface VoiceTaskResponse {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  isCompleted: boolean;
  priority: string;
}

interface GetTasksResponse {
  found: number;
  tasks: VoiceTaskResponse[];
}

interface ActionResponse {
  success: boolean;
  message: string;
  task?: VoiceTaskResponse;
}

// Helper: Format task for voice-friendly output
function formatTaskForVoice(task: Task): VoiceTaskResponse {
  return {
    id: task.id,
    title: task.title || "Untitled task",
    date: task.date,
    startTime: task.start_time,
    endTime: task.end_time,
    description: task.description || "",
    isCompleted: task.is_completed,
    priority: extractPriority(task.tags),
  };
}

// Helper: Extract priority from tags array
function extractPriority(tags: any[]): string {
  if (!tags || !Array.isArray(tags)) return "medium";
  const priorityTag = tags.find(
    (tag) =>
      typeof tag === "string" &&
      ["low", "medium", "high"].includes(tag.toLowerCase())
  );
  return priorityTag ? priorityTag.toLowerCase() : "medium";
}

// Helper: Filter tasks by search query
function filterTasksByQuery(tasks: Task[], query: string): Task[] {
  const lowerQuery = query.toLowerCase();
  return tasks.filter((task) => {
    const titleMatch = task.title?.toLowerCase().includes(lowerQuery);
    const descMatch = task.description?.toLowerCase().includes(lowerQuery);
    return titleMatch || descMatch;
  });
}

// Helper: Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * GET_TASKS Server Tool
 * Called by ElevenLabs agent to retrieve user's tasks
 * POST /api/voice/tools/tasks
 */
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, date, user_id } = req.body as GetTasksRequest;

    if (!user_id) {
      logger.warn("Voice tools: get_tasks called without user_id");
      res.status(400).json({
        found: 0,
        tasks: [],
        error: "User context is required",
      });
      return;
    }

    logger.info("Voice tools: get_tasks called", { user_id, query, date });

    let tasks: Task[];

    // If date is provided, filter by date range (single day)
    if (date) {
      tasks = await TaskModel.findByUserIdAndDateRange(user_id, date, date);
    } else {
      tasks = await TaskModel.findByUserId(user_id);
    }

    // If query is provided, filter by search terms
    if (query && query.trim()) {
      tasks = filterTasksByQuery(tasks, query.trim());
    }

    // Filter out deleted and completed tasks for voice queries (show active tasks)
    tasks = tasks.filter((task) => !task.is_deleted);

    // Format for voice-friendly output
    const voiceTasks = tasks.map(formatTaskForVoice);

    const response: GetTasksResponse = {
      found: voiceTasks.length,
      tasks: voiceTasks,
    };

    logger.info("Voice tools: get_tasks response", {
      user_id,
      found: response.found,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error("Voice tools: get_tasks error", { error });
    res.status(500).json({
      found: 0,
      tasks: [],
      error: "Failed to retrieve tasks",
    });
  }
};

/**
 * PROPOSE_ACTION Server Tool
 * Called by ElevenLabs agent to create/update/delete tasks
 * POST /api/voice/tools/action
 */
export const proposeAction = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      action,
      user_id,
      task_id,
      title,
      date,
      start_time,
      end_time,
      description,
      priority,
    } = req.body as ProposeActionRequest;

    if (!user_id) {
      logger.warn("Voice tools: propose_action called without user_id");
      res.status(200).json({
        success: false,
        message: "User context is required",
      });
      return;
    }

    if (!action) {
      res.status(200).json({
        success: false,
        message: "Action type is required",
      });
      return;
    }

    logger.info("Voice tools: propose_action called", {
      user_id,
      action,
      task_id,
      title,
    });

    let response: ActionResponse;

    switch (action) {
      case "create_task":
        response = await handleCreateTask({
          user_id,
          title,
          date,
          start_time,
          end_time,
          description,
          priority,
        });
        break;

      case "update_task":
        response = await handleUpdateTask({
          user_id,
          task_id,
          title,
          date,
          start_time,
          end_time,
          description,
          priority,
        });
        break;

      case "delete_task":
        response = await handleDeleteTask({ user_id, task_id });
        break;

      default:
        response = {
          success: false,
          message: `Unknown action: ${action}`,
        };
    }

    logger.info("Voice tools: propose_action response", {
      user_id,
      action,
      success: response.success,
    });

    // Always return 200 so ElevenLabs treats this as a handled tool call.
    // Failures are indicated in the payload via success:false so the agent
    // can ask the user for missing info instead of aborting with HTTP 400.
    res.status(200).json(response);
  } catch (error) {
    logger.error("Voice tools: propose_action error", { error });
    res.status(500).json({
      success: false,
      message: "Failed to execute action",
    });
  }
};

// Handler: Create a new task
async function handleCreateTask(params: {
  user_id: string;
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  priority?: string;
}): Promise<ActionResponse> {
  const { user_id, title, date, start_time, end_time, description, priority } =
    params;

  if (!title) {
    return {
      success: false,
      message: "Task title is required to create a task",
    };
  }

  // Build tags array with priority if provided
  const tags: string[] = [];
  if (priority && ["low", "medium", "high"].includes(priority.toLowerCase())) {
    tags.push(priority.toLowerCase());
  }

  const taskData = {
    user_id,
    title,
    description: description || undefined,
    date: date || new Date().toISOString().split("T")[0],
    start_time: start_time || undefined,
    end_time: end_time || undefined,
    tags,
  };

  const task = await TaskModel.create(taskData);

  return {
    success: true,
    message: `Created task "${task.title}" for ${task.date}`,
    task: formatTaskForVoice(task),
  };
}

// Handler: Update an existing task
async function handleUpdateTask(params: {
  user_id: string;
  task_id?: string;
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  priority?: string;
}): Promise<ActionResponse> {
  const {
    user_id,
    task_id,
    title,
    date,
    start_time,
    end_time,
    description,
    priority,
  } = params;

  if (!task_id) {
    return {
      success: false,
      message:
        "Task ID is required to update a task. Use get_tasks first to find the task ID.",
    };
  }

  // Validate UUID format
  if (!isValidUUID(task_id)) {
    return {
      success: false,
      message: `Invalid task ID "${task_id}". Please use get_tasks first to find the correct task ID (it should be a UUID like "abc12345-1234-5678-9abc-def012345678").`,
    };
  }

  // Verify task exists and belongs to user
  const existingTask = await TaskModel.findById(task_id);
  if (!existingTask) {
    return {
      success: false,
      message: "Task not found. Use get_tasks to find available tasks.",
    };
  }

  if (existingTask.user_id !== user_id) {
    return {
      success: false,
      message: "You don't have permission to update this task",
    };
  }

  // Build update object with only provided fields
  const updates: Partial<Task> = {};
  if (title !== undefined) updates.title = title;
  if (date !== undefined) updates.date = date;
  if (start_time !== undefined) updates.start_time = start_time;
  if (end_time !== undefined) updates.end_time = end_time;
  if (description !== undefined) updates.description = description;

  // Handle priority update in tags
  if (priority !== undefined) {
    const existingTags = existingTask.tags || [];
    const filteredTags = existingTags.filter(
      (tag: any) =>
        typeof tag !== "string" ||
        !["low", "medium", "high"].includes(tag.toLowerCase())
    );
    if (["low", "medium", "high"].includes(priority.toLowerCase())) {
      filteredTags.push(priority.toLowerCase());
    }
    updates.tags = filteredTags;
  }

  const updatedTask = await TaskModel.update(task_id, updates);

  if (!updatedTask) {
    return {
      success: false,
      message: "Failed to update task",
    };
  }

  return {
    success: true,
    message: `Updated task "${updatedTask.title}"`,
    task: formatTaskForVoice(updatedTask),
  };
}

// Handler: Delete a task
async function handleDeleteTask(params: {
  user_id: string;
  task_id?: string;
}): Promise<ActionResponse> {
  const { user_id, task_id } = params;

  if (!task_id) {
    return {
      success: false,
      message:
        "Task ID is required to delete a task. Use get_tasks first to find the task ID.",
    };
  }

  // Validate UUID format
  if (!isValidUUID(task_id)) {
    return {
      success: false,
      message: `Invalid task ID "${task_id}". Please use get_tasks first to find the correct task ID (it should be a UUID like "abc12345-1234-5678-9abc-def012345678").`,
    };
  }

  // Verify task exists and belongs to user
  const existingTask = await TaskModel.findById(task_id);
  if (!existingTask) {
    return {
      success: false,
      message: "Task not found. Use get_tasks to find available tasks.",
    };
  }

  if (existingTask.user_id !== user_id) {
    return {
      success: false,
      message: "You don't have permission to delete this task",
    };
  }

  await TaskModel.delete(task_id);

  return {
    success: true,
    message: `Deleted task "${existingTask.title}"`,
  };
}
