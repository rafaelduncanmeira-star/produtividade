import React, { useState, useRef, useEffect } from 'react';
import { Check, Edit2, Trash2, Play, Timer, Calendar, Clock, Repeat, ListChecks, ChevronDown, MoreVertical } from 'lucide-react';
import { Task, QUADRANT_INFO, getQuadrant } from '../types';
import { todayISO, formatShortDate, addDaysISO } from '../utils';

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
  const today = todayISO();
  const overdue = !task.completed && !!task.dueDate && task.dueDate < today;
  // Prazo legível: "Hoje" / "Atrasada" / "Amanhã" / data curta, com cor por urgência.
  const dueInfo = task.dueDate
    ? overdue
      ? { text: 'Atrasada', cls: 'bg-rose-50 text-rose-700' }
      : task.dueDate === today
        ? { text: 'Hoje', cls: 'bg-teal-50 text-teal-700' }
        : task.dueDate === addDaysISO(today, 1)
          ? { text: 'Amanhã', cls: 'bg-slate-100 text-slate-500' }
          : { text: formatShortDate(task.dueDate), cls: 'bg-slate-100 text-slate-500' }
    : null;
  const subs = task.subtasks ?? [];
  const doneSubs = subs.filter(s => s.done).length;
  const [open, setOpen] = useState(false);

  // Menu de ações (⋯): posição fixa calculada a partir do botão.
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!menuPos) return;
    const close = () => setMenuPos(null);
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setMenuPos(null); };
    // Captura o scroll de qualquer container (3º arg true) para não "descolar" o menu.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuPos]);

  const openMenu = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const W = 192; // w-48
    const items = (onFocus && !task.completed ? 1 : 0) + (onEdit ? 1 : 0) + 1;
    const H = items * 46 + 16;
    const left = Math.min(Math.max(8, rect.right - W), window.innerWidth - W - 8);
    let top = rect.bottom + 6;
    if (top + H > window.innerHeight - 8) top = rect.top - H - 6; // abre pra cima se não couber
    if (top < 8) top = 8;
    setMenuPos({ top, left });
  };

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
    else if (d < -100) onDelete(task.id); // excluir exige um arrasto mais deliberado
  };

  return (
    <>
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
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform 0.2s ease', touchAction: 'pan-y', borderLeftWidth: task.completed ? undefined : 4, borderLeftColor: task.completed ? undefined : quadrant.color }}
        title={task.completed ? undefined : quadrant.hint}
        className={`relative bg-white rounded-xl border border-slate-100 hover:border-slate-200 ${compact ? 'pl-3 pr-2 py-2.5' : 'pl-4 pr-3 py-3'}`}
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
            <p className={`text-[15px] font-semibold leading-snug truncate ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {dueInfo && (
                <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${task.completed ? 'bg-slate-100 text-slate-400' : dueInfo.cls}`}>
                  <Calendar size={10} /> {dueInfo.text}
                </span>
              )}
              {task.dueTime && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  <Clock size={10} /> {task.dueTime}
                </span>
              )}
              {!compact && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${quadrant.badgeClass}`}>{quadrant.label}</span>}
              {!compact && <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{task.category}</span>}
              {task.recurrence && <Repeat size={11} className="text-slate-400 shrink-0" />}
              {subs.length > 0 && (onUpdate ? (
                <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-0.5 text-[10px] font-medium text-slate-400 hover:text-teal-700">
                  <ListChecks size={11} /> {doneSubs}/{subs.length}
                  <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-slate-400"><ListChecks size={11} /> {doneSubs}/{subs.length}</span>
              ))}
              {task.estimatedPomodoros > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
                  <Timer size={10} />
                  {task.completedPomodoros}/{task.estimatedPomodoros}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={openMenu}
            aria-label="Mais ações"
            aria-haspopup="menu"
            className={`shrink-0 -mr-1 p-2.5 rounded-lg transition active:scale-90 md:opacity-0 md:group-hover:opacity-100 ${
              menuPos ? 'text-slate-600 bg-slate-100 md:opacity-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <MoreVertical size={18} />
          </button>
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

    {menuPos && (
      <>
        <div className="fixed inset-0 z-[60]" onClick={() => setMenuPos(null)} aria-hidden />
        <div
          role="menu"
          className="fixed z-[61] w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 overflow-hidden animate-rise"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {onFocus && !task.completed && (
            <button
              role="menuitem"
              onClick={() => { setMenuPos(null); onFocus(task.id); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
            >
              <Play size={17} className="text-teal-700 shrink-0" /> Focar agora
            </button>
          )}
          {onEdit && (
            <button
              role="menuitem"
              onClick={() => { setMenuPos(null); onEdit(task); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
            >
              <Edit2 size={17} className="text-teal-700 shrink-0" /> Editar
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => { setMenuPos(null); onDelete(task.id); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100"
          >
            <Trash2 size={17} className="shrink-0" /> Excluir
          </button>
        </div>
      </>
    )}
    </>
  );
};
