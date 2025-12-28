import { TaskModel } from "../models/Task";
import Groq from "groq-sdk";

/**
 * Tool definitions and implementations for Groq SDK local tool calling.
 * Following Groq's native tool calling pattern with JSON schemas.
 */

// ============================================================================
// Tool Schemas (JSON Schema format for Groq API)
// ============================================================================

export const toolSchemas: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_tasks",
      description:
        "Search for user's tasks. Returns a list of tasks matching the criteria.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Keywords to search in task titles. Leave empty to get all tasks.",
          },
          date: {
            type: "string",
            description: "Filter by specific date in YYYY-MM-DD format",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_action",
      description:
        "Propose a task modification (create, update, or delete) for user confirmation.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["create_task", "update_task", "delete_task"],
            description: "The type of action to perform",
          },
          task_id: {
            type: "string",
            description: "The task ID (required for update/delete)",
          },
          title: {
            type: "string",
            description: "Task title (for create/update)",
          },
          date: {
            type: "string",
            description: "Task date in YYYY-MM-DD format",
          },
          start_time: {
            type: "string",
            description: "Start time in HH:MM format",
          },
          end_time: {
            type: "string",
            description: "End time in HH:MM format",
          },
          description: {
            type: "string",
            description: "Task description",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Task priority level",
          },
        },
        required: ["action"],
      },
    },
  },
];

// ============================================================================
// Tool Implementations
// ============================================================================

interface GetTasksArgs {
  query?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

interface ProposeActionArgs {
  action: "create_task" | "update_task" | "delete_task";
  task_id?: string;
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  priority?: string;
}

export async function executeGetTasks(
  userId: string,
  args: GetTasksArgs
): Promise<string> {
  try {
    const { query = "", date, startDate, endDate } = args;
    console.log("get_tasks tool called with:", {
      query,
      date,
      startDate,
      endDate,
    });

    let tasks: any[] = [];
    if (startDate && endDate) {
      tasks = await TaskModel.findByUserIdAndDateRange(
        userId,
        startDate,
        endDate
      );
    } else {
      tasks = await TaskModel.findByUserId(userId);
    }

    // Filter by date if specific date provided (and not range)
    if (date && !startDate) {
      tasks = tasks.filter(
        (t: any) =>
          t.date === date || (t.start_time && t.start_time.startsWith(date))
      );
    }

    // Filter by query if provided (empty string returns all)
    if (query && query.trim() !== "") {
      const q = query.toLowerCase();
      tasks = tasks.filter(
        (t: any) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Limit to 10 most relevant tasks
    const limitedTasks = tasks.slice(0, 10);

    // Return simplified list
    const simplifiedTasks = limitedTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      startTime: t.start_time,
      description: t.description,
      isCompleted: t.is_completed,
    }));

    console.log(`get_tasks returning ${simplifiedTasks.length} tasks`);

    if (simplifiedTasks.length === 0) {
      return JSON.stringify({
        found: 0,
        tasks: [],
        message: `No tasks found matching query "${query}".`,
      });
    }

    return JSON.stringify({
      found: simplifiedTasks.length,
      tasks: simplifiedTasks,
    });
  } catch (error) {
    const errorMsg = `ERROR in get_tasks: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMsg, error);
    return JSON.stringify({ error: errorMsg });
  }
}

export function executeProposeAction(args: ProposeActionArgs): string {
  console.log("✅ propose_action called with:", args);
  // Convert flat args to the data structure expected by confirmAction
  const { action, task_id, ...rest } = args;
  return JSON.stringify({
    action,
    data: {
      id: task_id,
      ...rest,
      // Convert snake_case to camelCase for frontend
      startTime: rest.start_time,
      endTime: rest.end_time,
    },
    _isProposal: true,
  });
}

// ============================================================================
// Function Registry - Maps tool names to implementations
// ============================================================================

export function createToolExecutor(userId: string) {
  return {
    get_tasks: (args: GetTasksArgs) => executeGetTasks(userId, args),
    propose_action: (args: ProposeActionArgs) => executeProposeAction(args),
  };
}

export type ToolName = "get_tasks" | "propose_action";
