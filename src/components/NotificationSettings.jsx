import React, { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import {
  canUseBrowserNotifications,
  getNotificationPermission,
  requestNotificationPermission,
} from '../lib/taskNotifications';
import {
  readNotificationEnabled,
  readNotificationHour,
  saveNotificationEnabled,
  saveNotificationHour,
} from '../lib/notificationPrefs';

export default function NotificationSettings({ isOpen, onClose, onPrefsChange }) {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(8);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (!isOpen) return;
    setEnabled(readNotificationEnabled());
    setHour(readNotificationHour());
    setPermission(getNotificationPermission());
  }, [isOpen]);

  if (!isOpen) return null;

  const unsupported = !canUseBrowserNotifications();

  const handleToggle = async () => {
    if (unsupported) {
      showToast({
        message: 'Notifications non supportées sur ce navigateur.',
        variant: 'error',
      });
      return;
    }
    if (!enabled) {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== 'granted') {
        showToast({
          message:
            result === 'denied'
              ? 'Notifications refusées. Autorisez DailyDo dans les réglages du navigateur / du téléphone.'
              : 'Autorisation des notifications annulée.',
          variant: 'error',
        });
        return;
      }
      setEnabled(true);
      saveNotificationEnabled(true);
      showToast({
        message: 'Notifications activées pour les tâches planifiées du jour.',
        variant: 'success',
      });
    } else {
      setEnabled(false);
      saveNotificationEnabled(false);
      showToast({ message: 'Notifications désactivées.', variant: 'info' });
    }
    onPrefsChange?.();
  };

  const handleHourChange = (e) => {
    const h = parseInt(e.target.value, 10);
    setHour(h);
    saveNotificationHour(h);
    onPrefsChange?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notify-settings-title"
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-violet-600" />
            <h2 id="notify-settings-title" className="text-lg font-bold text-slate-800">
              Rappels tâches planifiées
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-sm text-slate-600">
          {unsupported ? (
            <p className="text-red-600">
              Votre navigateur ne prend pas en charge les notifications.
            </p>
          ) : (
            <>
              <p>
                Chaque jour à l’heure choisie, si l’application est ouverte (ou en arrière-plan),
                vous recevez un rappel des <strong>tâches non terminées</strong> dont la date
                planifiée est <strong>aujourd’hui</strong> (calendrier ou tableau de bord).
              </p>
              <p className="text-xs text-slate-500">
                Sur iPhone : ajoutez le site à l’écran d’accueil (PWA) et autorisez les
                notifications pour de meilleurs résultats. Les alertes avec l’app complètement
                fermée nécessitent une évolution serveur (Web Push).
              </p>
              <p className="text-xs">
                Permission actuelle :{' '}
                <span className="font-medium">
                  {permission === 'granted'
                    ? 'Autorisée'
                    : permission === 'denied'
                      ? 'Refusée'
                      : 'Non demandée'}
                </span>
              </p>
            </>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              disabled={unsupported}
              className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="font-medium text-slate-800 flex items-center gap-2">
              {enabled ? <Bell className="w-4 h-4 text-violet-600" /> : <BellOff className="w-4 h-4" />}
              Activer les notifications
            </span>
          </label>

          {enabled && !unsupported && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Heure du rappel quotidien
              </label>
              <select
                value={hour}
                onChange={handleHourChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}h00
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
