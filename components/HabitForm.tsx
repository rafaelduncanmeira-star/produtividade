import React, { useState } from 'react';
import { X, Save, Repeat } from 'lucide-react';
import { Habit, HABIT_COLORS, HABIT_EMOJIS, WEEKDAY_LETTERS } from '../types';

interface HabitFormProps {
  initialHabit?: Habit | null;
  onSave: (data: Omit<Habit, 'id'>, id?: string) => void;
  onClose: () => void;
}

const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';
const fieldCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition';

export const HabitForm: React.FC<HabitFormProps> = ({ initialHabit, onSave, onClose }) => {
  const [name, setName] = useState(initialHabit?.name ?? '');
  const [emoji, setEmoji] = useState(initialHabit?.emoji ?? HABIT_EMOJIS[0]);
  const [color, setColor] = useState(initialHabit?.color ?? HABIT_COLORS[0]);
  const [targetDays, setTargetDays] = useState<number[]>(initialHabit?.targetDays ?? [0, 1, 2, 3, 4, 5, 6]);

  const toggleDay = (day: number) => {
    setTargetDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || targetDays.length === 0) return;
    onSave({
      name: name.trim(),
      emoji,
      color,
      targetDays,
      completions: initialHabit?.completions ?? [],
      createdAt: initialHabit?.createdAt ?? new Date().toISOString(),
    }, initialHabit?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur sticky top-0 z-10">
          <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center"><Repeat size={16} strokeWidth={2.5} /></span>
            {initialHabit ? 'Editar Hábito' : 'Novo Hábito'}
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div>
            <label className={labelCls}>Nome do Hábito</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className={fieldCls}
              placeholder="Ex: Meditar 10 minutos..."
            />
          </div>

          <div>
            <label className={labelCls}>Ícone</label>
            <div className="grid grid-cols-6 gap-2">
              {HABIT_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                    emoji === e ? 'bg-teal-50 ring-2 ring-teal-300 scale-105' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Cor</label>
            <div className="flex gap-3">
              {HABIT_COLORS.map(c => (
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
            <label className={labelCls}>Em quais dias?</label>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_LETTERS.map((letter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`h-10 rounded-xl text-sm font-bold transition-colors ${
                    targetDays.includes(i) ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
            {targetDays.length === 0 && (
              <p className="text-xs text-rose-500 mt-1.5">Escolha pelo menos um dia da semana.</p>
            )}
          </div>

          <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-800 to-emerald-700 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-md shadow-teal-200">
            <Save size={18} /> Salvar Hábito
          </button>
        </form>
      </div>
    </div>
  );
};
