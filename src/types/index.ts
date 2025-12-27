// User interface
export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  current_streak: number;
  longest_streak: number;
  last_streak_date?: string | null;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating a user
export interface CreateUserDto {
  firebase_uid: string;
  email: string;
  display_name: string;
}

// DTO for updating a user
export interface UpdateUserDto {
  email?: string;
  display_name?: string;
  // optional fields for administrative/streak updates
  current_streak?: number;
  longest_streak?: number;
  last_streak_date?: string | null;
}

// Export task types
export * from "./task";
export * from "./embedding";
export * from "./chat";
