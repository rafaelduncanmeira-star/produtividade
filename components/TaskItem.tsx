import React, { useState, useRef, useEffect } from 'react';
import { Check, Edit2, Trash2, Play, Timer, Calendar, Clock, Repeat, ListChecks, ChevronDown } from 'lucide-react';
import { Task, QUADRANT_INFO, getQuadrant } from '../types';
import { todayISO, formatShortDate } from '../utils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (task: Task) => void;
  onFocus?: (id: string) => void;
  onUpdate?: (task: Task) => void;
  compact?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onEdit, onFocus, onUpdate, compact }) => {
  const quadrant = QUADRANT_INFO[getQuadrant(task)];
  const overdue = !task.completed && !!task.dueDate && task.dueDate < todayISO();
  const subs = task.subtasks ?? [];
  const doneSubs = subs.filter(s => s.done).length;
  const [open, setOpen] = useState(false);

  // "Pop" no check ao concluir
  const [pop, setPop] = useState(false);
  const prevDone = useRef(task.completed);
  useEffect(() => {
    if (task.completed && !prevDone.current) {
      setPop(true);
      const id = setTimeout(() => setPop(false), 330);
      prevDone.current = task.completed;
      return () => clearTimeout(id);
    }
    prevDone.current = task.completed;
  }, [task.completed]);

  // Swipe (só toque): arrastar p/ direita conclui, p/ esquerda exclui
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const dir = useRef<null | 'h' | 'v'>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const dxRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    active.current = true;
    dir.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!active.current) return;
    const ddx = e.clientX - startX.current;
    const ddy = e.clientY - startY.current;
    if (dir.current === null) {
      if (Math.abs(ddx) < 6 && Math.abs(ddy) < 6) return;
      dir.current = Math.abs(ddx) > Math.abs(ddy) ? 'h' : 'v';
      if (dir.current === 'h') { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
    }
    if (dir.current === 'h') {
      const clamped = Math.max(-120, Math.min(120, ddx));
      dxRef.current = clamped;
      setDx(clamped);
    }
  };
  const endSwipe = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    const d = dxRef.current;
    dxRef.current = 0;
    setDx(0);
    const wasH = dir.current === 'h';
    dir.current = null;
    if (!wasH) return;
    if (d > 75) onToggle(task.id);
    else if (d < -75) onDelete(task.id);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Fundo revelado ao deslizar */}
      {dx !== 0 && (
        <div className={`absolute inset-0 flex items-center px-5 rounded-xl text-white font-semibold text-sm ${dx > 0 ? 'justify-start bg-emerald-500' : 'justify-end bg-rose-500'}`}>
          {dx > 0
            ? <span className="flex items-center gap-1.5"><Check size={18} /> {task.completed ? 'Reabrir' : 'Concluir'}</span>
            : <span className="flex items-center gap-1.5">Excluir <Trash2 size={18} /></span>}
        </div>
      )}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform 0.2s ease', touchAction: 'pan-y' }}
        className={`relative bg-white rounded-xl border border-slate-100 hover:border-slate-200 ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
      >
        <div className="group flex items-center gap-3">
          <button
            onClick={() => onToggle(task.id)}
            aria-label={task.completed ? 'Reabrir tarefa' : 'Concluir tarefa'}
            className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${pop ? 'animate-pop' : ''} ${
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
              {subs.length > 0 && (onUpdate ? (
                <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-0.5 text-[10px] font-medium text-slate-400 hover:text-teal-700">
                  <ListChecks size={11} /> {doneSubs}/{subs.length}
                  <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-slate-400"><ListChecks size={11} /> {doneSubs}/{subs.length}</span>
              ))}
              {!compact && <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{task.category}</span>}
              {task.dueDate && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${overdue ? 'text-rose-600' : 'text-slate-400'}`}>
                  <Calendar size={10} />
                  {overdue ? `Atrasada ${formatShortDate(task.dueDate)}` : formatShortDate(task.dueDate)}
                </span>
              )}
              {task.dueTime && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-slate-400">
                  <Clock size={10} /> {task.dueTime}
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
                className="p-2 text-slate-300 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
              >
                <Play size={16} />
              </button>
            )}
            {onEdit && (
              <button onClick={() => onEdit(task)} className="p-2 text-slate-300 hover:text-teal-700 hover:bg-teal-50 rounded-lg">
                <Edit2 size={16} />
              </button>
            )}
            <button onClick={() => onDelete(task.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {open && onUpdate && subs.length > 0 && (
          <div className="mt-2 pl-9 space-y-1">
            {subs.map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => onUpdate({ ...task, subtasks: subs.map(s => (s.id === st.id ? { ...s, done: !s.done } : s)) })}
                className="w-full flex items-center gap-2 text-left"
              >
                <span className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${st.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}>
                  <Check size={10} strokeWidth={3} />
                </span>
                <span className={`text-xs ${st.done ? 'line-through text-slate-400' : 'text-slate-600'}`}>{st.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
