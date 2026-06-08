import React, { useState } from 'react';
import { Trash2, CheckCircle2, Circle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { isUrgent, isOverdue, displayName } from '../lib/taskUtils';
import {
  TASK_TYPE_QUOTIDIEN,
  TASK_TYPE_SEMAINE,
  TASK_TYPE_ANNEXE,
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
  PRIORITY_COLORS,
} from '../config/constants';
import {
  TASK_STATUS_DONE,
  TASK_STATUS_IN_PROGRESS,
  TASK_STATUS_TODO,
  TASK_STATUS_LABELS,
  OPS_POSTS,
} from '../config/opsConstants';

function resolveStatus(task) {
  if (task.status === TASK_STATUS_TODO || task.status === TASK_STATUS_IN_PROGRESS || task.status === TASK_STATUS_DONE) {
    return task.status;
  }
  return task.completed ? TASK_STATUS_DONE : TASK_STATUS_TODO;
}

function StatusButton({ status, onClick }) {
  if (status === TASK_STATUS_DONE) {
    return (
      <button type="button" onClick={onClick} className="mt-0.5 shrink-0" title="Rouvrir la tâche">
        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
      </button>
    );
  }
  if (status === TASK_STATUS_IN_PROGRESS) {
    return (
      <button type="button" onClick={onClick} className="mt-0.5 shrink-0" title="Marquer comme terminée">
        <Loader2 className="w-6 h-6 text-amber-500" />
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} className="mt-0.5 shrink-0" title="Démarrer la tâche">
      <Circle className="w-6 h-6 text-slate-300 hover:text-amber-500" />
    </button>
  );
}

export default function TaskItem({
  task,
  advanceTaskStatus,
  onProofNoteChange,
  deleteTask,
  canDelete = false,
}) {
  const status = resolveStatus(task);
  const isDone = status === TASK_STATUS_DONE;
  const [proofDraft, setProofDraft] = useState(task.proofNote || '');

  const postLabel = OPS_POSTS.find((p) => p.id === task.post)?.label;

  const borderClass = isDone
    ? 'opacity-75 border-l-emerald-500'
    : isOverdue(task)
      ? 'border-l-red-500 bg-red-50/50'
      : status === TASK_STATUS_IN_PROGRESS
        ? 'border-l-amber-500 bg-amber-50/30'
        : isUrgent(task)
          ? 'border-l-amber-500 bg-amber-50/50'
          : TASK_TYPE_COLORS[task.taskType] || 'border-slate-200';

  return (
    <li className={`bg-white rounded-xl border-l-4 shadow-sm p-4 ${borderClass}`}>
      <div className="flex items-start gap-3">
        <StatusButton status={status} onClick={() => advanceTaskStatus(task.id)} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`font-medium ${isDone ? 'line-through text-slate-500' : 'text-slate-800'}`}>
              {task.title}
            </span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                status === TASK_STATUS_DONE
                  ? 'bg-emerald-100 text-emerald-800'
                  : status === TASK_STATUS_IN_PROGRESS
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {TASK_STATUS_LABELS[status]}
            </span>
            {isOverdue(task) && !isDone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                <AlertCircle className="w-3 h-3" /> En retard
              </span>
            )}
            {isUrgent(task) && !isDone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                <Clock className="w-3 h-3" /> Urgent
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {(task.taskType || TASK_TYPE_ANNEXE) && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
                  task.taskType === TASK_TYPE_QUOTIDIEN
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : task.taskType === TASK_TYPE_SEMAINE
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-orange-100 text-orange-800 border-orange-300'
                }`}
              >
                {TASK_TYPE_LABELS[task.taskType] || 'Annexe'}
              </span>
            )}
            {postLabel && (
              <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-lg border border-violet-200">
                {postLabel}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-slate-400'}`} />
              {task.priority}
            </span>
            {task.assignedTo && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg">{task.assignedTo}</span>
            )}
            {task.deadline && (
              <span className="text-slate-500">
                <Clock className="w-3.5 h-3.5 inline mr-0.5" />
                {new Date(task.deadline).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          {status === TASK_STATUS_IN_PROGRESS && onProofNoteChange && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Note / preuve (optionnel)</label>
              <input
                type="text"
                value={proofDraft}
                onChange={(e) => setProofDraft(e.target.value)}
                onBlur={() => {
                  if (proofDraft !== (task.proofNote || '')) {
                    onProofNoteChange(task.id, proofDraft);
                  }
                }}
                placeholder="Ex: Températures OK à 8h15"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}

          {isDone && task.proofNote && (
            <p className="text-xs text-slate-500 mt-1 italic">Note : {task.proofNote}</p>
          )}

          <p className="text-xs text-slate-400 mt-1">
            Créée par {displayName(task.createdBy)}
            {isDone && task.completedBy && ` · Terminée par ${displayName(task.completedBy)}`}
            {status === TASK_STATUS_IN_PROGRESS && task.startedAt && (
              <> · Démarrée {new Date(task.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </p>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => deleteTask(task.id)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 transition-colors"
            title="Supprimer la tâche"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </li>
  );
}
