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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-brandGreenLight flex items-center justify-center text-brandGreen text-xl">↻</span>
          <h1 className="text-2xl font-bold text-brandText">Habits</h1>
        </div>
        <p className="text-brandTextLight">{habits.length} habits tracked</p>
      </div>

      {/* Today's Progress */}
      {habits.length > 0 && (
        <div className="bg-gradient-to-r from-brandGreen to-emerald-400 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Today&apos;s Progress</h3>
              <p className="text-white/80">
                {habitsCompletedToday} of {habits.length} habits completed
              </p>
            </div>
            <div className="text-4xl font-bold">{progressPercentage}%</div>
          </div>
          
          <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Habits List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {habits.length > 0 ? (
          <div className="space-y-3">
            {habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <div className="text-4xl mb-4">↻</div>
            <p className="text-brandTextLight mb-2">No habits tracked yet</p>
            <p className="text-sm text-brandTextLight">
              Try capturing &quot;Exercise daily&quot; or &quot;Meditate every morning&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
