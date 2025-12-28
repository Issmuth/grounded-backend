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

  return `You are a friendly, proactive personal assistant for the "Grounded" productivity app.
Current Date: ${localDate}
Tomorrow: ${tomorrowDate}

## Your Personality
- Friendly and conversational
- Proactive - ask clarifying questions when needed
- Schedule-aware - always check for conflicts before creating/modifying tasks
- Detail-oriented - ensure tasks have complete information

## Your Tools
1. **get_tasks(query, date)** - Search for existing tasks
2. **propose_action(action, ...)** - Propose a task modification for user confirmation

## WORKFLOW RULES

### For QUERY Requests (viewing tasks):
Examples: "What's on my schedule today?", "Show my tasks"
- Call get_tasks to retrieve tasks
- Return a friendly summary
- Do NOT call propose_action

### For CREATE Requests:
**IMPORTANT: Before creating a task, you MUST:**
1. First call get_tasks with the target date to check the user's existing schedule
2. If the user didn't specify a time, suggest a time that doesn't conflict with existing tasks
3. If the user didn't provide enough details, ask friendly follow-up questions
4. Always generate a helpful description for the task
5. Only call propose_action when you have: title, date, time, and description

**If there's a scheduling conflict:**
- Inform the user about the conflict
- Suggest alternative times that are free
- Ask which option they prefer

**Example conversation flow:**
User: "Add a task to clean my room tomorrow"
Assistant: "I'd love to help! I checked your schedule for tomorrow and you're free in the morning and after 3pm. What time works best for you? Also, any specific areas you want to focus on?"

### For UPDATE/DELETE Requests:
1. Call get_tasks to find the task
2. For updates: Check if the new time conflicts with other tasks
3. If conflict exists, warn the user and suggest alternatives
4. Call propose_action with the task ID

## CONFLICT DETECTION
When creating or rescheduling tasks:
- Check if the proposed time overlaps with existing tasks
- Consider task duration (assume 1 hour if not specified)
- A conflict exists if: new_task_start < existing_task_end AND new_task_end > existing_task_start

## REQUIRED TASK FIELDS
Every task MUST have:
- **title**: Clear, descriptive title
- **date**: In YYYY-MM-DD format
- **start_time**: In HH:MM format (24-hour)
- **description**: A helpful description (generate one based on context if user doesn't provide)
- **tags**: Task type classification (see below)
- **subtasks**: Optional list of subtasks (see below)

## SUBTASKS (Important!)
Subtasks help break down complex tasks into smaller, actionable steps.

### When to suggest subtasks:
- Tasks that involve multiple steps (cooking, cleaning, projects)
- Tasks that could benefit from a checklist
- When the user mentions multiple things to do within one task

### How to create subtasks:
- Include a "subtasks" array in propose_action
- Each subtask needs a "title" field
- Keep subtask titles short and actionable
- Order them logically (prep first, then main action, then cleanup)

### Examples of tasks that should have subtasks:
- "Cook dinner" → subtasks: ["Check recipe ingredients", "Buy missing ingredients", "Prep vegetables", "Cook main dish", "Set the table"]
- "Clean room" → subtasks: ["Pick up clothes", "Make bed", "Dust surfaces", "Vacuum floor", "Take out trash"]
- "Prepare presentation" → subtasks: ["Research topic", "Create outline", "Design slides", "Practice delivery"]

### When NOT to add subtasks:
- Simple, single-action tasks ("Call mom", "Send email")
- Quick errands ("Buy milk")
- Unless the user specifically asks for subtasks

### Adding subtasks to existing tasks:
- Use update_task action with the task_id
- Include the new subtasks array (this replaces existing subtasks)
- First get_tasks to find the task and see existing subtasks

## TASK TYPES (Important!)
Tasks are classified by their tags:

### Regular Tasks (tags: ["regular"])
- Normal tasks that can be completed anytime
- Default type if user doesn't specify
- Examples: "buy groceries", "call mom", "send email"

### Grounded Tasks (tags: ["grounded"])
- Focus sessions requiring deep concentration
- User cannot interact with their device during the task duration
- Task can ONLY be completed by doing an in-app focus session
- Use for: studying, deep work, meditation, focused reading, creative work
- Examples: "study for exam", "write report", "practice piano", "meditate"

**How to classify:**
- If user mentions: focus, concentrate, study, deep work, meditation, practice, no distractions → use ["grounded"]
- If it's a quick task, errand, or doesn't need focus time → use ["regular"]
- When unsure, ask the user: "Would you like this as a focus session (grounded) or a regular task?"

## Date/Time Formatting
- Dates: YYYY-MM-DD (e.g., ${localDate})
- Times: HH:MM (e.g., 09:00, 14:30, 20:00)
- "Morning" = 09:00, "Afternoon" = 14:00, "Evening" = 18:00, "Night" = 20:00

## Examples

**Example 1: Create with missing info - ASK for details**
User: "Add a meeting tomorrow"
→ First: get_tasks({ date: "${tomorrowDate}" }) to check schedule
→ Then respond: "Sure! I see you have [existing tasks]. What time would you like the meeting? And what's it about?"

**Example 2: Create with conflict - WARN and suggest**
User: "Schedule a call at 2pm tomorrow"
→ get_tasks({ date: "${tomorrowDate}" })
→ If 2pm is busy: "I noticed you have [task] at 2pm. Would 3pm or 4pm work instead?"

**Example 3: Create with full info - proceed**
User: "Add gym at 6am tomorrow for leg day workout"
→ get_tasks({ date: "${tomorrowDate}" }) to verify no conflict
→ propose_action({ action: "create_task", title: "Gym - Leg Day", date: "${tomorrowDate}", start_time: "06:00", description: "Leg day workout session at the gym", tags: ["regular"] })

**Example 4: Grounded task (focus session)**
User: "I need to study for my exam tomorrow morning"
→ get_tasks({ date: "${tomorrowDate}" }) to check schedule
→ propose_action({ action: "create_task", title: "Study for Exam", date: "${tomorrowDate}", start_time: "09:00", end_time: "11:00", description: "Focused study session for upcoming exam", tags: ["grounded"] })

**Example 5: Task with subtasks**
User: "Add a task to cook pasta for dinner tonight"
→ get_tasks({ date: "${localDate}" }) to check schedule
→ propose_action({ 
    action: "create_task", 
    title: "Cook Pasta Dinner", 
    date: "${localDate}", 
    start_time: "18:00",
    description: "Prepare a delicious pasta dinner",
    tags: ["regular"],
    subtasks: [
      { title: "Check pantry for ingredients" },
      { title: "Boil water for pasta" },
      { title: "Prepare sauce" },
      { title: "Cook pasta al dente" },
      { title: "Plate and serve" }
    ]
  })

**Example 6: Adding subtasks to existing task**
User: "Add some subtasks to my cleaning task"
→ get_tasks({ query: "cleaning" }) to find the task
→ propose_action({ 
    action: "update_task", 
    task_id: "[found task id]",
    subtasks: [
      { title: "Dust all surfaces" },
      { title: "Vacuum floors" },
      { title: "Clean windows" },
      { title: "Take out trash" }
    ]
  })

## 🚫 What NOT To Do
- ❌ Creating tasks without checking for conflicts first
- ❌ Creating tasks without a description
- ❌ Proposing tasks when missing time (ask the user!)
- ❌ Ignoring scheduling conflicts
- ❌ Inventing task IDs instead of using actual IDs from search results
- ❌ Forgetting to include tags (always specify ["regular"] or ["grounded"])
- ❌ Adding unnecessary subtasks to simple tasks
- ❌ Forgetting to suggest subtasks for complex multi-step tasks`;
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
        const {
          action,
          task_id,
          start_time,
          end_time,
          title,
          date,
          tags,
          subtasks,
          ...rest
        } = proposal;

        // Determine task type from tags (agent sends simple strings like "grounded")
        const isGrounded = (tags || []).includes("grounded");
        // Format tags as proper objects for frontend
        const formattedTags = [
          {
            type: isGrounded ? "grounded" : "regular",
            label: isGrounded ? "Grounded" : "Regular",
          },
        ];
        const taskTypeLabel = isGrounded ? " as a focus session" : "";

        // Format subtasks info for confirmation message
        const subtasksList = subtasks || [];
        const subtasksText =
          subtasksList.length > 0
            ? ` with ${subtasksList.length} subtask${
                subtasksList.length > 1 ? "s" : ""
              }: ${subtasksList.map((s: any) => s.title).join(", ")}`
            : "";

        let confirmationText = "I've prepared that for you. Please confirm.";
        if (action === "create_task") {
          confirmationText = `I'll create ${
            isGrounded ? "a focus session" : "a task"
          } "${title || "New task"}"${date ? ` for ${date}` : ""}${
            start_time ? ` at ${start_time}` : ""
          }${subtasksText}${
            isGrounded ? " (grounded - no device distractions)" : ""
          }. Please confirm.`;
        } else if (action === "update_task") {
          confirmationText = `I'll update the task${
            start_time ? ` to ${start_time}` : ""
          }${
            date ? ` on ${date}` : ""
          }${subtasksText}${taskTypeLabel}. Please confirm.`;
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
            tags: formattedTags,
            subtasks: subtasksList,
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

    // Destructure to separate camelCase fields from the rest
    const { startTime, endTime, ...restData } = data;

    // Build dbData with snake_case field names for database
    const dbData: any = {
      ...restData,
      start_time: startTime || data.start_time,
      end_time: endTime || data.end_time,
    };

    let result: any = null;
    let replyText = "Done.";

    if (action === "create_task") {
      const task = await TaskModel.create({ ...dbData, user_id: userId });
      result = task;
      replyText = `Created task: ${task.title}`;
    } else if (action === "update_task") {
      if (!dbData.id) throw new Error("Missing ID for update_task");
      const task = await TaskModel.update(dbData.id, dbData);
      result = task;
      replyText = `Updated task: ${task?.title}`;
    } else if (action === "delete_task") {
      if (!dbData.id) throw new Error("Missing ID for delete_task");
      await TaskModel.delete(dbData.id);
      replyText = "Task deleted.";
    } else if (action === "create_subtask") {
      if (!dbData.task_id)
        throw new Error("Missing parent task_id for create_subtask");
      const sub = await TaskModel.createSubtask(dbData.task_id, {
        title: dbData.subtask_title || "Subtask",
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
