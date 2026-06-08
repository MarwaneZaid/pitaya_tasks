import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, X, Plus, Loader2, Sparkles,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { TASK_TYPE_ANNEXE } from '../config/constants';
import {
  getMonthGridCells,
  getMonthRange,
  getTodayYMD,
  formatDateLabelFr,
  getDayCompletionKind,
  MONTH_NAMES_FR,
  WEEKDAY_HEADERS_FR,
  parseDateYMD,
} from '../lib/calendarUtils';
import { summarizeDayTasks } from '../lib/taskUtils';
import CalendarDayTaskPanel from './CalendarDayTaskPanel';
import { buildQuotidienTasksForDate, weekdayKeyForDate } from '../lib/planningDay';
import { deleteTask, getTasksInRange, saveTask, saveTasks } from '../lib/db';
import TaskTypeSelector from './TaskTypeSelector';

const PRIORITY_OPTIONS = [
  { value: 'basse', label: '🟢 Basse' },
  { value: 'moyenne', label: '🟡 Moyenne' },
  { value: 'haute', label: '🔴 Haute' },
];

export default function YearCalendarPlanner({
  isOpen,
  onClose,
  planningConfig,
  userName,
  isManager,
  onTasksChanged,
}) {
  const { showToast } = useToast();
  const today = getTodayYMD();
  const initial = parseDateYMD(today);

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.monthIndex);
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthTasks, setMonthTasks] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    taskType: TASK_TYPE_ANNEXE,
    priority: 'moyenne',
  });

  const loadMonth = useCallback(async () => {
    if (!isOpen) return;
    setLoadingMonth(true);
    try {
      const { start, end } = getMonthRange(viewYear, viewMonth);
      const rows = await getTasksInRange(start, end);
      setMonthTasks(rows);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Impossible de charger le calendrier.', variant: 'error' });
      setMonthTasks([]);
    } finally {
      setLoadingMonth(false);
    }
  }, [isOpen, viewYear, viewMonth, showToast]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const tasksByDate = useMemo(() => {
    const map = {};
    for (const t of monthTasks) {
      const d = t.scheduledFor;
      if (!map[d]) map[d] = [];
      map[d].push(t);
    }
    return map;
  }, [monthTasks]);

  const selectedTasks = useMemo(() => {
    const list = tasksByDate[selectedDate] || [];
    return list.slice().sort((a, b) => {
      const aDone = a.completed || a.status === 'done';
      const bDone = b.completed || b.status === 'done';
      if (aDone !== bDone) return aDone ? 1 : -1;
      return (a.title || '').localeCompare(b.title || '', 'fr');
    });
  }, [tasksByDate, selectedDate]);

  const gridCells = useMemo(
    () => getMonthGridCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const shiftMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const shiftYear = (delta) => {
    setViewYear((y) => y + delta);
  };

  const refreshAll = async () => {
    await loadMonth();
    if (onTasksChanged) await onTasksChanged();
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title || !isManager) return;
    setBusy(true);
    try {
      const saved = await saveTask({
        title,
        category: 'nettoyage',
        priority: draft.priority,
        taskType: draft.taskType,
        scheduledFor: selectedDate,
        assignedTo: '',
        completed: false,
        createdBy: userName,
      });
      setMonthTasks((prev) => [...prev, saved]);
      setDraft({ title: '', taskType: TASK_TYPE_ANNEXE, priority: 'moyenne' });
      showToast({ message: 'Tâche planifiée.', variant: 'success' });
      if (onTasksChanged) await onTasksChanged();
    } catch (err) {
      console.error(err);
      showToast({ message: 'Erreur lors de la planification.', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!isManager || !planningConfig) return;
    setBusy(true);
    try {
      const existing = (tasksByDate[selectedDate] || []).map((t) => t.title);
      const toCreate = buildQuotidienTasksForDate(
        planningConfig,
        selectedDate,
        existing,
        userName
      );
      if (toCreate.length === 0) {
        showToast({
          message: 'Aucune tâche du modèle à ajouter (déjà présentes ou jour vide).',
          variant: 'info',
        });
        return;
      }
      const saved = await saveTasks(toCreate);
      setMonthTasks((prev) => [...prev, ...saved]);
      showToast({
        message: `${saved.length} tâche(s) du planning habituel ajoutée(s).`,
        variant: 'success',
      });
      if (onTasksChanged) await onTasksChanged();
    } catch (err) {
      console.error(err);
      showToast({ message: 'Erreur lors de l’application du modèle.', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!isManager) return;
    setBusy(true);
    try {
      await deleteTask(taskId);
      setMonthTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast({ message: 'Tâche supprimée.', variant: 'success' });
      if (onTasksChanged) await onTasksChanged();
    } catch (err) {
      console.error(err);
      showToast({ message: 'Suppression impossible.', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  const jourLabel = weekdayKeyForDate(selectedDate);
  const jourName = jourLabel ? jourLabel.charAt(0).toUpperCase() + jourLabel.slice(1) : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-title"
    >
      <div className="bg-white w-full sm:max-w-4xl max-h-[95vh] sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <h2 id="calendar-title" className="text-lg font-bold text-slate-800 truncate">
                Calendrier annuel
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Cliquez un jour pour voir les tâches faites ou non — historique sur toute l’année
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Fermer le calendrier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50 shrink-0 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftYear(-1)}
              className="p-1.5 rounded-lg hover:bg-white border border-slate-200"
              aria-label="Année précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[3rem] text-center">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => shiftYear(1)}
              className="p-1.5 rounded-lg hover:bg-white border border-slate-200"
              aria-label="Année suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-white border border-slate-200"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800 min-w-[6rem] text-center">
              {MONTH_NAMES_FR[viewMonth]}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg hover:bg-white border border-slate-200"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              const t = parseDateYMD(today);
              setViewYear(t.year);
              setViewMonth(t.monthIndex);
              setSelectedDate(today);
            }}
            className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200"
          >
            Aujourd’hui
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="min-w-0">
            {loadingMonth ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Chargement…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAY_HEADERS_FR.map((label) => (
                    <div
                      key={label}
                      className="text-center text-[10px] font-semibold text-slate-400 uppercase py-1"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 mb-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Tout fait
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-400" /> En cours
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-red-400" /> Jour passé incomplet
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {gridCells.map((ymd, idx) => {
                    if (!ymd) {
                      return <div key={`empty-${idx}`} className="aspect-square" />;
                    }
                    const dayTasks = tasksByDate[ymd] || [];
                    const summary = summarizeDayTasks(dayTasks);
                    const kind = getDayCompletionKind(ymd, dayTasks, today);
                    const isToday = ymd === today;
                    const isSelected = ymd === selectedDate;
                    const { day } = parseDateYMD(ymd);

                    let kindClass = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
                    if (kind === 'complete') {
                      kindClass = 'border-emerald-300 bg-emerald-50 text-emerald-900';
                    } else if (kind === 'past_incomplete') {
                      kindClass = 'border-red-300 bg-red-50 text-red-900';
                    } else if (kind === 'in_progress') {
                      kindClass = 'border-amber-300 bg-amber-50 text-amber-900';
                    }

                    return (
                      <button
                        key={ymd}
                        type="button"
                        onClick={() => setSelectedDate(ymd)}
                        className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center gap-0.5 transition-colors ${
                          isSelected
                            ? 'ring-2 ring-amber-400 border-amber-500'
                            : isToday
                              ? 'ring-1 ring-emerald-400'
                              : ''
                        } ${kindClass}`}
                        title={
                          summary.total > 0
                            ? `${summary.done}/${summary.total} terminées`
                            : 'Aucune tâche'
                        }
                      >
                        <span className="font-semibold leading-none">{day}</span>
                        {summary.total > 0 && (
                          <span
                            className={`text-[9px] font-medium px-1 rounded ${
                              kind === 'complete'
                                ? 'bg-emerald-500 text-white'
                                : kind === 'past_incomplete'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-amber-500 text-white'
                            }`}
                          >
                            {kind === 'complete' ? '✓' : `${summary.done}/${summary.total}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className="min-w-0 flex flex-col border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <p className="font-semibold text-slate-800 text-sm capitalize">
                {formatDateLabelFr(selectedDate)}
              </p>
              {jourName && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Modèle habituel : {jourName}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 max-h-48 lg:max-h-none">
              <CalendarDayTaskPanel
                selectedDate={selectedDate}
                todayYmd={today}
                tasks={selectedTasks}
                isManager={isManager}
                busy={busy}
                onDeleteTask={handleDeleteTask}
              />
            </div>

            {isManager && (
              <div className="p-3 border-t border-slate-200 bg-white space-y-3">
                <button
                  type="button"
                  onClick={handleApplyTemplate}
                  disabled={busy || !planningConfig}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-orange-800 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  Insérer le planning du {jourName || 'jour'}
                </button>

                <form onSubmit={handleAddTask} className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nouvelle tâche pour ce jour…"
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                  <TaskTypeSelector
                    value={draft.taskType}
                    onChange={(v) => setDraft((d) => ({ ...d, taskType: v }))}
                  />
                  <select
                    value={draft.priority}
                    onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={busy || !draft.title.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Planifier ce jour
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => refreshAll()}
            className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
