'use client';

import { Todo } from '@/types/todo';
import { CompleteTodoButton } from './CompleteTodoButton';

interface TodoCardProps {
  todo: Todo;
}

const priorityConfig = {
  high: {
    label: "High",
    color: "bg-red-50 text-red-600",
    border: "border-l-red-500",
  },
  medium: {
    label: "Medium", 
    color: "bg-amber-50 text-amber-600",
    border: "border-l-amber-500",
  },
  low: {
    label: "Low",
    color: "bg-green-50 text-green-600",
    border: "border-l-green-500",
  },
};

export function TodoCard({ todo }: TodoCardProps) {
  const isCompleted = !!todo.completedAt;
  const config = priorityConfig[todo.priority];

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !isCompleted;

  return (
    <div
      className={`group relative p-3 bg-gray-50 border border-gray-200 rounded-xl 
                  border-l-4 ${config.border}
                  hover:bg-gray-100 transition-all duration-200
                  ${isCompleted ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <CompleteTodoButton todoId={todo.id} completed={isCompleted} />

        <div className="flex-1 min-w-0">
          <h3
            className={`font-medium text-brandText text-sm ${
              isCompleted ? 'line-through opacity-60' : ''
            }`}
          >
            {todo.title}
          </h3>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
              {config.label}
            </span>
            
            {todo.dueDate && (
              <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-brandTextLight'}`}>
                📅 {formatDate(todo.dueDate)}
                {isOverdue && " (overdue)"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
