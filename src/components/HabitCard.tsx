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
        // Today hasn't been completed yet, that's okay
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }

      // Safety limit
      if (streak > 365) break;
    }

    return streak;
  };

  const streak = calculateStreak();

  return (
    <div className="group relative p-4 bg-white/5 border border-white/10 rounded-xl 
                    hover:bg-white/8 transition-all duration-200">
      <div className="flex items-start gap-3">
        <LogHabitButton habitId={habit.id} isCompletedToday={isCompletedToday} />

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white">{habit.title}</h3>

          <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
            <span className="px-2 py-0.5 rounded-full bg-[#7AC943]/20 text-[#7AC943]">
              {habit.frequency}
            </span>

            {streak > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <span>🔥</span>
                {streak} day streak
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
