'use client';

import { Todo } from '@/types/todo';
import { CompleteTodoButton } from './CompleteTodoButton';

interface TodoCardProps {
  todo: Todo;
}

export function TodoCard({ todo }: TodoCardProps) {
  const isCompleted = !!todo.completedAt;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={`group relative p-4 bg-white/5 border border-white/10 rounded-xl 
                  hover:bg-white/8 transition-all duration-200
                  ${isCompleted ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <CompleteTodoButton todoId={todo.id} completed={isCompleted} />

        <div className="flex-1 min-w-0">
          <h3
            className={`font-medium text-white ${
              isCompleted ? 'line-through opacity-60' : ''
            }`}
          >
            {todo.title}
          </h3>

          {todo.dueDate && (
            <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <span>📅</span>
                {formatDate(todo.dueDate)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
