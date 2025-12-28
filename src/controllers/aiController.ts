import { Request, Response } from "express";
import Groq from "groq-sdk";
import { TaskModel } from "../models/Task";
import { toolSchemas, createToolExecutor, ToolName } from "./aiTools";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Model selection - using OpenAI model via Groq
const MODEL = "openai/gpt-oss-120b";
const MAX_ITERATIONS = 10;
const INITIAL_TEMPERATURE = 0.5; // Start with moderate temperature
const MAX_RETRIES = 3;

// Helper function to call Groq with retry logic for tool call failures
async function callGroqWithRetry(
  messages: Message[],
  tools: typeof toolSchemas,
  toolChoice: "auto" | "none" = "auto",
  maxTokens: number = 4096
): Promise<Groq.Chat.Completions.ChatCompletion> {
  let temperature = INITIAL_TEMPERATURE;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: MODEL,
        messages: messages as any,
        tools: tools,
        tool_choice: toolChoice,
        temperature: temperature,
        max_tokens: maxTokens,
      });
      return response;
    } catch (error: any) {
      // Check if this is a tool call generation error (400)
      if (error?.status === 400 && error?.error?.code === "tool_use_failed") {
        if (attempt < MAX_RETRIES - 1) {
          // Adjust temperature for next attempt
          temperature = Math.min(temperature + 0.2, 1.0);
          console.log(
            `Tool call failed, retrying with temperature ${temperature} (attempt ${
              attempt + 2
            }/${MAX_RETRIES})`
          );
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error("Failed to generate valid tool calls after retries");
}

// Build system prompt with current date
function buildSystemPrompt(): string {
  const localDate = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date(Date.now() + 86400000)
    .toISOString()
    .split("T")[0];

  return `You are an intelligent personal assistant for the "Grounded" productivity app.
Current Date: ${localDate}

## Your Tools
1. **get_tasks(query, date, startDate, endDate)** - Search for existing tasks
2. **propose_action(action, data)** - Propose a modification (create/update/delete) for user confirmation

## WORKFLOW RULES

### For QUERY Requests (viewing/listing tasks):
Examples: "What's on my schedule today?", "Show my tasks", "Do I have any meetings?"
- Call get_tasks to retrieve tasks
- Return a helpful text summary of the results
- Do NOT call propose_action - user is just asking for information

### For MODIFICATION Requests (create/update/delete):
Examples: "Reschedule my meeting", "Delete the dentist appointment", "Add a gym session"

**For Update/Delete - Follow this 2-step sequence:**
1. Call get_tasks with keywords to find the task
2. Call propose_action with the exact task ID from results

**For Create - Single step:**
1. Call propose_action with action: "create_task" directly

## ⚠️ CRITICAL REQUIREMENTS

1. **Distinguish query vs modification** - Only use propose_action for modifications
2. **Extract keywords** - Always pass query parameter to get_tasks
3. **Use exact UUIDs** - Copy task IDs exactly from get_tasks results
4. **Date formatting** - Convert relative dates to YYYY-MM-DD
   - Today's date is: ${localDate}
   - Tomorrow's date is: ${tomorrowDate}

## Examples

**Example 1: Query Request (NO propose_action needed)**
User: "What's on my schedule today?"
→ get_tasks({ date: "${localDate}" })
→ Return text summary of tasks found

**Example 2: Update Request**
User: "Reschedule my team meeting to 5pm"
→ get_tasks({ query: "team meeting" })
→ propose_action({ action: "update_task", data: { id: "<task-id>", startTime: "17:00:00" } })

**Example 3: Delete Request**
User: "Remove my dentist appointment"
→ get_tasks({ query: "dentist" })
→ propose_action({ action: "delete_task", data: { id: "<task-id>" } })

**Example 4: Create Request**
User: "Add a gym session tomorrow at 6am"
→ propose_action({ action: "create_task", data: { title: "Gym session", date: "${tomorrowDate}", startTime: "06:00:00" } })

## 🚫 What NOT To Do
- ❌ Using propose_action for query/viewing requests
- ❌ Inventing task IDs instead of using actual IDs from search results`;
}

// Type definitions for Groq SDK responses
interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// Main Chat Handler with Agentic Loop
export const chat = async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    const userId = req.user!.uid;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`AI Request: "${message}"`);
    console.log(`${"=".repeat(60)}`);

    // Build messages array
    const messages: Message[] = [
      { role: "system", content: buildSystemPrompt() },
      ...(history || []).map((h: any) => ({
        role: h.isUser ? "user" : "assistant",
        content: h.text,
      })),
      { role: "user", content: message },
    ];

    // Create tool executor for this user
    const toolExecutor = createToolExecutor(userId);

    // Track workflow state
    let proposal: any = null;
    let iteration = 0;

    // ========================================================================
    // Agentic Loop - Continue until model stops calling tools or max iterations
    // ========================================================================
    while (iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`\n--- Iteration ${iteration} ---`);

      // Make API call to Groq with retry logic
      const response = await callGroqWithRetry(messages, toolSchemas);

      const responseMessage = response.choices[0].message;
      const toolCalls = responseMessage.tool_calls;
      const finishReason = response.choices[0].finish_reason;

      console.log(`Finish reason: ${finishReason}`);
      console.log(`Has tool calls: ${!!toolCalls?.length}`);

      // If no tool calls, we're done - return the text response
      if (!toolCalls || toolCalls.length === 0) {
        console.log("No tool calls - returning text response");

        // Normal text response
        const responseText =
          responseMessage.content || "I've processed your request.";
        console.log("Sending text response:", responseText);
        res.json({ type: "text", text: responseText });
        return;
      }

      // Add assistant message with tool calls to conversation
      messages.push({
        role: "assistant",
        content: responseMessage.content,
        tool_calls: toolCalls,
      });

      console.log(`Model called ${toolCalls.length} tool(s)`);

      // Execute each tool call
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name as ToolName;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`  → ${functionName}(${JSON.stringify(functionArgs)})`);

        // Execute the tool
        let functionResponse: string;
        if (functionName === "get_tasks") {
          functionResponse = await toolExecutor.get_tasks(functionArgs);
        } else if (functionName === "propose_action") {
          functionResponse = toolExecutor.propose_action(functionArgs);
          // Capture the proposal for returning to client
          proposal = functionArgs;
        } else {
          functionResponse = JSON.stringify({
            error: `Unknown function: ${functionName}`,
          });
        }

        console.log(
          `    ← ${functionResponse.substring(0, 200)}${
            functionResponse.length > 200 ? "..." : ""
          }`
        );

        // Add tool result to conversation
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: functionName,
          content: functionResponse,
        });
      }

      // If we got a proposal, return it to the client for confirmation
      if (proposal) {
        console.log(
          "\n✅ Proposal captured - returning to client for confirmation"
        );
        console.log("Proposal:", proposal);

        // Generate a simple confirmation message based on the action
        const { action, task_id, start_time, end_time, title, date, ...rest } =
          proposal;

        let confirmationText = "I've prepared that for you. Please confirm.";
        if (action === "create_task") {
          confirmationText = `I'll create a task "${title || "New task"}"${
            date ? ` for ${date}` : ""
          }${start_time ? ` at ${start_time}` : ""}. Please confirm.`;
        } else if (action === "update_task") {
          confirmationText = `I'll update the task${
            start_time ? ` to ${start_time}` : ""
          }${date ? ` on ${date}` : ""}. Please confirm.`;
        } else if (action === "delete_task") {
          confirmationText = "I'll delete this task. Please confirm.";
        }

        res.json({
          type: "confirmation_request",
          action: action,
          data: {
            id: task_id,
            title,
            date,
            startTime: start_time,
            endTime: end_time,
            ...rest,
          },
          text: confirmationText,
        });
        return;
      }
    }

    // Max iterations reached
    console.error("Max iterations reached without completing task");
    res.json({
      type: "text",
      text: "I'm having trouble processing this request. Please try rephrasing it.",
      error: "max_iterations",
    });
  } catch (error: any) {
    console.error("AI Error:", error);
    res
      .status(500)
      .json({ error: "AI processing failed", details: error.message });
  }
};

