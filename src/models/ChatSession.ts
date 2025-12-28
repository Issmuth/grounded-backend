import { query } from "../config/database";
import {
  ChatSession,
  ChatMessage,
  CreateChatSessionDto,
  UpdateChatSessionDto,
  CreateChatMessageDto,
  CreateRecentChatDto,
  ChatHistory,
} from "../types";
import { DatabaseError } from "../utils/errors";

export class ChatSessionModel {
  // Find all sessions for a user
  static async findByUserId(userId: string): Promise<ChatSession[]> {
    try {
      const result = await query(
        `SELECT * FROM chat_sessions 
         WHERE user_id = $1 
         ORDER BY updated_at DESC`,
        [userId]
      );

      return result.rows as ChatSession[];
    } catch (error: any) {
      throw new DatabaseError(`Failed to find chat sessions: ${error.message}`);
    }
  }

  // Find session by ID
  static async findById(id: string): Promise<ChatSession | null> {
    try {
      const result = await query("SELECT * FROM chat_sessions WHERE id = $1", [
        id,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as ChatSession;
    } catch (error: any) {
      throw new DatabaseError(`Failed to find chat session: ${error.message}`);
    }
  }

  // Find session with messages
  static async findByIdWithMessages(id: string): Promise<ChatSession | null> {
    try {
      const sessionResult = await query(
        "SELECT * FROM chat_sessions WHERE id = $1",
        [id]
      );

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const session = sessionResult.rows[0] as ChatSession;

      // Get messages for this session
      const messagesResult = await query(
        `SELECT * FROM chat_messages 
         WHERE session_id = $1 
         ORDER BY created_at ASC`,
        [id]
      );

      session.messages = messagesResult.rows as ChatMessage[];

      return session;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to find chat session with messages: ${error.message}`
      );
    }
  }

  // Get active session for user
  static async findActiveByUserId(userId: string): Promise<ChatSession | null> {
    try {
      const result = await query(
        "SELECT * FROM chat_sessions WHERE user_id = $1 AND is_active = true",
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as ChatSession;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to find active chat session: ${error.message}`
      );
    }
  }

  // Create new session
  static async create(sessionData: CreateChatSessionDto): Promise<ChatSession> {
    try {
      // First, set all other sessions for this user to inactive
      await query(
        "UPDATE chat_sessions SET is_active = false WHERE user_id = $1",
        [sessionData.user_id]
      );

      // Create new session
      const result = await query(
        `INSERT INTO chat_sessions (user_id, title, is_active)
         VALUES ($1, $2, true)
         RETURNING *`,
        [sessionData.user_id, sessionData.title || "New Chat"]
      );

      return result.rows[0] as ChatSession;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to create chat session: ${error.message}`
      );
    }
  }

  // Update session
  static async update(
    id: string,
    updates: UpdateChatSessionDto
  ): Promise<ChatSession> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramCount}`);
        values.push(updates.title);
        paramCount++;
      }

      if (updates.is_active !== undefined) {
        // If setting to active, deactivate all other sessions for this user
        if (updates.is_active) {
          const sessionResult = await query(
            "SELECT user_id FROM chat_sessions WHERE id = $1",
            [id]
          );

          if (sessionResult.rows.length > 0) {
            const userId = sessionResult.rows[0].user_id;
            await query(
              "UPDATE chat_sessions SET is_active = false WHERE user_id = $1",
              [userId]
            );
          }
        }

        updateFields.push(`is_active = $${paramCount}`);
        values.push(updates.is_active);
        paramCount++;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await query(
        `UPDATE chat_sessions 
         SET ${updateFields.join(", ")}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new DatabaseError("Chat session not found");
      }

      return result.rows[0] as ChatSession;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to update chat session: ${error.message}`
      );
    }
  }

