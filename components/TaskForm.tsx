import React, { useState } from 'react';
import { X, Save, Zap, Star, Plus, Check, Calendar } from 'lucide-react';
import { Task, Subtask, Project, RecurrenceFreq, QUADRANT_INFO, getQuadrant, DEFAULT_TASK_CATEGORIES, RECURRENCE_OPTIONS } from '../types';
import { uid, todayISO } from '../utils';
import { googleAllDayUrl } from '../services/googleCalendar';

interface TaskFormProps {
  initialTask?: Task | null;
  projects?: Project[];
  defaultProjectId?: string;
  onSave: (data: Omit<Task, 'id'>, id?: string) => void;
  onClose: () => void;
}

const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';
const fieldCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition';

export const TaskForm: React.FC<TaskFormProps> = ({ initialTask, projects, defaultProjectId, onSave, onClose }) => {
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [urgent, setUrgent] = useState(initialTask?.urgent ?? false);
  const [important, setImportant] = useState(initialTask?.important ?? true);
  const [dueDate, setDueDate] = useState(initialTask?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(initialTask?.dueTime ?? '');
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
      dueDate: dueDate || (dueTime ? todayISO() : undefined),
      dueTime: dueTime || undefined,
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

  const doneSubs = subtasks.filter(s => s.done).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur sticky top-0 z-10">
          <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center"><Check size={16} strokeWidth={2.5} /></span>
            {initialTask ? 'Editar tarefa' : 'Nova tarefa'}
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div>
            <label className={labelCls}>O que precisa ser feito?</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`${fieldCls} text-base font-medium`}
              placeholder="Ex: Preparar apresentação..."
            />
          </div>

          {/* Classificação: urgência e importância (Matriz de Eisenhower) */}
          <div>
            <label className={labelCls}>Classificação</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setUrgent(!urgent)}
                className={`p-3 rounded-xl border text-left transition ${urgent ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Zap size={18} className={urgent ? 'text-rose-500' : 'text-slate-300'} />
                  <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${urgent ? 'bg-rose-500' : 'bg-slate-200'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${urgent ? 'translate-x-4' : ''}`} />
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-700">Urgente</p>
                <p className="text-[11px] text-slate-400 leading-snug">Tem prazo imediato</p>
              </button>
              <button
                type="button"
                onClick={() => setImportant(!important)}
                className={`p-3 rounded-xl border text-left transition ${important ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Star size={18} className={important ? 'text-teal-500' : 'text-slate-300'} />
                  <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${important ? 'bg-teal-700' : 'bg-slate-200'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${important ? 'translate-x-4' : ''}`} />
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-700">Importante</p>
                <p className="text-[11px] text-slate-400 leading-snug">Ajuda nos seus objetivos</p>
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${quadrant.color}14` }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: quadrant.color }} />
              <span className="text-xs font-bold text-slate-700">{quadrant.label}</span>
              <span className="text-[11px] text-slate-400">· {quadrant.hint}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prazo</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={`${fieldCls} appearance-none`}
              />
            </div>
            <div>
              <label className={labelCls}>Hora <span className="font-normal text-slate-300">(opcional)</span></label>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className={`${fieldCls} appearance-none`}
              />
            </div>
          </div>
          {dueTime && <p className="text-[11px] text-slate-400 -mt-3">Com horário, a tarefa também aparece na sua Agenda do dia.</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={fieldCls}>
                {DEFAULT_TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Pomodoros</label>
              <input
                type="number"
                min="0"
                max="20"
                value={estimatedPomodoros}
                onChange={e => setEstimatedPomodoros(e.target.value)}
                className={fieldCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Repetir</label>
            <select value={recurrence} onChange={e => setRecurrence(e.target.value as '' | RecurrenceFreq)} className={fieldCls}>
              {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {recurrence && <p className="text-[11px] text-slate-400 mt-1.5">Ao concluir, a próxima ocorrência é criada automaticamente.</p>}
          </div>

          {projects && projects.length > 0 && (
            <div>
              <label className={labelCls}>Meta</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className={fieldCls}>
                <option value="">Nenhuma</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-500">Subtarefas</label>
              {subtasks.length > 0 && <span className="text-[11px] text-slate-400">{doneSubs}/{subtasks.length}</span>}
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
                    className={`flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 ${st.done ? 'line-through text-slate-400' : 'text-slate-700'}`}
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
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
                <button type="button" onClick={addSub} aria-label="Adicionar subtarefa" className="shrink-0 w-9 h-9 flex items-center justify-center text-teal-700 hover:bg-teal-50 rounded-lg">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-800 to-emerald-700 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-md shadow-teal-200">
              <Save size={18} /> Salvar tarefa
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
          </div>
        </form>
      </div>
    </div>
  );
};
