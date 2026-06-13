import React, { useState, useMemo, useEffect } from 'react';
import { Timer, Play, CalendarClock, ChevronRight, Check, Plus, Calendar } from 'lucide-react';
import { Task, Habit, TimeBlock, FocusSession, GoogleEvent, DailyReview, GOOGLE_EVENT_COLOR, REVIEW_MOODS } from '../types';
import { todayISO, getGreeting, formatLongDate, formatMinutes, focusMinutesOn } from '../utils';
import { TaskItem } from './TaskItem';

interface TodayViewProps {
  tasks: Task[];
  habits: Habit[];
  blocks: TimeBlock[];
  sessions: FocusSession[];
  googleActive: boolean;
  googleEvents: GoogleEvent[];
  onLoadGoogleEvents: (dateISO: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onQuickAddTask: (title: string) => void;
  onToggleHabitDay: (habitId: string, isoDate: string) => void;
  onStartFocusTask: (id: string) => void;
  onNavigate: (view: string) => void;
  review?: DailyReview | null;
  onSaveReview: (mood: number, note: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks, habits, blocks, sessions, googleActive, googleEvents, onLoadGoogleEvents,
  onToggleTask, onDeleteTask, onQuickAddTask, onToggleHabitDay, onStartFocusTask, onNavigate,
  review, onSaveReview,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [mood, setMood] = useState(review?.mood ?? 0);
  const [note, setNote] = useState(review?.note ?? '');
  const pickMood = (m: number) => { setMood(m); onSaveReview(m, note); };
  const saveNote = () => { if (mood > 0 || note.trim()) onSaveReview(mood, note); };
  const today = todayISO();
  const weekday = new Date().getDay();

  const todayTasks = useMemo(
    () => tasks.filter(t => !t.completed && !!t.dueDate && t.dueDate <= today),
    [tasks, today]
  );
  const doneToday = useMemo(
    () => tasks.filter(t => t.completed && t.completedAt?.slice(0, 10) === today).length,
    [tasks, today]
  );

  useEffect(() => {
    if (googleActive) onLoadGoogleEvents(today);
  }, [googleActive, today, onLoadGoogleEvents, googleEvents]);

  // Agenda do dia: blocos do app + eventos do Google, em ordem de horário
  const agendaItems = useMemo(() => {
    const syncedIds = new Set(blocks.map(b => b.googleEventId).filter(Boolean));
    const blockItems = blocks
      .filter(b => b.date === today)
      .map(b => ({ key: `b-${b.id}`, title: b.title, start: b.start, end: b.end, color: b.color, fromGoogle: false }));
    const eventItems = googleEvents
      .filter(ev => !ev.allDay && !syncedIds.has(ev.id))
      .map(ev => ({ key: `g-${ev.id}`, title: ev.title, start: ev.start, end: ev.end, color: ev.color ?? GOOGLE_EVENT_COLOR, fromGoogle: true }));
    return [...blockItems, ...eventItems].sort((a, b) => a.start.localeCompare(b.start));
  }, [blocks, googleEvents, today]);

  const allDayEvents = useMemo(() => googleEvents.filter(ev => ev.allDay), [googleEvents]);

  const todayHabits = useMemo(
    () => habits.filter(h => h.targetDays.includes(weekday)),
    [habits, weekday]
  );
  const habitsDone = todayHabits.filter(h => h.completions.includes(today)).length;

  const focusToday = focusMinutesOn(sessions, today);
  const pomodorosToday = sessions.filter(s => s.date === today).length;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    onQuickAddTask(title);
    setQuickTitle('');
  };

  return (
    <div className="space-y-5">
      {/* Saudação */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{getGreeting()}! 👋</h2>
        <p className="text-slate-500 text-sm capitalize">{formatLongDate()}</p>
      </div>

      {/* Resumo rápido */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-center">
          <p className="text-lg font-bold text-indigo-600">{formatMinutes(focusToday)}</p>
          <p className="text-[10px] text-slate-400 font-medium">focado hoje</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{doneToday}</p>
          <p className="text-[10px] text-slate-400 font-medium">tarefas feitas</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 text-center">
          <p className="text-lg font-bold text-orange-500">{habitsDone}/{todayHabits.length}</p>
          <p className="text-[10px] text-slate-400 font-medium">hábitos</p>
        </div>
      </div>

      {/* Card de foco */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg shadow-indigo-200">
        <div>
          <p className="font-bold">Pronto para focar?</p>
          <p className="text-xs text-indigo-200 mt-0.5">
            {pomodorosToday > 0 ? `${pomodorosToday} ${pomodorosToday === 1 ? 'pomodoro' : 'pomodoros'} hoje. Continue!` : 'Nenhum pomodoro hoje ainda.'}
          </p>
        </div>
        <button
          onClick={() => onNavigate('focus')}
          className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform shrink-0"
        >
          <Play size={16} /> Focar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tarefas de hoje */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Tarefas de hoje</h3>
            <button onClick={() => onNavigate('tasks')} className="text-xs text-indigo-600 font-medium flex items-center gap-0.5 hover:underline">
              Ver todas <ChevronRight size={12} />
            </button>
          </div>
          <form onSubmit={handleQuickAdd} className="flex gap-2 mb-3">
            <input
              type="text"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder="Nova tarefa para hoje..."
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              aria-label="Adicionar tarefa"
              className="shrink-0 w-11 flex items-center justify-center rounded-xl bg-indigo-600 text-white enabled:hover:bg-indigo-700 enabled:active:scale-95 transition-all disabled:opacity-40"
            >
              <Plus size={20} />
            </button>
          </form>
          <div className="space-y-1.5">
            {todayTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                compact
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onFocus={onStartFocusTask}
              />
            ))}
            {todayTasks.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Nada com prazo para hoje. 🎉</p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* Blocos de hoje */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Agenda de hoje</h3>
              <button onClick={() => onNavigate('planner')} className="text-xs text-indigo-600 font-medium flex items-center gap-0.5 hover:underline">
                Planejar dia <ChevronRight size={12} />
              </button>
            </div>
            {allDayEvents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {allDayEvents.map(ev => (
                  <span
                    key={ev.id}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border"
                    style={{ borderColor: `${ev.color ?? GOOGLE_EVENT_COLOR}55`, color: ev.color ?? GOOGLE_EVENT_COLOR, backgroundColor: `${ev.color ?? GOOGLE_EVENT_COLOR}10` }}
                  >
                    <Calendar size={10} /> {ev.title}
                  </span>
                ))}
              </div>
            )}
            {agendaItems.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-slate-400">
                <CalendarClock size={32} className="opacity-20 mb-2" />
                <p className="text-sm">Nenhum compromisso hoje.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {agendaItems.map(item => (
                  <div key={item.key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                    {item.fromGoogle
                      ? <Calendar size={12} className="shrink-0" style={{ color: item.color }} />
                      : <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    }
                    <span className="text-sm text-slate-600 flex-1 truncate font-medium">{item.title}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{item.start}–{item.end}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hábitos de hoje */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Hábitos de hoje</h3>
              <button onClick={() => onNavigate('habits')} className="text-xs text-indigo-600 font-medium flex items-center gap-0.5 hover:underline">
                Ver todos <ChevronRight size={12} />
              </button>
            </div>
            {todayHabits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum hábito para hoje.</p>
            ) : (
              <div className="space-y-1.5">
                {todayHabits.map(habit => {
                  const done = habit.completions.includes(today);
                  return (
                    <button
                      key={habit.id}
                      onClick={() => onToggleHabitDay(habit.id, today)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                        done ? 'border-transparent' : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                      style={done ? { backgroundColor: `${habit.color}1a` } : undefined}
                    >
                      <span className="text-base">{habit.emoji}</span>
                      <span className={`text-sm flex-1 font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                        {habit.name}
                      </span>
                      <span
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          done ? 'border-transparent text-white' : 'border-slate-200 text-transparent'
                        }`}
                        style={done ? { backgroundColor: habit.color } : undefined}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revisão do dia */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-bold text-slate-800 text-sm mb-1">Revisão do dia</h3>
        <p className="text-[11px] text-slate-400 mb-3">
          Hoje: {doneToday} {doneToday === 1 ? 'tarefa' : 'tarefas'} · {formatMinutes(focusToday)} de foco · {habitsDone}/{todayHabits.length} hábitos
        </p>
        <div className="flex items-center justify-between gap-2">
          {REVIEW_MOODS.map((emoji, i) => {
            const val = i + 1;
            return (
              <button
                key={val}
                onClick={() => pickMood(val)}
                aria-label={`Humor ${val} de 5`}
                className={`flex-1 h-11 rounded-xl text-xl transition-all ${mood === val ? 'bg-indigo-50 ring-2 ring-indigo-300 scale-105' : 'bg-slate-50 hover:bg-slate-100'}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={saveNote}
          rows={2}
          placeholder="Como foi seu dia? (opcional)"
          className="w-full mt-3 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none text-sm resize-none"
        />
        {mood > 0 && <p className="text-[11px] text-emerald-600 mt-1.5">Revisão salva ✓</p>}
      </div>
    </div>
  );
};
