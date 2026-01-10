'use client';

import { Appointment } from '@/types/appointment';

interface AppointmentCardProps {
  appointment: Appointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isToday = () => {
    const today = new Date();
    const aptDate = new Date(appointment.datetime);
    return (
      today.getFullYear() === aptDate.getFullYear() &&
      today.getMonth() === aptDate.getMonth() &&
      today.getDate() === aptDate.getDate()
    );
  };

  const isPast = () => {
    return new Date(appointment.datetime) < new Date();
  };

  return (
    <div
      className={`group relative p-4 bg-white/5 border border-white/10 rounded-xl 
                  border-l-4 border-l-violet-500 hover:bg-white/8 transition-all duration-200
                  ${isPast() ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center justify-center w-12 h-12 bg-violet-500/20 rounded-lg">
          <span className="text-xs text-violet-400 font-medium">
            {formatTime(appointment.datetime)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white">{appointment.title}</h3>

          <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <span>📅</span>
              {isToday() ? 'Today' : formatDate(appointment.datetime)}
            </span>

            <span className="flex items-center gap-1">
              <span>⏰</span>
              {formatTime(appointment.datetime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
