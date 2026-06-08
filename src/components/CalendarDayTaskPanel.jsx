import React from 'react';
import { CheckCircle2, Circle, Loader2, Trash2 } from 'lucide-react';
import { TASK_TYPE_LABELS } from '../config/constants';
import { TASK_STATUS_LABELS } from '../config/opsConstants';
import { displayName, isTaskDone, summarizeDayTasks } from '../lib/taskUtils';

function StatusBadge({ task }) {
  const done = isTaskDone(task);
  const status = done ? 'done' : (task.status === 'in_progress' ? 'in_progress' : 'todo');
  const classes = {
    done: 'bg-emerald-100 text-emerald-800',
    in_progress: 'bg-amber-100 text-amber-800',
    todo: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${classes[status]}`}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

function TaskRow({ task, isManager, busy, onDelete }) {
  const done = isTaskDone(task);
  return (
    <div
      className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm ${
        done ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden />
        ) : task.status === 'in_progress' ? (
          <Loader2 className="w-5 h-5 text-amber-500" aria-hidden />
        ) : (
          <Circle className="w-5 h-5 text-slate-300" aria-hidden />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-slate-800 ${done ? 'line-through text-slate-500' : ''}`}>
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <StatusBadge task={task} />
          <span className="text-xs text-slate-500">
            {TASK_TYPE_LABELS[task.taskType] || task.taskType}
          </span>
        </div>
        {(done && task.completedBy) && (
          <p className="text-xs text-slate-400 mt-1">
            Terminée par {displayName(task.completedBy)}
            {task.completedAt && (
              <> · {new Date(task.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </p>
        )}
        {task.proofNote && (
          <p className="text-xs text-slate-500 mt-1 italic">Note : {task.proofNote}</p>
        )}
      </div>
      {isManager && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          disabled={busy}
          className="p-1 text-red-500 hover:bg-red-50 rounded shrink-0"
          aria-label={`Supprimer ${task.title}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function CalendarDayTaskPanel({
  selectedDate,
  todayYmd,
  tasks,
  isManager,
  busy,
  onDeleteTask,
}) {
  const summary = summarizeDayTasks(tasks);
  const isPast = selectedDate < todayYmd;
  const isToday = selectedDate === todayYmd;

  const doneTasks = tasks.filter(isTaskDone);
  const pendingTasks = tasks.filter((t) => !isTaskDone(t));

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        Aucune tâche enregistrée pour ce jour.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-3 text-sm mb-2">
          <span className="text-emerald-700 font-medium">{summary.done} terminée{summary.done > 1 ? 's' : ''}</span>
          {summary.inProgress > 0 && (
            <span className="text-amber-700 font-medium">{summary.inProgress} en cours</span>
          )}
          {summary.todo > 0 && (
            <span className="text-slate-600">{summary.todo} à faire</span>
          )}
          <span className="ml-auto font-semibold text-slate-700">{summary.percent}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${summary.percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${summary.percent}%` }}
          />
        </div>
        {isPast && summary.pending > 0 && (
          <p className="text-xs text-red-600 mt-2">
            Jour passé : {summary.pending} tâche{summary.pending > 1 ? 's' : ''} non terminée{summary.pending > 1 ? 's' : ''}.
          </p>
        )}
        {isToday && summary.pending > 0 && (
          <p className="text-xs text-amber-700 mt-2">
            Encore {summary.pending} tâche{summary.pending > 1 ? 's' : ''} à finaliser aujourd’hui.
          </p>
        )}
      </div>

      {pendingTasks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Non terminées ({pendingTasks.length})
          </h4>
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isManager={isManager}
                busy={busy}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </div>
      )}

      {doneTasks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Terminées ({doneTasks.length})
          </h4>
          <div className="space-y-2">
            {doneTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isManager={isManager}
                busy={busy}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
