'use client';

import { useLife } from '@/state/LifeStore';

interface CompleteTodoButtonProps {
  todoId: string;
  completed: boolean;
}

export function CompleteTodoButton({ todoId, completed }: CompleteTodoButtonProps) {
  const { completeTodo } = useLife();

  const handleClick = () => {
    if (!completed) {
      completeTodo(todoId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={completed}
      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all duration-200
                  flex items-center justify-center
                  ${
                    completed
                      ? 'bg-[#7AC943] border-[#7AC943] text-white'
                      : 'border-white/30 hover:border-[#7AC943] hover:bg-[#7AC943]/10'
                  }`}
      aria-label={completed ? 'Completed' : 'Mark as complete'}
    >
      {completed && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
