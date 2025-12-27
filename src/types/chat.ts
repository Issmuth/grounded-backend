import { Task } from "./task";

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  session_id: string;
  text: string;
  is_user: boolean;
  confirmation?: {
    action: string;
    data: any;
    confirmed?: boolean;
    cancelled?: boolean;
  };
  tasks?: Task[];
  created_at: Date;
}

export interface RecentChat {
  id: string;
  user_id: string;
  query: string;
  created_at: Date;
}

export interface CreateChatSessionDto {
  user_id: string;
  title?: string;
}

export interface UpdateChatSessionDto {
  title?: string;
  is_active?: boolean;
}

export interface CreateChatMessageDto {
  session_id: string;
  text: string;
  is_user: boolean;
  confirmation?: {
    action: string;
    data: any;
    confirmed?: boolean;
    cancelled?: boolean;
  };
  tasks?: Task[];
}

export interface CreateRecentChatDto {
  user_id: string;
  query: string;
}

export interface ChatHistory {
  sessions: ChatSession[];
  recentChats: string[];
}
