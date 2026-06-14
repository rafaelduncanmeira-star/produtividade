import React, { useState } from 'react';
import { X, Save, Calendar, CalendarClock } from 'lucide-react';
import { Task, TimeBlock, BLOCK_COLORS } from '../types';
import { timeToMinutes } from '../utils';
import { googleCalendarUrl } from '../services/googleCalendar';

const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';
const fieldCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition';

interface TimeBlockFormProps {
  initialBlock?: TimeBlock | null;
  defaultDate: string;
  defaultStart?: string;
  tasks: Task[];
  onSave: (data: Omit<TimeBlock, 'id'>, id?: string) => void;
  onClose: () => void;
}

const addOneHour = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const TimeBlockForm: React.FC<TimeBlockFormProps> = ({
  initialBlock, defaultDate, defaultStart, tasks, onSave, onClose,
}) => {
  const [title, setTitle] = useState(initialBlock?.title ?? '');
  const [date, setDate] = useState(initialBlock?.date ?? defaultDate);
  const [start, setStart] = useState(initialBlock?.start ?? defaultStart ?? '09:00');
  const [end, setEnd] = useState(initialBlock?.end ?? addOneHour(initialBlock?.start ?? defaultStart ?? '09:00'));
  const [color, setColor] = useState(initialBlock?.color ?? BLOCK_COLORS[0]);
  const [taskId, setTaskId] = useState(initialBlock?.taskId ?? '');

  const pendingTasks = tasks.filter(t => !t.completed || t.id === initialBlock?.taskId);
  const invalidRange = timeToMinutes(end) <= timeToMinutes(start);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || invalidRange) return;
    onSave({
      title: title.trim(),
      date,
      start,
      end,
      color,
      taskId: taskId || undefined,
    }, initialBlock?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur sticky top-0 z-10">
          <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center"><CalendarClock size={16} strokeWidth={2.5} /></span>
            {initialBlock ? 'Editar Bloco' : 'Novo Bloco'}
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div>
            <label className={labelCls}>Título</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={fieldCls}
              placeholder="Ex: Trabalho focado, Academia..."
            />
          </div>

          <div>
            <label className={labelCls}>Data</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className={fieldCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Início</label>
              <input
                type="time"
                required
                step="900"
                value={start}
                onChange={e => setStart(e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Fim</label>
              <input
                type="time"
                required
                step="900"
                value={end}
                onChange={e => setEnd(e.target.value)}
                className={
                  invalidRange
                    ? 'w-full px-3.5 py-2.5 rounded-xl border border-rose-300 bg-white text-slate-700 focus:ring-2 focus:ring-rose-200 outline-none transition'
                    : fieldCls
                }
              />
            </div>
          </div>
          {invalidRange && <p className="text-xs text-rose-500 -mt-2">O fim precisa ser depois do início.</p>}

          <div>
            <label className={labelCls}>Cor</label>
            <div className="flex gap-3">
              {BLOCK_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-teal-200' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Tarefa vinculada (opcional)</label>
            <select
              value={taskId}
              onChange={e => setTaskId(e.target.value)}
              className={fieldCls}
            >
              <option value="">Nenhuma</option>
              {pendingTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-800 to-emerald-700 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-md shadow-teal-200">
            <Save size={18} /> Salvar Bloco
          </button>
          {title.trim() && !invalidRange && (
            <a
              href={googleCalendarUrl({ title, date, start, end })}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:border-[#4285F4] hover:text-[#4285F4] flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <Calendar size={16} /> Adicionar ao Google Agenda
            </a>
          )}
        </form>
      </div>
    </div>
  );
};
