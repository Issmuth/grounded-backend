// User interface
export interface User {
  id: number;
  firebase_uid: string;
  email: string;
  display_name: string;
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
}
