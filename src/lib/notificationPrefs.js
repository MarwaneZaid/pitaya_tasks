const ENABLED_KEY = 'dailydo_notify_enabled';
const HOUR_KEY = 'dailydo_notify_hour';
const LAST_FIRED_KEY = 'dailydo_notify_last_fired';

export function readNotificationEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function saveNotificationEnabled(enabled) {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  } catch (_) {}
}

/** Heure du rappel quotidien (0–23), défaut 8h. */
export function readNotificationHour() {
  try {
    const v = parseInt(localStorage.getItem(HOUR_KEY) || '8', 10);
    if (Number.isNaN(v)) return 8;
    return Math.min(23, Math.max(0, v));
  } catch (_) {
    return 8;
  }
}

export function saveNotificationHour(hour) {
  try {
    localStorage.setItem(HOUR_KEY, String(Math.min(23, Math.max(0, hour))));
  } catch (_) {}
}

export function readLastNotificationDate() {
  try {
    return localStorage.getItem(LAST_FIRED_KEY) || '';
  } catch (_) {
    return '';
  }
}

export function saveLastNotificationDate(ymd) {
  try {
    localStorage.setItem(LAST_FIRED_KEY, ymd);
  } catch (_) {}
}
