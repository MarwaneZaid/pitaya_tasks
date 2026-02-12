import React from 'react';
import { CalendarCheck } from 'lucide-react';
import { PLANNING_NETTOYAGE, JOURS } from '../config/planning';

export default function PlanningCard({ onAddTodayTasks }) {
  const jour = JOURS[new Date().getDay()];
  const count = PLANNING_NETTOYAGE[jour]?.length ?? 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
          <CalendarCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Planning nettoyage PITAYA BÉTHUNE</h2>
          <p className="text-xs text-slate-500">
            Aujourd'hui ({jour}) · {count} tâche{count !== 1 ? 's' : ''} indispensables
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAddTodayTasks}
        className="ml-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Ajouter les tâches du jour
      </button>
    </div>
  );
}
