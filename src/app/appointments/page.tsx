'use client';

import { useMemo } from 'react';
import { AppointmentCard } from '@/components/AppointmentCard';
import { useLife } from '@/state/LifeStore';

export default function AppointmentsPage() {
  const { appointments } = useLife();

  const groupedAppointments = useMemo(() => {
    const groups: Record<string, typeof appointments> = {};
    
    const sortedAppointments = [...appointments].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    sortedAppointments.forEach((apt) => {
      const date = new Date(apt.datetime);
      const key = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(apt);
    });

    return groups;
  }, [appointments]);

  const isToday = (dateString: string) => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return dateString === today;
  };

  const isTomorrow = (dateString: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return dateString === tomorrowString;
  };

  const getDateLabel = (dateString: string) => {
    if (isToday(dateString)) return 'Today';
    if (isTomorrow(dateString)) return 'Tomorrow';
    return dateString;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <span className="text-violet-400">◷</span>
          Calendar
        </h1>
        <p className="text-white/50">{appointments.length} appointments scheduled</p>
      </div>

      {/* Appointments by Date */}
      {Object.keys(groupedAppointments).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedAppointments).map(([date, apts]) => (
            <section key={date} className="space-y-4">
              <h2
                className={`text-lg font-semibold ${
                  isToday(date) ? 'text-violet-400' : 'text-white/70'
                }`}
              >
                {getDateLabel(date)}
                <span className="ml-2 text-sm font-normal text-white/40">
                  {apts.length} {apts.length === 1 ? 'event' : 'events'}
                </span>
              </h2>
              <div className="space-y-3">
                {apts.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-xl">
          <div className="text-4xl mb-4">◷</div>
          <p className="text-white/40 mb-2">No appointments scheduled</p>
          <p className="text-sm text-white/30">
            Try capturing &quot;Meeting at 3pm tomorrow&quot; or &quot;Dentist appointment Friday at 10am&quot;
          </p>
        </div>
      )}
    </div>
  );
}
