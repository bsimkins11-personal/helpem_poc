"use client";

import { useEffect, useRef } from "react";
import { useLife } from "@/state/LifeStore";
import { sendNotification, requestNotificationPermission } from "@/lib/notifications";

export function useReminders() {
  const { appointments } = useLife();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Request permission on mount
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    // Check every minute for upcoming appointments
    const checkReminders = () => {
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

      appointments.forEach((apt) => {
        const aptTime = new Date(apt.datetime);
        const reminderKey = `${apt.id}-${apt.datetime}`;

        // Skip if already notified
        if (notifiedRef.current.has(reminderKey)) return;

        // Check if appointment is within the next 15 minutes
        if (aptTime > now && aptTime <= fifteenMinutesFromNow) {
          const minutesUntil = Math.round((aptTime.getTime() - now.getTime()) / 60000);
          
          sendNotification(`📅 ${apt.title}`, {
            body: `Coming up in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`,
            tag: reminderKey,
          });

          notifiedRef.current.add(reminderKey);
        }
      });
    };

    // Check immediately
    checkReminders();

    // Then check every minute
    const interval = setInterval(checkReminders, 60000);

    return () => clearInterval(interval);
  }, [appointments]);
}
