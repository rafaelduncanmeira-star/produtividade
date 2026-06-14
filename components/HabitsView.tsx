import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Flame, Trophy, Check, Edit2, Trash2, Repeat } from 'lucide-react';
import { Habit, WEEKDAY_LETTERS } from '../types';
import { todayISO, getWeekDays, calcStreaks, parseISODate, formatShortDate } from '../utils';
import { HabitForm } from './HabitForm';

interface HabitsViewProps {
  habits: Habit[];
  onAddHabit: (data: Omit<Habit, 'id'>) => void;
  onUpdateHabit: (habit: Habit) => void;
  onDeleteHabit: (id: string) => void;
  onToggleDay: (habitId: string, isoDate: string) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits, onAddHabit, onUpdateHabit, onDeleteHabit, onToggleDay,
}) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const today = todayISO();
  const weekDays = getWeekDays(weekOffset);

  const handleSave = (data: Omit<Habit, 'id'>, id?: string) => {
    if (id) {
      const existing = habits.find(h => h.id === id);
      onUpdateHabit({ ...data, id, completions: existing?.completions ?? [] });
    } else {
      onAddHabit(data);
    }
    setIsFormOpen(false);
    setEditingHabit(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hábitos</h2>
          <p className="text-slate-500 text-sm">Consistência diária constrói grandes resultados.</p>
        </div>
        <button
          onClick={() => { setEditingHabit(null); setIsFormOpen(true); }}
          className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md shadow-indigo-200 active:scale-95"
        >
          <Plus size={18} />
          <span>Novo Hábito</span>
        </button>
      </div>

      {/* Navegação de semana */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-3 py-2">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg">
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setWeekOffset(0)}
          className={`text-sm font-medium ${weekOffset === 0 ? 'text-slate-700' : 'text-indigo-600 hover:underline'}`}
        >
          {weekOffset === 0 ? 'Esta semana' : `${formatShortDate(weekDays[0])} – ${formatShortDate(weekDays[6])}`}
        </button>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= 0}
          className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg disabled:opacity-30 disabled:hover:text-slate-400"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="space-y-3">
        {habits.map(habit => {
          const streaks = calcStreaks(habit, today);
          return (
            <div key={habit.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `${habit.color}20` }}
                >
                  {habit.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{habit.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-bold text-orange-500">
                      <Flame size={12} /> {streaks.current} {streaks.current === 1 ? 'dia' : 'dias'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy size={12} /> recorde: {streaks.best}
                    </span>
                  </div>
                </div>
                <div className="flex gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingHabit(habit); setIsFormOpen(true); }}
                    className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteHabit(habit.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Grade da semana */}
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((iso, i) => {
                  const isTarget = habit.targetDays.includes(i);
                  const isFuture = iso > today;
                  const done = habit.completions.includes(iso);
                  const isToday = iso === today;
                  const disabled = !isTarget || isFuture;
                  return (
                    <button
                      key={iso}
                      onClick={() => !disabled && onToggleDay(habit.id, iso)}
                      disabled={disabled}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors min-h-[58px] ${
                        done
                          ? 'border-transparent text-white'
                          : disabled
                            ? 'border-slate-100 bg-slate-50/50 text-slate-300'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      } ${isToday && !done ? 'ring-2 ring-indigo-200' : ''}`}
                      style={done ? { backgroundColor: habit.color } : undefined}
                    >
                      <span className="text-[10px] font-bold opacity-70">{WEEKDAY_LETTERS[i]}</span>
                      {done
                        ? <Check size={16} strokeWidth={3} />
                        : <span className="text-xs font-medium">{parseISODate(iso).getDate()}</span>
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {habits.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <Repeat size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Nenhum hábito criado.</p>
            <button
              onClick={() => { setEditingHabit(null); setIsFormOpen(true); }}
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition"
            >
              <Plus size={16} /> Criar primeiro hábito
            </button>
          </div>
        )}
      </div>

      {/* FAB (mobile) */}
      <button
        onClick={() => { setEditingHabit(null); setIsFormOpen(true); }}
        aria-label="Novo hábito"
        className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus size={26} />
      </button>

      {isFormOpen && (
        <HabitForm
          initialHabit={editingHabit}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditingHabit(null); }}
        />
      )}
    </div>
  );
};
