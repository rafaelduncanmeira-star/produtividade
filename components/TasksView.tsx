import React, { useState, useMemo } from 'react';
import { Plus, List, LayoutGrid, CheckSquare, Columns3 } from 'lucide-react';
import { Task, TaskStatus, QUADRANTS, QUADRANT_INFO, getQuadrant, getTaskStatus, KANBAN_COLUMNS } from '../types';
import { todayISO, getWeekDays } from '../utils';
import { TaskItem } from './TaskItem';
import { TaskForm } from './TaskForm';

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (data: Omit<Task, 'id'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (id: string) => void;
  onStartFocusTask: (id: string) => void;
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

export const TasksView: React.FC<TasksViewProps> = ({
  tasks, onAddTask, onUpdateTask, onDeleteTask, onToggleTask, onStartFocusTask,
}) => {
  const [mode, setMode] = useState<Mode>('list');
  const [filter, setFilter] = useState<Filter>('todas');
  const [quickTitle, setQuickTitle] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = todayISO();
  const weekEnd = getWeekDays()[6];

  const sortByQuadrant = (list: Task[]) =>
    [...list].sort((a, b) => QUADRANT_ORDER[getQuadrant(a)] - QUADRANT_ORDER[getQuadrant(b)]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'hoje':
        return sortByQuadrant(tasks.filter(t => !t.completed && !!t.dueDate && t.dueDate <= today));
      case 'semana':
        return sortByQuadrant(tasks.filter(t => !t.completed && !!t.dueDate && t.dueDate <= weekEnd));
      case 'todas':
        return sortByQuadrant(tasks.filter(t => !t.completed));
      case 'concluidas':
        return [...tasks.filter(t => t.completed)]
          .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    }
  }, [tasks, filter, today, weekEnd]);

  const pending = useMemo(() => tasks.filter(t => !t.completed), [tasks]);

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
    if (id) onUpdateTask({ ...data, id });
    else onAddTask(data);
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  // Kanban: move a tarefa uma coluna para trás (-1) ou para frente (+1)
  const moveTask = (task: Task, dir: -1 | 1) => {
    const cur = getTaskStatus(task);
    const next = STATUS_ORDER[Math.min(2, Math.max(0, STATUS_ORDER.indexOf(cur) + dir))];
    if (next === cur) return;
    onUpdateTask({
      ...task,
      status: next,
      completed: next === 'done',
      completedAt: next === 'done' ? (task.completedAt ?? new Date().toISOString()) : undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tarefas</h2>
          <p className="text-slate-500 text-sm">Priorize com a Matriz de Eisenhower.</p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
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

      {/* Quick add */}
      {filter !== 'concluidas' && (
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input
            type="text"
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder="Adicionar tarefa rápida e apertar Enter..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none text-sm bg-white"
          />
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
            />
          ))}
          {filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <CheckSquare size={48} className="mb-4 opacity-20" />
              <p className="text-sm">{filter === 'concluidas' ? 'Nenhuma tarefa concluída ainda.' : 'Nenhuma tarefa por aqui. Aproveite! 🎉'}</p>
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
            const colTasks = tasks.filter(t => getTaskStatus(t) === col.id);
            const sorted = col.id === 'done'
              ? [...colTasks].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
              : sortByQuadrant(colTasks);
            return (
              <div key={col.id} className={`rounded-2xl border-2 ${col.ringClass} bg-white/60 p-3`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`} />
                    <h3 className="font-bold text-slate-700 text-sm">{col.label}</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{sorted.length}</span>
                </div>
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto no-scrollbar">
                  {sorted.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      compact
                      onToggle={onToggleTask}
                      onDelete={onDeleteTask}
                      onEdit={openEdit}
                      onFocus={onStartFocusTask}
                      onMove={(_id, dir) => moveTask(task, dir)}
                      canMovePrev={colIndex > 0}
                      canMoveNext={colIndex < KANBAN_COLUMNS.length - 1}
                    />
                  ))}
                  {sorted.length === 0 && (
                    <p className="text-xs text-slate-300 text-center py-6">Vazio</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB (mobile) */}
      <button
        onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
        aria-label="Nova tarefa"
        className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus size={26} />
      </button>

      {isFormOpen && (
        <TaskForm
          initialTask={editingTask}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
};
