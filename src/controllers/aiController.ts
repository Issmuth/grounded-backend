import { Request, Response } from "express";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { env } from "../config/env";
import { TaskModel } from "../models/Task";
import { AppError } from "../utils/errors";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const tools = [
  {
    functionDeclarations: [
      {
        name: "get_tasks",
        description:
          "Get tasks for a specific date range or all tasks if no range provided.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            start_date: {
              type: SchemaType.STRING,
              description: "Start date in YYYY-MM-DD format",
            },
            end_date: {
              type: SchemaType.STRING,
              description: "End date in YYYY-MM-DD format",
            },
          },
        },
      },
      {
        name: "create_task",
        description: "Create a new task.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: {
              type: SchemaType.STRING,
              description: "Title of the task",
            },
            date: {
              type: SchemaType.STRING,
              description: "Date of the task in YYYY-MM-DD format",
            },
            start_time: {
              type: SchemaType.STRING,
              description: "Start time in HH:MM format",
            },
            end_time: {
              type: SchemaType.STRING,
              description: "End time in HH:MM format",
            },
            description: {
              type: SchemaType.STRING,
              description: "Description of the task",
            },
          },
          required: ["title", "date", "start_time", "end_time"],
        },
      },
      {
        name: "update_task",
        description: "Update an existing task.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            id: {
              type: SchemaType.STRING,
              description: "ID of the task to update",
            },
            updates: {
              type: SchemaType.OBJECT,
              description:
                "Object containing fields to update (title, date, start_time, end_time, description, is_completed)",
            },
          },
          required: ["id", "updates"],
        },
      },
      {
        name: "delete_task",
        description: "Delete a task.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            id: {
              type: SchemaType.STRING,
              description: "ID of the task to delete",
            },
          },
          required: ["id"],
        },
      },
    ],
  },
];

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  tools: tools as any,
});

export const confirmAction = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { action, data } = req.body;

    let result;

    if (action === "create_task") {
      result = await TaskModel.create({ ...data, user_id: userId });
    } else if (action === "update_task") {
      const { id, updates } = data;
      const task = await TaskModel.findById(id);
      if (task && task.user_id === userId) {
        result = await TaskModel.update(id, updates);
      } else {
        throw new AppError(
          "Task not found or unauthorized",
          403,
          "TASK_NOT_FOUND"
        );
      }
    } else if (action === "delete_task") {
      const { id } = data;
      const task = await TaskModel.findById(id);
      if (task && task.user_id === userId) {
        await TaskModel.delete(id);
        result = { success: true, message: "Task deleted" };
      } else {
        throw new AppError(
          "Task not found or unauthorized",
          403,
          "TASK_NOT_FOUND"
        );
      }
    } else {
      throw new AppError("Invalid action", 400, "INVALID_ACTION");
    }

    let tasks: any[] = [];
    if (action === "create_task" || action === "update_task") {
      tasks = [result];
    }

    res.json({
      status: "success",
      data: result,
      text: "Action completed successfully.",
      tasks: tasks,
    });
  } catch (error) {
    console.error("Confirm action error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to execute action",
    });
  }
};

export const chat = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { message, history = [] } = req.body;

    const currentDate = new Date();
    const dateContext = `
    [SYSTEM CONTEXT]
    Current Date: ${currentDate.toISOString().split("T")[0]} (${
      [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][currentDate.getDay()]
    })
    Current Time: ${currentDate.toLocaleTimeString()}
    
    INSTRUCTIONS:
    - You are a helpful, casual, and intelligent personal assistant for the "Grounded" productivity app.
    - **Personality**: Be chatty, inquisitive, and friendly. Don't just be a robot that fills forms. Show enthusiasm for the user's plans.
    - **Deep Context**: If the user mentions an activity (e.g., "baking", "hiking", "project"), ask relevant follow-up questions to help them prepare.
      - *Example*: If they say "baking for a dinner", ask "Ooh, what are you making? Do you need a subtask for buying ingredients?"
      - *Example*: If they say "studying", ask "What subject? Should I add a break timer?"
    - **Inference**: Infer dates/times from context (e.g. "this friday" -> calculate date). NEVER ask for YYYY-MM-DD.
    - **Defaults**: Duration: 1 hour. Start time: 09:00 (morning), 14:00 (afternoon), next hour (soon).
    - **Workflow**: Search before Edit/Delete (use get_tasks). NEVER ask for IDs.
    - **Goal**: Make the user feel supported, not just processed.
    `;

    const chatSession = model.startChat({
      history: [
        { role: "user", parts: [{ text: dateContext }] },
        {
          role: "model",
          parts: [
            { text: "Understood. I'm ready to help you with your schedule." },
          ],
        },
        ...history.map((h: any) => ({
          role: h.isUser ? "user" : "model",
          parts: [{ text: h.text }],
        })),
      ],
    });

    const result = await chatSession.sendMessage(message);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls) {
      const functionResponses = [];
      let requiresConfirmation = false;
      let confirmationData = null;
      let tasksFound = null;

      for (const call of functionCalls) {
        let functionResult;

        try {
          if (call.name === "get_tasks") {
            const { start_date, end_date } = call.args as any;
            if (start_date && end_date) {
              functionResult = await TaskModel.findByUserIdAndDateRange(
                userId,
                start_date,
                end_date
              );
            } else {
              functionResult = await TaskModel.findByUserId(userId);
            }
            tasksFound = functionResult;
          } else if (
            ["create_task", "update_task", "delete_task"].includes(call.name)
          ) {
            // Intercept write operations for confirmation
            requiresConfirmation = true;
            confirmationData = {
              action: call.name,
              data: call.args,
            };
            // We break here because we want to stop and ask for confirmation
            // For simplicity, we only handle one write op at a time
            break;
          }
        } catch (e: any) {
          functionResult = { error: e.message };
        }

        if (!requiresConfirmation) {
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: functionResult },
            },
          });
        }
      }

      if (requiresConfirmation && confirmationData) {
        res.json({
          type: "confirmation_request",
          text: "I've prepared that for you. Does this look right?",
          action: confirmationData.action,
          data: confirmationData.data,
          tasks: tasksFound,
        });
        return;
      }

      // Send function responses back to the model
      const finalResult = await chatSession.sendMessage(functionResponses);
      res.json({ text: finalResult.response.text(), tasks: tasksFound });
    } else {
      res.json({ text: response.text() });
    }
  } catch (error: any) {
    console.error("AI Chat error:", error);
    if (error.status === 429) {
      res.status(429).json({
        status: "error",
        message:
          "AI service is currently busy. Please try again in a few moments.",
      });
      return;
    }
    res.status(500).json({
      status: "error",
      message: "Failed to process chat request",
    });
  }
};
