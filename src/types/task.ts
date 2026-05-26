export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
  due_date: string | null;
  priority: Priority;
  completed_at?: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority: Priority;
  due_date?: string | null;
}

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  is_completed?: boolean;
  completed_at?: string | null;
};
