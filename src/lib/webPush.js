/**
 * Web Push (notifications même app fermée) via service worker + Supabase.
 */

import {
  disablePushSubscriptionByEndpoint,
  disablePushSubscriptions,
  savePushSubscription,
  updatePushReminderHour,
} from './db';

export function getVapidPublicKey() {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

export function hasWebPushSupport() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function isWebPushConfigured() {
  return hasWebPushSupport() && Boolean(getVapidPublicKey());
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getServiceWorkerRegistration() {
  if (!hasWebPushSupport()) return null;
  return navigator.serviceWorker.ready;
}

export async function subscribeUserToPush(reminderHour) {
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    throw new Error('Web Push non configuré (VITE_VAPID_PUBLIC_KEY manquante).');
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error('Service worker indisponible. Réessayez après rechargement.');
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  await savePushSubscription(subscription, reminderHour);
  return subscription;
}

export async function unsubscribeUserFromPush() {
  const registration = await getServiceWorkerRegistration();
  if (registration) {
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      const { endpoint } = sub;
      await sub.unsubscribe();
      await disablePushSubscriptionByEndpoint(endpoint);
      return;
    }
  }
  await disablePushSubscriptions();
}

export async function syncPushReminderHour(reminderHour) {
  if (!isWebPushConfigured()) return;
  const registration = await getServiceWorkerRegistration();
  if (!registration) return;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;
  await updatePushReminderHour(reminderHour, sub.endpoint);
}
