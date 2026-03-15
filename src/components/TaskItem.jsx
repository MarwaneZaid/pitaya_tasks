import React from 'react';
import { Trash2, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { isUrgent, isOverdue, displayName } from '../lib/taskUtils';
import { TASK_TYPE_QUOTIDIEN, TASK_TYPE_SEMAINE, TASK_TYPE_ANNEXE, TASK_TYPE_COLORS, TASK_TYPE_LABELS, PRIORITY_COLORS } from '../config/constants';

export default function TaskItem({ task, toggleTask, deleteTask }) {
  return (
    <li
      className={`bg-white rounded-xl border-l-4 shadow-sm p-4 ${
        task.completed
          ? 'opacity-75 border-l-emerald-500'
          : isOverdue(task)
            ? 'border-l-red-500 bg-red-50/50'
            : isUrgent(task)
              ? 'border-l-amber-500 bg-amber-50/50'
              : TASK_TYPE_COLORS[task.taskType] || 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
          {task.completed ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <Circle className="w-6 h-6 text-slate-300 hover:text-amber-500" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
              {task.title}
            </span>
            {isOverdue(task) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                <AlertCircle className="w-3 h-3" /> En retard
              </span>
            )}
            {isUrgent(task) && !task.completed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                <Clock className="w-3 h-3" /> Urgent
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {(task.taskType || TASK_TYPE_ANNEXE) && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
                task.taskType === TASK_TYPE_QUOTIDIEN ? 'bg-red-100 text-red-800 border-red-300' :
                task.taskType === TASK_TYPE_SEMAINE ? 'bg-green-100 text-green-800 border-green-300' :
                'bg-orange-100 text-orange-800 border-orange-300'
              }`}>
                {TASK_TYPE_LABELS[task.taskType] || 'Annexe'}
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
                {new Date(task.deadline).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Créée par {displayName(task.createdBy)} · {task.completed && task.completedBy && `Terminée par ${displayName(task.completedBy)}`}
          </p>
        </div>
        <button
          onClick={() => deleteTask(task.id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </li>
  );
}
