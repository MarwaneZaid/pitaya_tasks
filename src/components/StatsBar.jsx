import React from 'react';

const STATS = [
  { key: 'total', label: 'Total', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  { key: 'completed', label: 'Terminées', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: 'pending', label: 'En cours', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { key: 'urgent', label: 'Urgentes', color: 'bg-red-50 text-red-800 border-red-200' },
];

export default function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {STATS.map(({ key, label, color }) => (
        <div key={key} className={`p-4 rounded-xl border ${color}`}>
          <div className="text-xs font-medium opacity-90">{label}</div>
          <div className="text-2xl font-bold mt-0.5">{stats[key] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}
