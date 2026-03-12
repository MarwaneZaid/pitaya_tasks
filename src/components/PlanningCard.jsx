import React from 'react';
import { CalendarCheck } from 'lucide-react';
import { PLANNING_NETTOYAGE, JOURS, PLANNING_SEMAINE_EURALILLE, IS_PLANNING_EURALILLE } from '../config/planning';
import { SITE_NAME } from '../config/constants';

export default function PlanningCard({ onAddTodayTasks, onAddWeeklyTasks }) {
  const jour = JOURS[new Date().getDay()];
  const count = PLANNING_NETTOYAGE[jour]?.length ?? 0;
  const countSemaine = IS_PLANNING_EURALILLE ? (PLANNING_SEMAINE_EURALILLE?.length ?? 0) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
          <CalendarCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Planning nettoyage {SITE_NAME}</h2>
          <p className="text-xs text-slate-500">
            Aujourd'hui ({jour}) · {count} tâche{count !== 1 ? 's' : ''} indispensables
            {IS_PLANNING_EURALILLE && countSemaine > 0 && ` · ${countSemaine} tâches/semaine (annexes)`}
          </p>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddTodayTasks}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Ajouter les tâches du jour
        </button>
        {onAddWeeklyTasks && (
          <button
            type="button"
            onClick={onAddWeeklyTasks}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Ajouter les tâches de la semaine (annexes)
          </button>
        )}
      </div>
    </div>
  );
}
