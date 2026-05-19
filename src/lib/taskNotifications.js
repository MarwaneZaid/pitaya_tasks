/**
 * Notifications navigateur pour les tâches planifiées (scheduledFor).
 * Fonctionne quand l’app est ouverte (onglet actif ou en arrière-plan selon le navigateur).
 * Pour des alertes même app fermée : Web Push + serveur (phase ultérieure).
 */

export function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!canUseBrowserNotifications()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!canUseBrowserNotifications()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/** Tâches non terminées prévues pour une date YYYY-MM-DD. */
export function getPendingTasksForDate(tasks, dateYmd) {
  if (!Array.isArray(tasks) || !dateYmd) return [];
  return tasks.filter(
    (t) => !t.completed && t.scheduledFor === dateYmd && (t.title || '').trim()
  );
}

export function shouldFireDailyNotification({
  todayYmd,
  currentHour,
  reminderHour,
  lastFiredYmd,
  enabled,
}) {
  if (!enabled) return false;
  if (lastFiredYmd === todayYmd) return false;
  return currentHour >= reminderHour;
}

export function buildPlannedTasksNotification(tasks, dateYmd, siteName) {
  const pending = getPendingTasksForDate(tasks, dateYmd);
  if (pending.length === 0) return null;

  const title = siteName
    ? `${siteName} — tâches du jour`
    : 'DailyDo — tâches du jour';

  const lines = pending.slice(0, 5).map((t) => `• ${t.title.trim()}`);
  const more = pending.length > 5 ? `\n… et ${pending.length - 5} autre(s)` : '';
  const body = `${pending.length} tâche(s) planifiée(s) :\n${lines.join('\n')}${more}`;

  return { title, body, count: pending.length };
}

export function showPlannedTasksNotification(payload) {
  if (!payload || getNotificationPermission() !== 'granted') return false;
  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      tag: 'dailydo-planned-tasks',
      renotify: true,
    });
    void notification;
    return true;
  } catch (e) {
    console.warn('Notification failed:', e);
    return false;
  }
}
