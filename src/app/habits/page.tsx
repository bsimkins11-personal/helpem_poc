'use client';

import { HabitCard } from '@/components/HabitCard';
import { useLife } from '@/state/LifeStore';

export default function HabitsPage() {
  const { habits } = useLife();

  // Calculate today's progress
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const habitsCompletedToday = habits.filter((habit) => {
    const completionsToday = habit.completions.filter((c) => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return cDate.getTime() === today.getTime();
    });
    return completionsToday.length > 0;
  }).length;

  const progressPercentage = habits.length > 0 
    ? Math.round((habitsCompletedToday / habits.length) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <span className="text-[#7AC943]">↻</span>
          Habits
        </h1>
        <p className="text-white/50">{habits.length} habits tracked</p>
      </div>

      {/* Today's Progress */}
      {habits.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-[#7AC943]/20 to-[#7AC943]/5 
                        rounded-xl border border-[#7AC943]/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[#7AC943]">Today&apos;s Progress</h3>
              <p className="text-sm text-white/50">
                {habitsCompletedToday} of {habits.length} habits completed
              </p>
            </div>
            <div className="text-3xl font-bold text-[#7AC943]">{progressPercentage}%</div>
          </div>
          
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7AC943] to-[#9AE063] rounded-full 
                         transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Habits List */}
      {habits.length > 0 ? (
        <div className="space-y-3">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-xl">
          <div className="text-4xl mb-4">↻</div>
          <p className="text-white/40 mb-2">No habits tracked yet</p>
          <p className="text-sm text-white/30">
            Try capturing &quot;Exercise daily&quot; or &quot;Meditate every morning&quot;
          </p>
        </div>
      )}
    </div>
  );
}