// Confirm Action Handler - Executes the actual DB write
export const confirmAction = async (req: Request, res: Response) => {
  try {
    const { action, data } = req.body;
    const userId = req.user!.uid;

    console.log("Executing confirmed action:", action, data);

    let result: any = null;
    let replyText = "Done.";

    if (action === "create_task") {
      const task = await TaskModel.create({ ...data, user_id: userId });
      result = task;
      replyText = `Created task: ${task.title}`;
    } else if (action === "update_task") {
      if (!data.id) throw new Error("Missing ID for update_task");
      const task = await TaskModel.update(data.id, data);
      result = task;
      replyText = `Updated task: ${task?.title}`;
    } else if (action === "delete_task") {
      if (!data.id) throw new Error("Missing ID for delete_task");
      await TaskModel.delete(data.id);
      replyText = "Task deleted.";
    } else if (action === "create_subtask") {
      if (!data.task_id)
        throw new Error("Missing parent task_id for create_subtask");
      const sub = await TaskModel.createSubtask(data.task_id, {
        title: data.subtask_title || "Subtask",
      });
      result = sub;
      replyText = "Subtask created.";
    }

    res.json({
      type: "text",
      text: replyText,
      data: result,
    });
  } catch (error: any) {
    console.error("Confirmation Error:", error);
    res.status(500).json({ error: error.message });
  }
};
