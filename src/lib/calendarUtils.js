/** Utilitaires calendrier (dates locales, format YYYY-MM-DD). */

import { summarizeDayTasks } from './taskUtils';

export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const WEEKDAY_HEADERS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function formatDateYMD(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseDateYMD(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return { year: y, monthIndex: m - 1, day: d };
}

export function getTodayYMD() {
  return new Date().toISOString().slice(0, 10);
}

/** Jours à afficher dans la grille (null = case vide avant le 1er du mois). */
export function getMonthGridCells(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  // Lundi = 0 … Dimanche = 6
  const startPad = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(formatDateYMD(year, monthIndex, day));
  }
  return cells;
}

export function getMonthRange(year, monthIndex) {
  const start = formatDateYMD(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const end = formatDateYMD(year, monthIndex, lastDay);
  return { start, end };
}

/** État visuel d’un jour dans le calendrier (tâches faites ou non). */
export function getDayCompletionKind(ymd, tasks, todayYmd) {
  const summary = summarizeDayTasks(tasks);
  if (summary.total === 0) return 'empty';
  if (summary.done === summary.total) return 'complete';
  if (ymd < todayYmd) return 'past_incomplete';
  return 'in_progress';
}

export function formatDateLabelFr(ymd) {
  const { year, monthIndex, day } = parseDateYMD(ymd);
  const date = new Date(year, monthIndex, day);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
