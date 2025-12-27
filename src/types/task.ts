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

export interface CreateTaskDto {
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  date: string;
  tags?: any[];
  recurrence?: any;
  is_completed?: boolean;
  subtasks?: CreateSubtaskDto[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  date?: string;
  tags?: any[];
  recurrence?: any;
  is_completed?: boolean;
  is_deleted?: boolean;
}

export interface CreateSubtaskDto {
  title: string;
  is_completed?: boolean;
  order_index?: number;
}

export interface UpdateSubtaskDto {
  title?: string;
  is_completed?: boolean;
  order_index?: number;
}
