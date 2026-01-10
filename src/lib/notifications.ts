"use client";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function sendNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/logo.png",
      badge: "/logo.png",
      ...options,
    });

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    // Focus window on click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

export function scheduleReminder(
  title: string,
  datetime: Date,
  minutesBefore: number = 15
): NodeJS.Timeout | null {
  const now = new Date();
  const reminderTime = new Date(datetime.getTime() - minutesBefore * 60 * 1000);
  const delay = reminderTime.getTime() - now.getTime();

  if (delay <= 0) {
    // Already past reminder time
    return null;
  }

  return setTimeout(() => {
    sendNotification(`Reminder: ${title}`, {
      body: `Coming up in ${minutesBefore} minutes`,
      tag: `reminder-${datetime.getTime()}`,
    });
  }, delay);
}
