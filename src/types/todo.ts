export type Priority = "low" | "medium" | "high";

export type Todo = {
  id: string;
  title: string;
  priority: Priority;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
};

export type CreateTodoInput = Omit<Todo, 'id' | 'createdAt' | 'completedAt'>;
