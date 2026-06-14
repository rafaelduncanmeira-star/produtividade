import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Habit, HABIT_COLORS, HABIT_EMOJIS, WEEKDAY_LETTERS } from '../types';

interface HabitFormProps {
  initialHabit?: Habit | null;
  onSave: (data: Omit<Habit, 'id'>, id?: string) => void;
  onClose: () => void;
}

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
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
          <h3 className="font-bold text-slate-800">{initialHabit ? 'Editar Hábito' : 'Novo Hábito'}</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome do Hábito</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-200 outline-none"
              placeholder="Ex: Meditar 10 minutos..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ícone</label>
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
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cor</label>
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
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Em quais dias?</label>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_LETTERS.map((letter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`h-10 rounded-xl text-sm font-bold transition-colors ${
                    targetDays.includes(i) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
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

          <button type="submit" className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 flex items-center justify-center gap-2 mt-2">
            <Save size={18} /> Salvar Hábito
          </button>
        </form>
      </div>
    </div>
  );
};
