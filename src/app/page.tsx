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
      <div className="bg-gradient-to-r from-brandBlue to-brandGreen rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold">{greeting()}</h1>
        <p className="text-white/80 mt-1">{formattedDate}</p>
      </div>

      {/* Capture Input */}
      <CaptureInput />

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Column */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-brandText">
              <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">◷</span>
              Appointments
            </h2>
            <span className="text-xs text-brandTextLight bg-gray-100 px-2 py-1 rounded-full">
              {todayAppointments.length} today
            </span>
          </div>

          <div className="space-y-3">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-brandTextLight text-sm">No appointments today</p>
              </div>
            )}
          </div>
        </div>

        {/* Todos Column */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-brandText">
              <span className="w-8 h-8 rounded-lg bg-brandBlueLight flex items-center justify-center text-brandBlue">✓</span>
              Todos
            </h2>
            <div className="flex gap-2">
              {highPriorityCount > 0 && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  {highPriorityCount} urgent
                </span>
              )}
              <span className="text-xs text-brandTextLight bg-gray-100 px-2 py-1 rounded-full">
                {activeTodos.length} active
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {activeTodos.length > 0 ? (
              activeTodos.slice(0, 8).map((todo) => (
                <TodoCard key={todo.id} todo={todo} />
              ))
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-brandTextLight text-sm">All caught up!</p>
              </div>
            )}
          </div>
        </div>

        {/* Habits Column */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-brandText">
              <span className="w-8 h-8 rounded-lg bg-brandGreenLight flex items-center justify-center text-brandGreen">↻</span>
              Habits
            </h2>
            <span className="text-xs text-brandTextLight bg-gray-100 px-2 py-1 rounded-full">
              {habits.length} tracked
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {habits.length > 0 ? (
              habits.map((habit) => (
                <HabitCard key={habit.id} habit={habit} />
              ))
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-brandTextLight text-sm">No habits yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
