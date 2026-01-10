'use client';

import { useState } from 'react';
import { Todo, Priority } from '@/types/todo';
import { CompleteTodoButton } from './CompleteTodoButton';
import { useLife } from '@/state/LifeStore';

interface TodoCardProps {
  todo: Todo;
}

const priorityConfig = {
  high: {
    label: "High",
    color: "bg-red-50 text-red-600",
    activeColor: "bg-red-500 text-white",
    border: "border-l-red-500",
  },
  medium: {
    label: "Medium", 
    color: "bg-amber-50 text-amber-600",
    activeColor: "bg-amber-500 text-white",
    border: "border-l-amber-500",
  },
  low: {
    label: "Low",
    color: "bg-green-50 text-green-600",
    activeColor: "bg-green-500 text-white",
    border: "border-l-green-500",
  },
};

export function TodoCard({ todo }: TodoCardProps) {
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const { updateTodoPriority } = useLife();
  
  const isCompleted = !!todo.completedAt;
  const config = priorityConfig[todo.priority];

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !isCompleted;

  const handlePriorityChange = (priority: Priority) => {
    updateTodoPriority(todo.id, priority);
    setShowPriorityPicker(false);
  };

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
            {/* Priority badge - clickable to change */}
            <button
              onClick={() => !isCompleted && setShowPriorityPicker(!showPriorityPicker)}
              disabled={isCompleted}
              className={`text-xs px-2 py-0.5 rounded-full transition-all ${config.color} 
                         ${!isCompleted ? 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 cursor-pointer' : 'cursor-default'}`}
            >
              {config.label}
            </button>
            
            {todo.dueDate && (
              <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-brandTextLight'}`}>
                📅 {formatDate(todo.dueDate)}
                {isOverdue && " (overdue)"}
              </span>
            )}
          </div>

          {/* Priority picker dropdown */}
          {showPriorityPicker && !isCompleted && (
            <div className="mt-2 flex gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              {(["high", "medium", "low"] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                    ${todo.priority === p 
                      ? priorityConfig[p].activeColor 
                      : `${priorityConfig[p].color} hover:opacity-80`}`}
                >
                  {priorityConfig[p].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
