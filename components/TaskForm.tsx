import React, { useState } from 'react';
import { X, Save, Zap, Star, Plus, Check, Calendar } from 'lucide-react';
import { Task, Subtask, Project, RecurrenceFreq, QUADRANT_INFO, getQuadrant, DEFAULT_TASK_CATEGORIES, RECURRENCE_OPTIONS } from '../types';
import { uid } from '../utils';
import { googleAllDayUrl } from '../services/googleCalendar';

interface TaskFormProps {
  initialTask?: Task | null;
  projects?: Project[];
  defaultProjectId?: string;
  onSave: (data: Omit<Task, 'id'>, id?: string) => void;
  onClose: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ initialTask, projects, defaultProjectId, onSave, onClose }) => {
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [urgent, setUrgent] = useState(initialTask?.urgent ?? false);
  const [important, setImportant] = useState(initialTask?.important ?? true);
  const [dueDate, setDueDate] = useState(initialTask?.dueDate ?? '');
  const [category, setCategory] = useState(initialTask?.category ?? DEFAULT_TASK_CATEGORIES[0]);
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(String(initialTask?.estimatedPomodoros ?? 1));
  const [recurrence, setRecurrence] = useState<'' | RecurrenceFreq>(initialTask?.recurrence ?? '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialTask?.subtasks ?? []);
  const [newSub, setNewSub] = useState('');
  const [projectId, setProjectId] = useState(initialTask?.projectId ?? defaultProjectId ?? '');

  const quadrant = QUADRANT_INFO[getQuadrant({ urgent, important })];

  const addSub = () => {
    const t = newSub.trim();
    if (!t) return;
    setSubtasks(prev => [...prev, { id: uid(), title: t, done: false }]);
    setNewSub('');
  };
  const toggleSub = (id: string) => setSubtasks(prev => prev.map(s => (s.id === id ? { ...s, done: !s.done } : s)));
  const renameSub = (id: string, title: string) => setSubtasks(prev => prev.map(s => (s.id === id ? { ...s, title } : s)));
  const removeSub = (id: string) => setSubtasks(prev => prev.filter(s => s.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const cleanSubs = subtasks.map(s => ({ ...s, title: s.title.trim() })).filter(s => s.title);
    onSave({
      title: title.trim(),
      urgent,
      important,
      dueDate: dueDate || undefined,
      category,
      estimatedPomodoros: Math.max(0, parseInt(estimatedPomodoros) || 0),
      completedPomodoros: initialTask?.completedPomodoros ?? 0,
      completed: initialTask?.completed ?? false,
      completedAt: initialTask?.completedAt,
      status: initialTask?.status,
      recurrence: recurrence || undefined,
      recurrenceSpawned: initialTask?.recurrenceSpawned,
      subtasks: cleanSubs.length ? cleanSubs : undefined,
      projectId: projectId || undefined,
      createdAt: initialTask?.createdAt ?? new Date().toISOString(),
    }, initialTask?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
          <h3 className="font-bold text-slate-800">{initialTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">O que precisa ser feito?</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="Ex: Preparar apresentação..."
            />
          </div>

          {/* Matriz de Eisenhower: urgência e importância */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setUrgent(!urgent)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                urgent ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
              }`}
            >
              <Zap size={18} className={urgent ? 'text-rose-500' : 'text-slate-300'} />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">É urgente?</p>
                <p className="text-xs text-slate-400">Tem prazo imediato ou consequência se esperar</p>
              </div>
              <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${urgent ? 'bg-rose-500' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${urgent ? 'translate-x-4' : ''}`} />
              </div>
            </button>
            <button
              type="button"
              onClick={() => setImportant(!important)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                important ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
              }`}
            >
              <Star size={18} className={important ? 'text-indigo-500' : 'text-slate-300'} />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">É importante?</p>
                <p className="text-xs text-slate-400">Contribui para seus objetivos de longo prazo</p>
              </div>
              <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${important ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${important ? 'translate-x-4' : ''}`} />
              </div>
            </button>
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-slate-400">Quadrante:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${quadrant.badgeClass}`}>{quadrant.label}</span>
              <span className="text-[10px] text-slate-400">({quadrant.hint})</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Prazo</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pomodoros</label>
              <input
                type="number"
                min="0"
                max="20"
                value={estimatedPomodoros}
                onChange={e => setEstimatedPomodoros(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-slate-600"
            >
              {DEFAULT_TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {projects && projects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Meta</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-slate-600"
              >
                <option value="">Nenhuma</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Repetir</label>
            <select
              value={recurrence}
              onChange={e => setRecurrence(e.target.value as '' | RecurrenceFreq)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-slate-600"
            >
              {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {recurrence && <p className="text-[11px] text-slate-400 mt-1">Ao concluir, a próxima ocorrência é criada automaticamente.</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtarefas</label>
              {subtasks.length > 0 && (
                <span className="text-[11px] text-slate-400">{subtasks.filter(s => s.done).length}/{subtasks.length}</span>
              )}
            </div>
            <div className="space-y-1.5">
              {subtasks.map(st => (
                <div key={st.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSub(st.id)}
                    aria-label={st.done ? 'Desmarcar passo' : 'Marcar passo'}
                    className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${st.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>
                  <input
                    value={st.title}
                    onChange={e => renameSub(st.id, e.target.value)}
                    className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 ${st.done ? 'line-through text-slate-400' : ''}`}
                  />
                  <button type="button" onClick={() => removeSub(st.id)} aria-label="Remover passo" className="p-1 text-slate-300 hover:text-rose-600 shrink-0">
                    <X size={15} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  value={newSub}
                  onChange={e => setNewSub(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }}
                  placeholder="Adicionar passo..."
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-dashed border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <button type="button" onClick={addSub} aria-label="Adicionar subtarefa" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 mt-2 active:scale-[0.98] transition-transform">
            <Save size={18} /> Salvar Tarefa
          </button>
          {dueDate && title.trim() && (
            <a
              href={googleAllDayUrl(title, dueDate)}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:border-[#4285F4] hover:text-[#4285F4] flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Calendar size={16} /> Adicionar prazo ao Google Agenda
            </a>
          )}
        </form>
      </div>
    </div>
  );
};
