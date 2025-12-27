import { query } from "../config/database";
import { User, CreateUserDto, UpdateUserDto } from "../types";
import { DatabaseError } from "../utils/errors";
import { TaskModel } from "./Task";

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

  // Adjusts the user's streak after a change to a specific date's tasks
  static async adjustStreakAfterDate(uid: string, date: string): Promise<User> {
    try {
      const user = await UserModel.findByFirebaseUid(uid);
      if (!user) throw new DatabaseError("User not found");

      // Debug logging to trace streak adjustment
      // eslint-disable-next-line no-console
      console.log(
        `[streak] adjustStreakAfterDate start: uid=${uid}, date=${date}, user.last_streak_date=${user.last_streak_date}, user.current_streak=${user.current_streak}`
      );

      const tasks = await TaskModel.findByUserIdAndDateRange(uid, date, date);
      if (tasks.length === 0) {
        // No tasks for this date; do not change streaks
        // eslint-disable-next-line no-console
        console.log(
          `[streak] no tasks for date=${date}, leaving streak unchanged`
        );
        return user;
      }

      const allCompleted = tasks.every((t) => t.is_completed);

      if (allCompleted) {
        // If already counted for this date, nothing to do
        if (user.last_streak_date === date) {
          // eslint-disable-next-line no-console
          console.log(`[streak] date already counted (${date}), no-op`);
          return user;
        }

        // Check if previous day was part of the streak
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const newCurrent =
          user.last_streak_date === yesterdayStr
            ? (user.current_streak || 0) + 1
            : 1;
        const newLongest = Math.max(user.longest_streak || 0, newCurrent);

        // eslint-disable-next-line no-console
        console.log(
          `[streak] marking date complete: date=${date}, yesterday=${yesterdayStr}, newCurrent=${newCurrent}, newLongest=${newLongest}`
        );

        const result = await query(
          `UPDATE users SET current_streak = $1, longest_streak = $2, last_streak_date = $3, updated_at = CURRENT_TIMESTAMP WHERE firebase_uid = $4 RETURNING *`,
          [newCurrent, newLongest, date, uid]
        );

        // eslint-disable-next-line no-console
        console.log(
          `[streak] updated user streak: ${JSON.stringify(result.rows[0])}`
        );

        return result.rows[0] as User;
      } else {
        // If the day was previously counted in last_streak_date, recompute streak backwards
        if (user.last_streak_date !== date) {
          // eslint-disable-next-line no-console
          console.log(
            `[streak] day incomplete and not part of streak (${date}), no-op`
          );
          return user;
        }

        let count = 0;
        let cursor = new Date(date);
        cursor.setDate(cursor.getDate() - 1);

        while (true) {
          const dstr = cursor.toISOString().split("T")[0];
          const dayTasks = await TaskModel.findByUserIdAndDateRange(
            uid,
            dstr,
            dstr
          );
          if (dayTasks.length === 0) break;
          const completed = dayTasks.every((x) => x.is_completed);
          if (!completed) break;
          count++;
          cursor.setDate(cursor.getDate() - 1);
        }

        let lastDateStr: string | null = null;
        if (count > 0) {
          const lastDate = new Date(date);
          lastDate.setDate(lastDate.getDate() - 1);
          lastDateStr = lastDate.toISOString().split("T")[0];
        }

        const newCurrent = count;
        const newLongest = Math.max(user.longest_streak || 0, newCurrent);

        // eslint-disable-next-line no-console
        console.log(
          `[streak] day became incomplete, recomputed current=${newCurrent}, lastDate=${lastDateStr}`
        );

        const result = await query(
          `UPDATE users SET current_streak = $1, longest_streak = $2, last_streak_date = $3, updated_at = CURRENT_TIMESTAMP WHERE firebase_uid = $4 RETURNING *`,
          [newCurrent, newLongest, lastDateStr, uid]
        );

        // eslint-disable-next-line no-console
        console.log(
          `[streak] updated user streak: ${JSON.stringify(result.rows[0])}`
        );

        return result.rows[0] as User;
      }
    } catch (error: any) {
      throw new DatabaseError(`Failed to adjust streak: ${error.message}`);
    }
  }
}