  // Delete session
  static async delete(id: string): Promise<void> {
    try {
      const result = await query("DELETE FROM chat_sessions WHERE id = $1", [
        id,
      ]);

      if (result.rowCount === 0) {
        throw new DatabaseError("Chat session not found");
      }
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to delete chat session: ${error.message}`
      );
    }
  }

  // Add message to session
  static async addMessage(
    messageData: CreateChatMessageDto
  ): Promise<ChatMessage> {
    try {
      // Update session's updated_at timestamp
      await query(
        "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [messageData.session_id]
      );

      // Insert message
      const result = await query(
        `INSERT INTO chat_messages (session_id, text, is_user, confirmation, tasks)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          messageData.session_id,
          messageData.text,
          messageData.is_user,
          messageData.confirmation
            ? JSON.stringify(messageData.confirmation)
            : null,
          messageData.tasks ? JSON.stringify(messageData.tasks) : null,
        ]
      );

      return result.rows[0] as ChatMessage;
    } catch (error: any) {
      throw new DatabaseError(`Failed to add message: ${error.message}`);
    }
  }

  // Update message (for confirmations)
  static async updateMessage(
    id: string,
    confirmation: any
  ): Promise<ChatMessage> {
    try {
      const result = await query(
        `UPDATE chat_messages 
         SET confirmation = $1
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(confirmation), id]
      );

      if (result.rows.length === 0) {
        throw new DatabaseError("Message not found");
      }

      return result.rows[0] as ChatMessage;
    } catch (error: any) {
      throw new DatabaseError(`Failed to update message: ${error.message}`);
    }
  }

  // Get message by ID
  static async getMessageById(id: string): Promise<ChatMessage | null> {
    try {
      const result = await query(`SELECT * FROM chat_messages WHERE id = $1`, [
        id,
      ]);

      if (result.rows.length === 0) return null;
      return result.rows[0] as ChatMessage;
    } catch (error: any) {
      throw new DatabaseError(`Failed to get message: ${error.message}`);
    }
  }

  // Get recent chats for user
  static async getRecentChats(
    userId: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      const result = await query(
        `SELECT query FROM recent_chats 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map((row: any) => row.query);
    } catch (error: any) {
      throw new DatabaseError(`Failed to get recent chats: ${error.message}`);
    }
  }

  // Add to recent chats
  static async addRecentChat(chatData: CreateRecentChatDto): Promise<void> {
    try {
      // Use ON CONFLICT to update timestamp if query already exists
      await query(
        `INSERT INTO recent_chats (user_id, query)
         VALUES ($1, $2)
         ON CONFLICT (user_id, query)
         DO UPDATE SET created_at = CURRENT_TIMESTAMP`,
        [chatData.user_id, chatData.query]
      );

      // Keep only the 10 most recent chats per user
      await query(
        `DELETE FROM recent_chats 
         WHERE user_id = $1 
         AND id NOT IN (
           SELECT id FROM recent_chats 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT 10
         )`,
        [chatData.user_id]
      );
    } catch (error: any) {
      throw new DatabaseError(`Failed to add recent chat: ${error.message}`);
    }
  }

  // Get chat history (sessions + recent chats)
  static async getChatHistory(userId: string): Promise<ChatHistory> {
    try {
      const [sessions, recentChats] = await Promise.all([
        this.findByUserId(userId),
        this.getRecentChats(userId),
      ]);

      return {
        sessions,
        recentChats,
      };
    } catch (error: any) {
      throw new DatabaseError(`Failed to get chat history: ${error.message}`);
    }
  }

  // Auto-generate title from first user message
  static async updateTitleFromMessage(
    sessionId: string,
    message: string
  ): Promise<void> {
    try {
      // Only update if current title is "New Chat"
      const session = await this.findById(sessionId);
      if (session && session.title === "New Chat") {
        const title =
          message.length > 30 ? `${message.substring(0, 30)}...` : message;
        await this.update(sessionId, { title });
      }
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to update session title: ${error.message}`
      );
    }
  }
}
