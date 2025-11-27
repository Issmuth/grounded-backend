import { query } from "../config/database";
import { User, CreateUserDto, UpdateUserDto } from "../types";
import { DatabaseError } from "../utils/errors";

export class UserModel {
  // Find user by Firebase UID
  static async findByFirebaseUid(uid: string): Promise<User | null> {
    try {
      const result = await query(
        "SELECT * FROM users WHERE firebase_uid = $1",
        [uid]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error: any) {
      throw new DatabaseError(`Failed to find user: ${error.message}`);
    }
  }

  // Create a new user
  static async create(userData: CreateUserDto): Promise<User> {
    try {
      const result = await query(
        `INSERT INTO users (firebase_uid, email, display_name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userData.firebase_uid, userData.email, userData.display_name]
      );

      return result.rows[0] as User;
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        throw new DatabaseError("User with this Firebase UID already exists");
      }
      throw new DatabaseError(`Failed to create user: ${error.message}`);
    }
  }

  // Create or update user (upsert)
  static async upsert(userData: CreateUserDto): Promise<User> {
    try {
      const result = await query(
        `INSERT INTO users (firebase_uid, email, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (firebase_uid)
         DO UPDATE SET
           email = EXCLUDED.email,
           display_name = EXCLUDED.display_name,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userData.firebase_uid, userData.email, userData.display_name]
      );

      return result.rows[0] as User;
    } catch (error: any) {
      throw new DatabaseError(`Failed to upsert user: ${error.message}`);
    }
  }

  // Update an existing user
  static async update(uid: string, userData: UpdateUserDto): Promise<User> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (userData.email !== undefined) {
        updates.push(`email = $${paramCount}`);
        values.push(userData.email);
        paramCount++;
      }

      if (userData.display_name !== undefined) {
        updates.push(`display_name = $${paramCount}`);
        values.push(userData.display_name);
        paramCount++;
      }

      // Always update the updated_at timestamp
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add firebase_uid as the last parameter
      values.push(uid);

      const result = await query(
        `UPDATE users
         SET ${updates.join(", ")}
         WHERE firebase_uid = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new DatabaseError("User not found");
      }

      return result.rows[0] as User;
    } catch (error: any) {
      throw new DatabaseError(`Failed to update user: ${error.message}`);
    }
  }
}
