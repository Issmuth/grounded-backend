import { sql } from "../config/database";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  date: string;
  tags: any[];
  recurrence: any;
  is_completed: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export class TaskModel {
  static async create(
    task: Partial<Task> & { user_id: string }
  ): Promise<Task> {
    const [newTask] = await sql<Task[]>`
      INSERT INTO tasks (
        user_id, title, description, start_time, end_time, date, 
        tags, recurrence, is_completed, is_deleted
      ) VALUES (
        ${task.user_id}, ${task.title}, ${task.description || null}, 
        ${task.start_time}, ${task.end_time}, ${task.date}, 
        ${sql.json(task.tags || [])}, ${sql.json(task.recurrence || {})}, 
        ${task.is_completed || false}, ${task.is_deleted || false}
      )
      RETURNING *
    `;

    if (task.subtasks && task.subtasks.length > 0) {
      for (const st of task.subtasks) {
        await this.createSubtask(newTask.id, st);
      }
    }

    return this.findById(newTask.id) as Promise<Task>;
  }

  static async findById(id: string): Promise<Task | null> {
    const [task] = await sql<Task[]>`
      SELECT * FROM tasks WHERE id = ${id} AND is_deleted = false
    `;

    if (!task) return null;

    const subtasks = await sql<Subtask[]>`
      SELECT * FROM subtasks WHERE task_id = ${id} ORDER BY order_index ASC
    `;

    return { ...task, subtasks };
  }

  static async findByUserId(userId: string): Promise<Task[]> {
    const tasks = await sql<Task[]>`
      SELECT * FROM tasks 
      WHERE user_id = ${userId} AND is_deleted = false 
      ORDER BY date ASC, start_time ASC
    `;

    for (const task of tasks) {
      task.subtasks = await sql<Subtask[]>`
        SELECT * FROM subtasks WHERE task_id = ${task.id} ORDER BY order_index ASC
      `;
    }

    return tasks;
  }

  static async findByUserIdAndDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Task[]> {
    const tasks = await sql<Task[]>`
      SELECT * FROM tasks 
      WHERE user_id = ${userId} 
      AND date >= ${startDate} AND date <= ${endDate}
      AND is_deleted = false 
      ORDER BY date ASC, start_time ASC
    `;

    for (const task of tasks) {
      task.subtasks = await sql<Subtask[]>`
        SELECT * FROM subtasks WHERE task_id = ${task.id} ORDER BY order_index ASC
      `;
    }

    return tasks;
  }

  static async update(
    id: string,
    updates: Partial<Task>
  ): Promise<Task | null> {
    const updateData: any = { ...updates };

    // Remove fields that shouldn't be updated or are handled separately
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;
    delete updateData.subtasks;

    // Handle JSON fields
    if (updateData.tags) updateData.tags = sql.json(updateData.tags);
    if (updateData.recurrence)
      updateData.recurrence = sql.json(updateData.recurrence);

    updateData.updated_at = new Date();

    // Check if there is anything to update
    if (Object.keys(updateData).length > 0) {
      await sql`
        UPDATE tasks SET ${sql(updateData)}
        WHERE id = ${id}
      `;
    }

    if (updates.subtasks) {
      // This is a full replacement of subtasks for the task if provided
      await sql`DELETE FROM subtasks WHERE task_id = ${id}`;
      for (const st of updates.subtasks) {
        await this.createSubtask(id, st);
      }
    }

    return this.findById(id);
  }

  static async delete(id: string): Promise<void> {
    // Soft delete
    await sql`
      UPDATE tasks SET is_deleted = true, updated_at = NOW() WHERE id = ${id}
    `;
  }

  // Subtask methods
  static async createSubtask(
    taskId: string,
    subtask: Partial<Subtask>
  ): Promise<Subtask> {
    const [newSubtask] = await sql<Subtask[]>`
      INSERT INTO subtasks (
        task_id, title, is_completed, order_index
      ) VALUES (
        ${taskId}, ${subtask.title}, ${subtask.is_completed || false}, ${
      subtask.order_index || 0
    }
      )
      RETURNING *
    `;
    return newSubtask;
  }

  static async updateSubtask(
    id: string,
    updates: Partial<Subtask>
  ): Promise<Subtask | null> {
    const [updatedSubtask] = await sql<Subtask[]>`
      UPDATE subtasks SET
        title = COALESCE(${updates.title}, title),
        is_completed = COALESCE(${updates.is_completed}, is_completed),
        order_index = COALESCE(${updates.order_index}, order_index),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return updatedSubtask || null;
  }

  static async deleteSubtask(id: string): Promise<void> {
    await sql`DELETE FROM subtasks WHERE id = ${id}`;
  }

  static async sync(
    userId: string,
    tasks: any[]
  ): Promise<{
    created: Task[];
    updated: Task[];
    deleted: any[];
    errors: any[];
  }> {
    const result = {
      created: [] as Task[],
      updated: [] as Task[],
      deleted: [] as any[],
      errors: [] as any[],
    };

    for (const task of tasks) {
      try {
        if (task.is_deleted) {
          if (task.id) {
            await this.delete(task.id);
            result.deleted.push({ id: task.id });
          }
        } else if (task.id) {
          // Try to update, if not found (and it's a UUID provided by client?), maybe create?
          // But usually client sends ID only if it knows it exists or if we support client-generated IDs.
          // The frontend TaskAPI sends ID if it has serverId.
          const existing = await this.findById(task.id);
          if (existing) {
            const updated = await this.update(task.id, {
              ...task,
              user_id: userId,
            });
            if (updated) result.updated.push(updated);
          } else {
            // If ID is provided but not found, treat as create if we want to accept client IDs?
            // Or just create new.
            // For now, let's assume if ID is sent it should exist.
            // Actually, if we want to support offline creation with UUIDs generated on client, we should allow inserting with ID.
            // But our create method generates ID.
            // Let's stick to standard flow: if ID exists, update. If not, create.
            // If client sends ID but it's not in DB, it might be a sync issue.
            // Let's treat it as create but ignore the ID (let DB generate new one) OR use the ID if it's a valid UUID.
            // Postgres `gen_random_uuid()` is default, but we can override.

            // For this implementation, let's just create a new one if not found, ignoring the ID to avoid conflicts,
            // UNLESS we want to strictly sync.
            // The frontend expects the new ID back.
            const created = await this.create({ ...task, user_id: userId });
            result.created.push(created);
          }
        } else {
          const created = await this.create({ ...task, user_id: userId });
          result.created.push(created);
        }
      } catch (e: any) {
        result.errors.push({ task, error: e.message });
      }
    }
    return result;
  }
}
