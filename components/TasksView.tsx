import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Plus, List, LayoutGrid, CheckSquare, Columns3, Search, X, Info } from 'lucide-react';
import { Task, TaskStatus, Project, QUADRANTS, QUADRANT_INFO, getQuadrant, getTaskStatus, KANBAN_COLUMNS, DEFAULT_TASK_CATEGORIES } from '../types';
import { todayISO, getWeekDays } from '../utils';
import { TaskItem } from './TaskItem';
import { KanbanCard } from './KanbanCard';
import { TaskForm } from './TaskForm';
import { EisenhowerInfo } from './EisenhowerInfo';

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (data: Omit<Task, 'id'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (id: string) => void;
  onSetStatus: (id: string, status: TaskStatus) => void;
  onStartFocusTask: (id: string) => void;
  projects: Project[];
}

type Mode = 'list' | 'matrix' | 'board';
type Filter = 'hoje' | 'semana' | 'todas' | 'concluidas';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'todas', label: 'Todas' },
  { id: 'concluidas', label: 'Concluídas' },
];

const QUADRANT_ORDER: Record<string, number> = { q1: 0, q2: 1, q3: 2, q4: 3 };
const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'done'];

// normaliza p/ busca (minúsculas, sem acentos)
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export const TasksView: React.FC<TasksViewProps> = ({
  tasks, onAddTask, onUpdateTask, onDeleteTask, onToggleTask, onSetStatus, onStartFocusTask, projects,
}) => {
  const [mode, setMode] = useState<Mode>('list');
  const [filter, setFilter] = useState<Filter>('todas');
  const [quickTitle, setQuickTitle] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [addStatus, setAddStatus] = useState<TaskStatus | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const colRefs = useRef<Partial<Record<TaskStatus, HTMLDivElement | null>>>({});
  const [drag, setDrag] = useState<{ id: string; title: string; x: number; y: number; over: TaskStatus | null } | null>(null);

  const today = todayISO();
  const weekEnd = getWeekDays()[6];

  const matches = useCallback((t: Task) => {
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const q = norm(search);
    return norm(t.title).includes(q) || (t.subtasks ?? []).some(s => norm(s.title).includes(q));
  }, [search, categoryFilter]);

  const sortByQuadrant = (list: Task[]) =>
    [...list].sort((a, b) => QUADRANT_ORDER[getQuadrant(a)] - QUADRANT_ORDER[getQuadrant(b)]);

  const src = useMemo(() => tasks.filter(matches), [tasks, matches]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'hoje':
        return sortByQuadrant(src.filter(t => !t.completed && !!t.dueDate && t.dueDate <= today));
      case 'semana':
        return sortByQuadrant(src.filter(t => !t.completed && !!t.dueDate && t.dueDate <= weekEnd));
      case 'todas':
        return sortByQuadrant(src.filter(t => !t.completed));
      case 'concluidas':
        return [...src.filter(t => t.completed)]
          .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    }
  }, [src, filter, today, weekEnd]);

  const pending = useMemo(() => src.filter(t => !t.completed), [src]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    onAddTask({
      title, urgent: false, important: true,
      dueDate: filter === 'hoje' ? today : undefined,
      category: 'Outros', estimatedPomodoros: 1, completedPomodoros: 0,
      completed: false, createdAt: new Date().toISOString(),
    });
    setQuickTitle('');
  };

  const handleSave = (data: Omit<Task, 'id'>, id?: string) => {
    if (id) {
      onUpdateTask({ ...data, id });
    } else if (addStatus) {
      const done = addStatus === 'done';
      onAddTask({ ...data, status: addStatus, completed: done, completedAt: done ? new Date().toISOString() : undefined });
    } else {
      onAddTask(data);
    }
    setIsFormOpen(false);
    setEditingTask(null);
    setAddStatus(null);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setAddStatus(null);
    setIsFormOpen(true);
  };

  // Abre o formulário já mirando uma coluna do Quadro (A fazer / Fazendo / Concluído)
  const openAdd = (status: TaskStatus) => {
    setEditingTask(null);
    setAddStatus(status);
    setIsFormOpen(true);
  };

  // Kanban: move a tarefa uma coluna para trás (-1) ou para frente (+1)
  const moveTask = (task: Task, dir: -1 | 1) => {
    const cur = getTaskStatus(task);
    const next = STATUS_ORDER[Math.min(2, Math.max(0, STATUS_ORDER.indexOf(cur) + dir))];
    if (next === cur) return;
    onSetStatus(task.id, next);
  };

  // Kanban: arrastar (dedo ou mouse) via Pointer Events
  const colAt = (x: number, y: number): TaskStatus | null => {
    for (const col of KANBAN_COLUMNS) {
      const el = colRefs.current[col.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return col.id;
    }
    return null;
  };

  const startDrag = (e: React.PointerEvent, task: Task) => {
    e.preventDefault();
    const id = task.id;
    const from = getTaskStatus(task);
    document.body.style.userSelect = 'none';
    setDrag({ id, title: task.title, x: e.clientX, y: e.clientY, over: from });
    const move = (ev: PointerEvent) =>
      setDrag(d => (d ? { ...d, x: ev.clientX, y: ev.clientY, over: colAt(ev.clientX, ev.clientY) } : d));
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
      const over = colAt(ev.clientX, ev.clientY);
      setDrag(null);
      if (over && over !== from) onSetStatus(id, over);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tarefas</h2>
          <p className="text-slate-500 text-sm flex items-center gap-1.5">
            Priorize com a Matriz de Eisenhower.
            <button
              onClick={() => setShowInfo(true)}
              aria-label="Como usar a Matriz de Eisenhower"
              title="Como usar a Matriz de Eisenhower?"
              className="text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <Info size={15} />
            </button>
          </p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setAddStatus(null); setIsFormOpen(true); }}
          className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md shadow-indigo-200 active:scale-95"
        >
          <Plus size={18} />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Alternância lista/matriz */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'list' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
          >
            <List size={16} /> Lista
          </button>
          <button
            onClick={() => setMode('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'matrix' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
          >
            <LayoutGrid size={16} /> Matriz
          </button>
          <button
            onClick={() => setMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'board' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
          >
            <Columns3 size={16} /> Quadro
          </button>
        </div>

        {mode === 'list' && (
          <div className="flex bg-slate-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === f.id ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Busca + categoria */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tarefa..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none text-sm bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          aria-label="Filtrar por categoria"
          className="shrink-0 px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none text-sm bg-white text-slate-600"
        >
          <option value="">Todas categorias</option>
          {DEFAULT_TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Quick add */}
      {filter !== 'concluidas' && (
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input
            type="text"
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder="Adicionar tarefa rápida..."
            className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none text-sm bg-white"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            aria-label="Adicionar tarefa"
            className="shrink-0 w-12 flex items-center justify-center rounded-xl bg-indigo-600 text-white enabled:hover:bg-indigo-700 enabled:active:scale-95 transition-all disabled:opacity-40"
          >
            <Plus size={20} />
          </button>
        </form>
      )}

      {mode === 'list' ? (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              onEdit={openEdit}
              onFocus={onStartFocusTask}
              onUpdate={onUpdateTask}
            />
          ))}
          {filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <CheckSquare size={48} className="mb-4 opacity-20" />
              <p className="text-sm">{filter === 'concluidas' ? 'Nenhuma tarefa concluída ainda.' : 'Nenhuma tarefa por aqui. Aproveite! 🎉'}</p>
              {filter !== 'concluidas' && (
                <button
                  onClick={() => { setEditingTask(null); setAddStatus(null); setIsFormOpen(true); }}
                  className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition"
                >
                  <Plus size={16} /> Nova tarefa
                </button>
              )}
            </div>
          )}
        </div>
      ) : mode === 'matrix' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUADRANTS.map(q => {
            const info = QUADRANT_INFO[q];
            const qTasks = pending.filter(t => getQuadrant(t) === q);
            return (
              <div key={q} className={`rounded-2xl border-2 ${info.cellClass} p-4 min-h-[140px]`}>
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{info.label}</h3>
                    <p className="text-[11px] text-slate-400">{info.hint}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-100">{qTasks.length}</span>
                </div>
                <div className="space-y-1.5">
                  {qTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      compact
                      onToggle={onToggleTask}
                      onDelete={onDeleteTask}
                      onEdit={openEdit}
                      onFocus={onStartFocusTask}
                      onUpdate={onUpdateTask}
                    />
                  ))}
                  {qTasks.length === 0 && (
                    <p className="text-xs text-slate-300 text-center py-4">Vazio</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {KANBAN_COLUMNS.map((col, colIndex) => {
            const colTasks = src.filter(t => getTaskStatus(t) === col.id);
            const sorted = col.id === 'done'
              ? [...colTasks].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
              : sortByQuadrant(colTasks);
            return (
              <div
                key={col.id}
                ref={el => { colRefs.current[col.id] = el; }}
                className={`rounded-2xl border-2 p-3 transition-colors ${drag && drag.over === col.id ? 'border-indigo-400 bg-indigo-50/60' : `${col.ringClass} bg-white/60`}`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`} />
                    <h3 className="font-bold text-slate-700 text-sm">{col.label}</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{sorted.length}</span>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                  {sorted.map(task => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onToggle={onToggleTask}
                      onDelete={onDeleteTask}
                      onEdit={openEdit}
                      onFocus={onStartFocusTask}
                      onMove={(_id, dir) => moveTask(task, dir)}
                      onDragStart={startDrag}
                      dragging={drag?.id === task.id}
                      canMovePrev={colIndex > 0}
                      canMoveNext={colIndex < KANBAN_COLUMNS.length - 1}
                    />
                  ))}
                  <button
                    onClick={() => openAdd(col.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fantasma seguindo o cursor durante o arraste */}
      {drag && (
        <div
          className="fixed z-[60] pointer-events-none -translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-xl bg-white shadow-xl border border-indigo-200 text-sm font-medium text-slate-700 max-w-[220px] truncate opacity-90"
          style={{ left: drag.x, top: drag.y }}
        >
          {drag.title}
        </div>
      )}

      {isFormOpen && (
        <TaskForm
          initialTask={editingTask}
          projects={projects}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditingTask(null); setAddStatus(null); }}
        />
      )}
      {showInfo && <EisenhowerInfo onClose={() => setShowInfo(false)} />}
    </div>
  );
};
