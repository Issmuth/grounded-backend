import { Request, Response, NextFunction } from "express";
import { ChatSessionModel } from "../models/ChatSession";
import { AppError } from "../utils/errors";
import {
  chat as aiChat,
  confirmAction as aiConfirmAction,
} from "./aiController";

// Get chat history for user
export const getChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const history = await ChatSessionModel.getChatHistory(userId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

// Get all sessions for user
export const getSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const sessions = await ChatSessionModel.findByUserId(userId);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

// Get session by ID with messages
export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.uid;

    const session = await ChatSessionModel.findByIdWithMessages(id);

    if (!session) {
      throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
    }

    // Verify session belongs to user
    if (session.user_id !== userId) {
      throw new AppError("Unauthorized", 403, "UNAUTHORIZED");
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// Create new session
export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { title } = req.body;

    const session = await ChatSessionModel.create({
      user_id: userId,
      title,
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// Update session
export const updateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.uid;
    const updates = req.body;

    // Verify session belongs to user
    const existingSession = await ChatSessionModel.findById(id);
    if (!existingSession) {
      throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
    }

    if (existingSession.user_id !== userId) {
      throw new AppError("Unauthorized", 403, "UNAUTHORIZED");
    }

    const session = await ChatSessionModel.update(id, updates);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// Delete session
export const deleteSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.uid;

    // Verify session belongs to user
    const existingSession = await ChatSessionModel.findById(id);
    if (!existingSession) {
      throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
    }

    if (existingSession.user_id !== userId) {
      throw new AppError("Unauthorized", 403, "UNAUTHORIZED");
    }

    await ChatSessionModel.delete(id);

    res.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get or create active session
export const getOrCreateActiveSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;

    let activeSession = await ChatSessionModel.findActiveByUserId(userId);

    if (!activeSession) {
      activeSession = await ChatSessionModel.create({
        user_id: userId,
        title: "New Chat",
      });
    }

    res.json({
      success: true,
      data: activeSession,
    });
  } catch (error) {
    next(error);
  }
};

// Send message
export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      throw new AppError(
        "Session ID and message are required",
        400,
        "INVALID_REQUEST"
      );
    }

    // Verify session belongs to user
    const session = await ChatSessionModel.findById(sessionId);
    if (!session) {
      throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
    }

    if (session.user_id !== userId) {
      throw new AppError("Unauthorized", 403, "UNAUTHORIZED");
    }

    // Add user message
    const userMessage = await ChatSessionModel.addMessage({
      session_id: sessionId,
      text: message,
      is_user: true,
    });

    // Update session title if it's still "New Chat"
    await ChatSessionModel.updateTitleFromMessage(sessionId, message);

    // Add to recent chats
    await ChatSessionModel.addRecentChat({
      user_id: userId,
      query: message,
    });

    // Attach session message history to the request so AI has context
    try {
      const sessionWithMessages = await ChatSessionModel.findByIdWithMessages(
        sessionId
      );
      req.body = {
        ...(req.body || {}),
        history: (sessionWithMessages?.messages || []).map((m: any) => {
          let text = m.text;
          if (m.tasks) {
            try {
              const tasks = typeof m.tasks === 'string' ? JSON.parse(m.tasks) : m.tasks;
              if (Array.isArray(tasks) && tasks.length > 0) {
                 const taskContext = tasks.map((t: any) => JSON.stringify({id: t.id, title: t.title, date: t.date || t.start_time})).join('; ');
                 text += `\n[System Note: The user saw these tasks: ${taskContext}]`;
              }
            } catch (e) {
              // ignore
            }
          }
          return {
            isUser: m.is_user ?? m.isUser ?? false,
            text: text,
          };
        }),
      };
    } catch (e) {
      // non-fatal - AI will still run without history
      console.warn("Failed to append session history to request:", e);
    }

    // Get AI response using existing AI controller logic
    try {
      // Create a mock response object to capture AI response
      let aiResponseData: any = null;
      const mockRes = {
        json: (data: any) => {
          aiResponseData = data;
        },
        status: () => mockRes,
      } as any;

      // Call existing AI chat function
      await aiChat(req, mockRes);

      if (!aiResponseData) {
        throw new Error("No AI response received");
      }

      // Create AI message based on response type
      let aiMessageData: any = {
        session_id: sessionId,
        text: undefined,
        is_user: false,
      };

      // Prefer explicit AI text when provided, but be defensive when it's missing
      const aiText = aiResponseData?.text?.toString().trim();
      if (aiText) {
        aiMessageData.text = aiText;
      } else if (aiResponseData?.type === "confirmation_request") {
        aiMessageData.text = "I've prepared that for you. Does this look right?";
      } else if (Array.isArray(aiResponseData?.tasks) && aiResponseData.tasks.length > 0) {
        // Build a concise list of found tasks for the user to see
        const list = (aiResponseData.tasks || [])
          .slice(0, 5)
          .map((t: any, i: number) => {
            const title = t.title || t.name || "Untitled";
            const date = t.date || t.start_time || null;
            return `${i + 1}. ${title}${date ? ` — ${date}` : ""}`;
          })
          .join("\n");

        aiMessageData.text = `I found ${aiResponseData.tasks.length} task(s) related to your request:\n${list}\n\nReply with the number to pick one, or say 'none' to cancel.`;

        // Also attach the full tasks so the frontend can render cards
        aiMessageData.tasks = JSON.stringify(aiResponseData.tasks);
      } else {
        // Avoid generic placeholders like "I'm processing your request." which are unhelpful
        const fallbackError = "Sorry, I couldn't generate a response right now. Please try again.";
        aiMessageData.text = fallbackError;
        console.warn("AI returned empty text for sendMessage; response object:", aiResponseData);
      }

      // Handle confirmation requests - store as raw object so the model's confirmation
      // can be JSON.stringified once by the repository layer (avoid double-encoding)
      if (aiResponseData.type === "confirmation_request") {
        aiMessageData.confirmation = {
          action: aiResponseData.action,
          data: aiResponseData.data,
        };
      }

      // Handle tasks in response
      if (aiResponseData.tasks) {
        aiMessageData.tasks = JSON.stringify(aiResponseData.tasks);
      }

      const aiResponse = await ChatSessionModel.addMessage(aiMessageData);

      res.json({
        success: true,
        data: {
          userMessage,
          aiResponse,
        },
      });
    } catch (aiError: any) {
      console.error("AI service error:", aiError);

      // Determine user-friendly error message based on error type
      let errorText =
        "Sorry, I encountered an error processing your request. Please try again.";

      if (aiError?.status === 429 || aiError?.message?.includes("rate limit")) {
        errorText =
          "I'm receiving too many requests right now. Please wait a moment and try again.";
      } else if (
        aiError?.status === 503 ||
        aiError?.message?.includes("unavailable")
      ) {
        errorText =
          "The AI service is temporarily unavailable. Please try again in a few minutes.";
      } else if (aiError?.message?.includes("timeout")) {
        errorText =
          "The request took too long to process. Please try again with a simpler request.";
      }

      // Add error message
      const errorResponse = await ChatSessionModel.addMessage({
        session_id: sessionId,
        text: errorText,
        is_user: false,
      });

      res.json({
        success: true,
        data: {
          userMessage,
          aiResponse: errorResponse,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// Confirm action
export const confirmAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { messageId, confirm, action, data } = req.body;

    if (!messageId || confirm === undefined) {
      throw new AppError(
        "Message ID and confirm status are required",
        400,
        "INVALID_REQUEST"
      );
    }

    // Read the existing message so we can preserve any action/data the AI originally attached
    const existingMessage = await ChatSessionModel.getMessageById(messageId);
    if (!existingMessage) {
      throw new AppError("Message not found", 404, "MESSAGE_NOT_FOUND");
    }

    // Try to parse stored confirmation (if any). Be resilient to single or double-stringified values.
    let storedConfirmation: any = null;
    if (existingMessage.confirmation) {
      try {
        storedConfirmation =
          typeof existingMessage.confirmation === "string"
            ? JSON.parse(existingMessage.confirmation)
            : existingMessage.confirmation;

        // If it was double-encoded (a string that contains JSON), parse again
        if (typeof storedConfirmation === "string") {
          try {
            storedConfirmation = JSON.parse(storedConfirmation);
          } catch (e) {
            // ignore, keep the string
          }
        }
      } catch (e) {
        console.warn("Failed to parse stored confirmation on message:", e);
        storedConfirmation = null;
      }
    }

    // Resolve the action/data to use for this confirmation - prefer request body, fall back to stored confirmation
    let resolvedAction = action ?? storedConfirmation?.action ?? null;
    let resolvedData = data ?? storedConfirmation?.data ?? null;

    // If the action targets an existing task, we expect the ID to be present from the tool call.
    // We no longer do heuristic resolution here because the AI agent is responsible for finding the ID via tools.
    
    // Update message confirmation with merged/validated data
    const updatedMessage = await ChatSessionModel.updateMessage(messageId, {
      action: resolvedAction,
      data: resolvedData,
      confirmed: confirm,
      cancelled: !confirm,
    });

    // Ensure the session belongs to the requesting user
    const owningSession = await ChatSessionModel.findById(
      updatedMessage.session_id
    );
    if (!owningSession || owningSession.user_id !== userId) {
      throw new AppError("Unauthorized", 403, "UNAUTHORIZED");
    }

    if (!confirm) {
      res.json({
        success: true,
        data: updatedMessage,
      });
      return;
    }
    
    // Execute the confirmed action using existing AI service
    try {
      let aiResponseData: any = null;
      const mockRes = {
        json: (data: any) => {
          aiResponseData = data;
        },
        status: () => mockRes,
      } as any;

      // Ensure we pass the confirmed action/data to the handler
      req.body = {
        ...req.body,
        action: resolvedAction,
        data: resolvedData,
      };

      console.debug("Calling aiConfirmAction with", {
        action: resolvedAction,
        data: resolvedData,
      });

      // Call AI confirm action function (now just DB execution)
      await aiConfirmAction(req, mockRes);

      if (!aiResponseData) {
        throw new Error("No confirmation response received");
      }

      // Add confirmation response message
      const fallbackText = aiResponseData?.text || "Action confirmed.";

      const confirmationResponse = await ChatSessionModel.addMessage({
        session_id: updatedMessage.session_id,
        text: fallbackText,
        is_user: false,
        tasks: Array.isArray(aiResponseData?.data) // if it returns tasks array
          ? aiResponseData.data
          : undefined,
      });

      res.json({
        success: true,
        data: confirmationResponse,
        tasks: Array.isArray(aiResponseData?.data)
          ? aiResponseData.data
          : null,
        action: resolvedAction ?? null,
      });
    } catch (aiError: any) {
      console.error("AI confirmation error:", aiError);
      const errorText = "Failed to execute the action. Please try again.";
      
      const errorResponse = await ChatSessionModel.addMessage({
          session_id: updatedMessage.session_id,
          text: errorText,
          is_user: false,
        });

        res.json({
          success: true,
          data: errorResponse,
        });
    }
  } catch (error) {
    next(error);
  }
};

// Get recent chats
export const getRecentChats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const recentChats = await ChatSessionModel.getRecentChats(userId);

    res.json({
      success: true,
      data: recentChats,
    });
  } catch (error) {
    next(error);
  }
};
