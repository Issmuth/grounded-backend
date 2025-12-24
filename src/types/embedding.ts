export interface TaskEmbedding {
  id: string;
  task_id: string;
  user_id: string;
  embedding: number[];
  content: string;
  created_at: Date;
}

export interface SubtaskEmbedding {
  id: string;
  subtask_id: string;
  task_id: string;
  user_id: string;
  embedding: number[];
  content: string;
  created_at: Date;
}

export interface CreateTaskEmbeddingDto {
  task_id: string;
  user_id: string;
  embedding: number[];
  content: string;
}

export interface CreateSubtaskEmbeddingDto {
  subtask_id: string;
  task_id: string;
  user_id: string;
  embedding: number[];
  content: string;
}
