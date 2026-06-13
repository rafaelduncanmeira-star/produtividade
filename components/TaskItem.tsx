import React from 'react';
import { Check, Edit2, Trash2, Play, Timer, Calendar, Repeat } from 'lucide-react';
import { Task, QUADRANT_INFO, getQuadrant } from '../types';
import { todayISO, formatShortDate } from '../utils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (task: Task) => void;
  onFocus?: (id: string) => void;
  compact?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onEdit, onFocus, compact }) => {
  const quadrant = QUADRANT_INFO[getQuadrant(task)];
  const overdue = !task.completed && !!task.dueDate && task.dueDate < todayISO();

  return (
    <div className={`group flex items-center gap-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
      <button
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? 'Reabrir tarefa' : 'Concluir tarefa'}
        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'
        }`}
      >
        <Check size={14} strokeWidth={3} />
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${quadrant.badgeClass}`}>{quadrant.label}</span>
          {task.recurrence && <Repeat size={11} className="text-slate-400 shrink-0" />}
          {!compact && <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{task.category}</span>}
          {task.dueDate && (
            <span className={`flex items-center gap-0.5 text-[10px] font-medium ${overdue ? 'text-rose-600' : 'text-slate-400'}`}>
              <Calendar size={10} />
              {overdue ? `Atrasada ${formatShortDate(task.dueDate)}` : formatShortDate(task.dueDate)}
            </span>
          )}
          {task.estimatedPomodoros > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
              <Timer size={10} />
              {task.completedPomodoros}/{task.estimatedPomodoros}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {onFocus && !task.completed && (
          <button
            onClick={() => onFocus(task.id)}
            title="Focar nesta tarefa"
            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
          >
            <Play size={16} />
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(task)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
            <Edit2 size={16} />
          </button>
        )}
        <button onClick={() => onDelete(task.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
