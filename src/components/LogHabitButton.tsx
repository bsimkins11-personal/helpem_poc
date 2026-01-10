'use client';

import { useLife } from '@/state/LifeStore';

interface LogHabitButtonProps {
  habitId: string;
  isCompletedToday: boolean;
}

export function LogHabitButton({ habitId, isCompletedToday }: LogHabitButtonProps) {
  const { logHabit } = useLife();

  const handleClick = () => {
    logHabit(habitId);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex-shrink-0 w-10 h-10 rounded-xl transition-all duration-200
                  flex items-center justify-center text-lg
                  ${
                    isCompletedToday
                      ? 'bg-[#7AC943] text-white'
                      : 'border-2 border-[#7AC943]/50 hover:bg-[#7AC943]/10 hover:scale-105'
                  }`}
      aria-label={isCompletedToday ? 'Log again' : 'Log habit'}
    >
      {isCompletedToday ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="text-[#7AC943]">+</span>
      )}
    </button>
  );
}
