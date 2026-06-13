import React from 'react';
import { Check, Play, Edit2, Trash2, Calendar, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, QUADRANT_INFO, getQuadrant } from '../types';
import { todayISO, formatShortDate } from '../utils';

interface KanbanCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  canMovePrev: boolean;
  canMoveNext: boolean;
}

// Card vertical para o modo Quadro (Kanban): título em destaque (quebra linha,
// não trunca), metadados abaixo e controles num rodapé — legível em coluna estreita.
export const KanbanCard: React.FC<KanbanCardProps> = ({
  task, onToggle, onDelete, onEdit, onFocus, onMove, canMovePrev, canMoveNext,
}) => {
  const quadrant = QUADRANT_INFO[getQuadrant(task)];
  const overdue = !task.completed && !!task.dueDate && task.dueDate < todayISO();

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => onToggle(task.id)}
          aria-label={task.completed ? 'Reabrir tarefa' : 'Concluir tarefa'}
          className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'
          }`}
        >
          <Check size={12} strokeWidth={3} />
        </button>
        <p className={`flex-1 min-w-0 text-sm font-medium leading-snug break-words ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {task.title}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-2 pl-[30px]">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${quadrant.badgeClass}`}>{quadrant.label}</span>
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

      <div className="flex items-center justify-between mt-2.5 pl-[30px]">
        <div className="flex gap-0.5">
          {!task.completed && (
            <button onClick={() => onFocus(task.id)} title="Focar nesta tarefa" className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
              <Play size={15} />
            </button>
          )}
          <button onClick={() => onEdit(task)} title="Editar" className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
            <Edit2 size={15} />
          </button>
          <button onClick={() => onDelete(task.id)} title="Excluir" className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
            <Trash2 size={15} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(task.id, -1)}
            disabled={!canMovePrev}
            aria-label="Mover para a coluna anterior"
            className="p-1.5 rounded-lg text-slate-400 enabled:hover:text-indigo-600 enabled:hover:bg-indigo-50 disabled:opacity-20 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => onMove(task.id, 1)}
            disabled={!canMoveNext}
            aria-label="Mover para a próxima coluna"
            className="p-1.5 rounded-lg text-slate-400 enabled:hover:text-emerald-600 enabled:hover:bg-emerald-50 disabled:opacity-20 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
