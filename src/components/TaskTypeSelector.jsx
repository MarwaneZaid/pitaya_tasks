import React from 'react';
import {
  TASK_TYPE_QUOTIDIEN,
  TASK_TYPE_ANNEXE,
  TASK_TYPE_SEMAINE,
} from '../config/constants';

const TYPES = [
  {
    id: TASK_TYPE_QUOTIDIEN,
    icon: '🔴',
    label: 'Quotidien',
    desc: 'Obligatoire du jour',
    active: 'bg-red-500 text-white border-red-500',
    inactive: 'bg-white text-slate-600 border-slate-200 hover:border-red-300',
  },
  {
    id: TASK_TYPE_ANNEXE,
    icon: '🟠',
    label: 'Annexe',
    desc: 'Reportée si non faite',
    active: 'bg-orange-500 text-white border-orange-500',
    inactive: 'bg-white text-slate-600 border-slate-200 hover:border-orange-300',
  },
  {
    id: TASK_TYPE_SEMAINE,
    icon: '🟢',
    label: 'Semaine',
    desc: 'À faire cette semaine',
    active: 'bg-green-500 text-white border-green-500',
    inactive: 'bg-white text-slate-600 border-slate-200 hover:border-green-300',
  },
];

export default function TaskTypeSelector({ value, onChange }) {
  return (
    <div className="col-span-full">
      <label className="block text-sm font-medium text-slate-600 mb-2">Type de tâche</label>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Type de tâche">
        {TYPES.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={value === t.id}
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-center ${value === t.id ? t.active : t.inactive}`}
          >
            <span className="text-xl" aria-hidden>{t.icon}</span>
            <span className="text-xs font-semibold leading-tight">{t.label}</span>
            <span className={`text-xs leading-tight ${value === t.id ? 'text-white/80' : 'text-slate-400'}`}>{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
