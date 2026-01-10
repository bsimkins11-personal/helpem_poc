export type Todo = {
  id: string;
  title: string;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
};

export type CreateTodoInput = Omit<Todo, 'id' | 'createdAt' | 'completedAt'>;
