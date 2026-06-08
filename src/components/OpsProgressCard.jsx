import React from 'react';
import { ClipboardList, PlayCircle } from 'lucide-react';
import { computeDayProgress } from '../lib/taskStatus';
import { TASK_STATUS_LABELS } from '../config/opsConstants';

export default function OpsProgressCard({
  tasks,
  todayYmd,
  isManager,
  onGenerateChecklists,
  generating,
}) {
  const progress = computeDayProgress(tasks, todayYmd);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="font-semibold text-slate-800">Exécution du jour</h2>
            <p className="text-xs text-slate-500">
              {progress.total} tâche(s) planifiées aujourd’hui
            </p>
          </div>
        </div>
        {isManager && onGenerateChecklists && (
          <button
            type="button"
            onClick={onGenerateChecklists}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" />
            Générer les checklists
          </button>
        )}
      </div>

      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-emerald-700 font-medium">
          {progress.done} {TASK_STATUS_LABELS.done}
        </span>
        <span className="text-amber-700 font-medium">
          {progress.inProgress} {TASK_STATUS_LABELS.in_progress}
        </span>
        <span className="text-slate-600">
          {progress.pending} {TASK_STATUS_LABELS.todo}
        </span>
        <span className="ml-auto text-slate-500 font-semibold">{progress.percent}%</span>
      </div>
    </section>
  );
}
