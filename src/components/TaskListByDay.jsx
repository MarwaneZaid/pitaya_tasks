import React from 'react';
import { CalendarDays } from 'lucide-react';
import TaskItem from './TaskItem';
import { formatDaySectionLabel } from '../lib/taskUtils';

const SECTION_STYLES = {
  today: {
    header: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon: 'text-emerald-600',
  },
  yesterday: {
    header: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: 'text-amber-600',
  },
  other: {
    header: 'bg-slate-100 border-slate-200 text-slate-700',
    icon: 'text-slate-500',
  },
};

export default function TaskListByDay({
  groups,
  advanceTaskStatus,
  onProofNoteChange,
  deleteTask,
  canDelete,
}) {
  const sections = [
    {
      id: 'today',
      tasks: groups.today,
      label: formatDaySectionLabel(groups.todayYmd, 'Aujourd\'hui'),
      hint: null,
    },
    {
      id: 'yesterday',
      tasks: groups.yesterday,
      label: formatDaySectionLabel(groups.yesterdayYmd, 'Hier'),
      hint: 'Tâches restantes de la veille',
    },
    {
      id: 'other',
      tasks: groups.other,
      label: 'Jours précédents',
      hint: 'Tâches plus anciennes non terminées',
    },
  ].filter((s) => s.tasks.length > 0);

  if (sections.length === 0) return null;

  const showHeaders = sections.length > 1 || sections[0].id !== 'today';

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const style = SECTION_STYLES[section.id];
        return (
          <section key={section.id} aria-labelledby={`task-section-${section.id}`}>
            {showHeaders && (
              <header
                id={`task-section-${section.id}`}
                className={`flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border ${style.header}`}
              >
                <CalendarDays className={`w-5 h-5 shrink-0 ${style.icon}`} aria-hidden />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold capitalize">{section.label}</h3>
                  {section.hint && (
                    <p className="text-xs opacity-80 mt-0.5">{section.hint}</p>
                  )}
                </div>
                <span className="text-sm font-medium shrink-0">
                  {section.tasks.length} tâche{section.tasks.length > 1 ? 's' : ''}
                </span>
              </header>
            )}
            <ul className={`space-y-3 ${showHeaders ? 'mt-3' : ''}`}>
              {section.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  advanceTaskStatus={advanceTaskStatus}
                  onProofNoteChange={onProofNoteChange}
                  deleteTask={deleteTask}
                  canDelete={canDelete}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
