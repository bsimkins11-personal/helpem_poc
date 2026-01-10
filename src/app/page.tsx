"use client";

import CaptureInput from "@/components/CaptureInput";
import { TodoCard } from "@/components/TodoCard";
import { HabitCard } from "@/components/HabitCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { useLife } from "@/state/LifeStore";

const priorityOrder = { high: 0, medium: 1, low: 2 };

export default function TodayPage() {
  const { todos, habits, appointments } = useLife();

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Filter today's appointments
  const todayAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.datetime);
      return aptDate >= today && aptDate < tomorrow;
    })
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  // Active todos sorted by priority
  const activeTodos = todos
    .filter((todo) => !todo.completedAt)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Count high priority
  const highPriorityCount = activeTodos.filter(t => t.priority === 'high').length;

  // Format greeting
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{greeting()}</h1>
        <p className="text-white/50 mt-1">{formattedDate}</p>
      </div>

      {/* Capture Input */}
      <CaptureInput />

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-violet-400">◷</span>
              Appointments
            </h2>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
              {todayAppointments.length} today
            </span>
          </div>

          <div className="space-y-3">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))
            ) : (
              <div className="p-6 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-white/40 text-sm">No appointments today</p>
              </div>
            )}
          </div>
        </div>

        {/* Todos Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-[#0077CC]">✓</span>
              Todos
            </h2>
            <div className="flex gap-2">
              {highPriorityCount > 0 && (
                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                  {highPriorityCount} urgent
                </span>
              )}
              <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                {activeTodos.length} active
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {activeTodos.length > 0 ? (
              activeTodos.slice(0, 8).map((todo) => (
                <TodoCard key={todo.id} todo={todo} />
              ))
            ) : (
              <div className="p-6 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-white/40 text-sm">All caught up!</p>
              </div>
            )}
          </div>
        </div>

        {/* Habits Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-[#7AC943]">↻</span>
              Habits
            </h2>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
              {habits.length} tracked
            </span>
          </div>

          <div className="space-y-3">
            {habits.length > 0 ? (
              habits.map((habit) => (
                <HabitCard key={habit.id} habit={habit} />
              ))
            ) : (
              <div className="p-6 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-white/40 text-sm">No habits yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
