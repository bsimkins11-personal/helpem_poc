'use client';

import { Habit } from '@/types/habit';
import { LogHabitButton } from './LogHabitButton';

interface HabitCardProps {
  habit: Habit;
}

export function HabitCard({ habit }: HabitCardProps) {
  // Check if habit was completed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const completionsToday = habit.completions.filter((c) => {
    const cDate = new Date(c.date);
    cDate.setHours(0, 0, 0, 0);
    return cDate.getTime() === today.getTime();
  });

  const isCompletedToday = completionsToday.length > 0;

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    while (true) {
      const completionsOnDate = habit.completions.filter((c) => {
        const cDate = new Date(c.date);
        cDate.setHours(0, 0, 0, 0);
        return cDate.getTime() === checkDate.getTime();
      });

      if (completionsOnDate.length > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (checkDate.getTime() === today.getTime()) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }

      if (streak > 365) break;
    }

    return streak;
  };

  const streak = calculateStreak();

  return (
    <div className={`group relative p-3 rounded-xl border transition-all duration-200
                    ${isCompletedToday 
                      ? 'bg-brandGreenLight border-brandGreen/30' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
      <div className="flex items-start gap-3">
        <LogHabitButton habitId={habit.id} isCompletedToday={isCompletedToday} />

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-brandText text-sm">{habit.title}</h3>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brandGreenLight text-brandGreen">
              {habit.frequency}
            </span>

            {streak > 0 && (
              <span className="text-xs flex items-center gap-1 text-amber-600">
                🔥 {streak} day{streak !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
