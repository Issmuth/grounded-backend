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
      throw new AppError("Session not found", 404);
    }

    // Verify session belongs to user
    if (session.user_id !== userId) {
      throw new AppError("Unauthorized", 403);
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
      throw new AppError("Session not found", 404);
    }

    if (existingSession.user_id !== userId) {
      throw new AppError("Unauthorized", 403);
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
      throw new AppError("Session not found", 404);
    }

    if (existingSession.user_id !== userId) {
      throw new AppError("Unauthorized", 403);
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
    const { sessionId, message, history } = req.body;

    if (!sessionId || !message) {
      throw new AppError("Session ID and message are required", 400);
    }

    // Verify session belongs to user
    const session = await ChatSessionModel.findById(sessionId);
    if (!session) {
      throw new AppError("Session not found", 404);
    }

    if (session.user_id !== userId) {
      throw new AppError("Unauthorized", 403);
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
        text: aiResponseData.text || "I'm processing your request.",
        is_user: false,
      };

      // Handle confirmation requests
      if (aiResponseData.type === "confirmation_request") {
        aiMessageData.confirmation = JSON.stringify({
          action: aiResponseData.action,
          data: aiResponseData.data,
        });
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
      throw new AppError("Message ID and confirm status are required", 400);
    }

    // Update message confirmation
    const updatedMessage = await ChatSessionModel.updateMessage(messageId, {
      action,
      data,
      confirmed: confirm,
      cancelled: !confirm,
    });

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

      // Call existing AI confirm action function
      await aiConfirmAction(req, mockRes);

      if (!aiResponseData) {
        throw new Error("No confirmation response received");
      }

      // Add confirmation response message
      const confirmationResponse = await ChatSessionModel.addMessage({
        session_id: updatedMessage.session_id,
        text: aiResponseData.text || `Action confirmed and executed: ${action}`,
        is_user: false,
        tasks: aiResponseData.tasks
          ? JSON.stringify(aiResponseData.tasks)
          : null,
      });

      res.json({
        success: true,
        data: confirmationResponse,
      });
    } catch (aiError: any) {
      console.error("AI confirmation error:", aiError);

      // Determine user-friendly error message
      let errorText = "Failed to execute the action. Please try again.";

      if (aiError?.status === 429 || aiError?.message?.includes("rate limit")) {
        errorText =
          "Too many requests. Please wait a moment before confirming again.";
      } else if (aiError?.message?.includes("not found")) {
        errorText = "The task could not be found. It may have been deleted.";
      }

      // Add error message
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
