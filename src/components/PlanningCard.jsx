import React from 'react';
import { CalendarCheck } from 'lucide-react';
import { JOURS } from '../config/planning';

export default function PlanningCard({ siteName, planningConfig, onAddWeeklyTasks }) {
  const jour = JOURS[new Date().getDay()];
  
  const tasksDuJour = planningConfig?.planning?.[jour] || [];
  const count = tasksDuJour.length;
  
  const annexes = planningConfig?.annexes || [];
  const countSemaine = annexes.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
          <CalendarCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Planning nettoyage {siteName}</h2>
          <p className="text-xs text-slate-500">
            Aujourd'hui ({jour}) · {count} tâche{count !== 1 ? 's' : ''} indispensables (ajoutées automatiquement)
            {countSemaine > 0 && ` · ${countSemaine} tâches/semaine (annexes)`}
          </p>
        </div>
      </div>
      {countSemaine > 0 && (
        <div className="ml-auto">
          <button
            type="button"
            onClick={onAddWeeklyTasks}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Ajouter les tâches de la semaine (annexes)
          </button>
        </div>
      )}
    </div>
  );
}
