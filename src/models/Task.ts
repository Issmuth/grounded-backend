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
    // Sanitize and normalize inputs to satisfy NOT NULL DB constraints
    const userId = task.user_id;
    const title = task.title ?? null;
    const description = task.description ?? null;
    let start_time_raw = task.start_time ?? null;
    let end_time_raw = task.end_time ?? null;
    let date_raw = task.date ?? null;
    const tags = task.tags ?? [];
    const recurrence = task.recurrence ?? {};
    const is_completed = typeof task.is_completed === "boolean" ? task.is_completed : false;
    const is_deleted = typeof task.is_deleted === "boolean" ? task.is_deleted : false;

    // Helper: extract date (YYYY-MM-DD) and time (HH:MM:SS) from ISO datetime strings
    const extractDateTime = (val: any) => {
      if (!val || typeof val !== "string") return { date: null, time: null };
      // If looks like ISO datetime
      if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
        try {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const hh = String(d.getHours()).padStart(2, "0");
            const min = String(d.getMinutes()).padStart(2, "0");
            const ss = String(d.getSeconds()).padStart(2, "0");
            return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}:${ss}` };
          }
        } catch (e) {
          return { date: null, time: null };
        }
      }
      // If looks like date only
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return { date: val, time: null };
      // If looks like time (HH:MM or HH:MM:SS)
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(val)) {
        // normalize to HH:MM:SS
        const parts = val.split(":");
        const hh = String(parts[0]).padStart(2, "0");
        const mm = String(parts[1] || "0").padStart(2, "0");
        const ss = String(parts[2] || "0").padStart(2, "0");
        return { date: null, time: `${hh}:${mm}:${ss}` };
      }
      return { date: null, time: null };
    };

    // If start_time or end_time are ISO datetimes, extract date/time
    if (start_time_raw) {
      const ex = extractDateTime(start_time_raw);
      if (ex.date && !date_raw) date_raw = ex.date;
      if (ex.time) start_time_raw = ex.time;
    }
    if (end_time_raw) {
      const ex = extractDateTime(end_time_raw);
      if (ex.date && !date_raw) date_raw = ex.date;
      if (ex.time) end_time_raw = ex.time;
    }

    // If only one of start/end is provided, compute a 1-hour default duration
    const toDate = (timeStr: string) => {
      // timeStr expected HH:MM:SS
      const parts = timeStr.split(":");
      const now = new Date();
      now.setHours(Number(parts[0] || 0), Number(parts[1] || 0), Number(parts[2] || 0), 0);
      return now;
    };

    if (!start_time_raw && end_time_raw) {
      // set start = end - 1 hour
      try {
        const dt = toDate(end_time_raw);
        dt.setHours(dt.getHours() - 1);
        start_time_raw = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}:${String(dt.getSeconds()).padStart(2, "0")}`;
      } catch (e) {
        start_time_raw = "09:00:00";
      }
    }

    if (start_time_raw && !end_time_raw) {
      try {
        const dt = toDate(start_time_raw);
        dt.setHours(dt.getHours() + 1);
        end_time_raw = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}:${String(dt.getSeconds()).padStart(2, "0")}`;
      } catch (e) {
        end_time_raw = "10:00:00";
      }
    }

    // If neither provided, use sensible defaults
    if (!start_time_raw && !end_time_raw) {
      start_time_raw = "09:00:00";
      end_time_raw = "10:00:00";
    }

    const start_time = start_time_raw;
    const end_time = end_time_raw;
    const date = date_raw ?? new Date().toISOString().split("T")[0];

    const [newTask] = await sql<Task[]>`
      INSERT INTO tasks (
        user_id, title, description, start_time, end_time, date, 
        tags, recurrence, is_completed, is_deleted
      ) VALUES (
        ${userId}, ${title}, ${description}, 
        ${start_time}, ${end_time}, ${date}, 
        ${sql.json(tags)}, ${sql.json(recurrence)}, 
        ${is_completed}, ${is_deleted}
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
    const title = subtask.title ?? null;
    const is_completed = typeof subtask.is_completed === "boolean" ? subtask.is_completed : false;
    const order_index = typeof subtask.order_index === "number" ? subtask.order_index : 0;

    const [newSubtask] = await sql<Subtask[]>`
      INSERT INTO subtasks (
        task_id, title, is_completed, order_index
      ) VALUES (
        ${taskId}, ${title}, ${is_completed}, ${order_index}
      )
      RETURNING *
    `;
    return newSubtask;
  }

  static async updateSubtask(
    id: string,
    updates: Partial<Subtask>
  ): Promise<Subtask | null> {
    const title = updates.title !== undefined ? updates.title : null;
    const is_completed = updates.is_completed !== undefined ? updates.is_completed : null;
    const order_index = updates.order_index !== undefined ? updates.order_index : null;

    const [updatedSubtask] = await sql<Subtask[]>`
      UPDATE subtasks SET
        title = COALESCE(${title}, title),
        is_completed = COALESCE(${is_completed}, is_completed),
        order_index = COALESCE(${order_index}, order_index),
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
