import React, { useState, useMemo, useEffect } from 'react';
import { Play, CalendarClock, ChevronRight, ChevronDown, CheckCircle2, Check, Plus, Calendar } from 'lucide-react';
import { Task, Habit, TimeBlock, FocusSession, GoogleEvent, Project, DailyReview, GOOGLE_EVENT_COLOR, REVIEW_MOODS } from '../types';
import { todayISO, getGreeting, formatLongDate, formatMinutes, focusMinutesOn, parseQuickTask } from '../utils';
import { TaskItem } from './TaskItem';
import { TaskForm } from './TaskForm';

type AgendaItem = { key: string; title: string; start: string; end: string; color: string; fromGoogle: boolean; taskId?: string; completed?: boolean };

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
  onUpdateTask: (task: Task) => void;
  onQuickAddTask: (title: string, dueDate?: string, dueTime?: string, recurrence?: Task['recurrence']) => void;
  projects?: Project[];
  onToggleHabitDay: (habitId: string, isoDate: string) => void;
  onStartFocusTask: (id: string) => void;
  onNavigate: (view: string) => void;
  review?: DailyReview | null;
  onSaveReview: (mood: number, note: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks, habits, blocks, sessions, googleActive, googleEvents, onLoadGoogleEvents,
  onToggleTask, onDeleteTask, onUpdateTask, onQuickAddTask, onToggleHabitDay, onStartFocusTask, onNavigate,
  review, onSaveReview, projects,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
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
  const doneTodayTasks = useMemo(
    () => tasks
      .filter(t => t.completed && t.completedAt?.slice(0, 10) === today)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [tasks, today]
  );
  const doneToday = doneTodayTasks.length;
  const [showDone, setShowDone] = useState(true);

  useEffect(() => {
    if (googleActive) onLoadGoogleEvents(today);
  }, [googleActive, today, onLoadGoogleEvents, googleEvents]);

  // Agenda do dia: blocos do app + eventos do Google + tarefas com horário, em ordem de horário
  const agendaItems = useMemo<AgendaItem[]>(() => {
    const syncedIds = new Set(blocks.map(b => b.googleEventId).filter(Boolean));
    const blockItems: AgendaItem[] = blocks
      .filter(b => b.date === today)
      .map(b => ({ key: `b-${b.id}`, title: b.title, start: b.start, end: b.end, color: b.color, fromGoogle: false }));
    const eventItems: AgendaItem[] = googleEvents
      .filter(ev => !ev.allDay && !syncedIds.has(ev.id))
      .map(ev => ({ key: `g-${ev.id}`, title: ev.title, start: ev.start, end: ev.end, color: ev.color ?? GOOGLE_EVENT_COLOR, fromGoogle: true }));
    const taskItems: AgendaItem[] = tasks
      .filter(t => !!t.dueTime && t.dueDate === today)
      .map(t => ({ key: `t-${t.id}`, title: t.title, start: t.dueTime!, end: '', color: '#0f766e', fromGoogle: false, taskId: t.id, completed: t.completed }));
    return [...blockItems, ...eventItems, ...taskItems].sort((a, b) => a.start.localeCompare(b.start));
  }, [blocks, googleEvents, tasks, today]);

  const allDayEvents = useMemo(() => googleEvents.filter(ev => ev.allDay), [googleEvents]);

  const todayHabits = useMemo(
    () => habits.filter(h => h.targetDays.includes(weekday)),
    [habits, weekday]
  );
  const habitsDone = todayHabits.filter(h => h.completions.includes(today)).length;

  const focusToday = focusMinutesOn(sessions, today);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickTitle.trim();
    if (!raw) return;
    const p = parseQuickTask(raw);
    onQuickAddTask(p.title, p.dueDate, p.dueTime, p.recurrence);
    setQuickTitle('');
  };

  const handleSaveTask = (data: Omit<Task, 'id'>, id?: string) => {
    if (id) onUpdateTask({ ...data, id });
    setEditingTask(null);
  };

  return (
    <div className="space-y-5">
      {/* Saudação + atalho discreto de foco */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-display">{getGreeting()}! 👋</h2>
          <p className="text-slate-500 text-sm capitalize">{formatLongDate()}</p>
        </div>
        <button
          onClick={() => onNavigate('focus')}
          className="shrink-0 flex items-center gap-1.5 bg-teal-50 text-teal-800 px-3.5 py-2 rounded-xl font-bold text-sm active:scale-95 transition"
        >
          <Play size={15} /> Focar
        </button>
      </div>

      {/* Resumo do dia em uma linha enxuta */}
      <div className="flex items-center gap-5 px-1 text-xs text-slate-400">
        <span><b className="text-sm font-bold text-teal-700">{formatMinutes(focusToday)}</b> focado</span>
        <span><b className="text-sm font-bold text-emerald-600">{doneToday}</b> feitas</span>
        <span><b className="text-sm font-bold text-orange-500">{habitsDone}/{todayHabits.length}</b> hábitos</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tarefas de hoje */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Tarefas de hoje</h3>
            <button onClick={() => onNavigate('tasks')} className="text-xs text-teal-700 font-medium flex items-center gap-0.5 hover:underline">
              Ver todas <ChevronRight size={12} />
            </button>
          </div>
          <form onSubmit={handleQuickAdd} className="flex gap-2 mb-3">
            <input
              type="text"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder="Nova tarefa... ex: reunião amanhã 14h"
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-200 outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              aria-label="Adicionar tarefa"
              className="shrink-0 w-11 flex items-center justify-center rounded-xl bg-teal-800 text-white enabled:hover:bg-teal-900 enabled:active:scale-95 transition-all disabled:opacity-40"
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
                onEdit={setEditingTask}
                onFocus={onStartFocusTask}
                onUpdate={onUpdateTask}
              />
            ))}
            {todayTasks.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Nada com prazo para hoje. 🎉</p>
            )}
          </div>

          {/* Concluídas hoje — fica visível pra dar a sensação de "eu fiz isso" */}
          {doneTodayTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDone(s => !s)}
                aria-expanded={showDone}
                className="flex items-center justify-between w-full mb-2"
              >
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" /> Concluídas hoje · {doneTodayTasks.length}
                </span>
                <ChevronDown size={15} className={`text-slate-400 transition-transform ${showDone ? 'rotate-180' : ''}`} />
              </button>
              {showDone && (
                <div className="space-y-1.5">
                  {doneTodayTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      compact
                      onToggle={onToggleTask}
                      onDelete={onDeleteTask}
                      onEdit={setEditingTask}
                      onUpdate={onUpdateTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Blocos de hoje */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Agenda de hoje</h3>
              <button onClick={() => onNavigate('planner')} className="text-xs text-teal-700 font-medium flex items-center gap-0.5 hover:underline">
                Abrir agenda <ChevronRight size={12} />
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
                <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                  <CalendarClock size={28} className="text-teal-600" />
                </div>
                <p className="text-sm">Nenhum compromisso hoje.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {agendaItems.map(item => (item.taskId ? (
                  <div key={item.key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50">
                    <button
                      onClick={() => onToggleTask(item.taskId!)}
                      aria-label={item.completed ? 'Reabrir tarefa' : 'Concluir tarefa'}
                      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'}`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => { const t = tasks.find(x => x.id === item.taskId); if (t) setEditingTask(t); }}
                      className={`text-sm flex-1 truncate font-medium text-left ${item.completed ? 'text-slate-400 line-through' : 'text-slate-600'}`}
                    >
                      {item.title}
                    </button>
                    <span className="text-xs text-slate-400 tabular-nums">{item.start}</span>
                  </div>
                ) : (
                  <div key={item.key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                    {item.fromGoogle
                      ? <Calendar size={12} className="shrink-0" style={{ color: item.color }} />
                      : <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    }
                    <span className="text-sm text-slate-600 flex-1 truncate font-medium">{item.title}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{item.start}–{item.end}</span>
                  </div>
                )))}
              </div>
            )}
          </div>

          {/* Hábitos de hoje */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Hábitos de hoje</h3>
              <button onClick={() => onNavigate('habits')} className="text-xs text-teal-700 font-medium flex items-center gap-0.5 hover:underline">
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
                className={`flex-1 h-11 rounded-xl text-xl transition-all ${mood === val ? 'bg-teal-50 ring-2 ring-teal-300 scale-105' : 'bg-slate-50 hover:bg-slate-100'}`}
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
          className="w-full mt-3 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-200 outline-none text-sm resize-none"
        />
        {mood > 0 && <p className="text-[11px] text-emerald-600 mt-1.5">Revisão salva ✓</p>}
      </div>

      {editingTask && (
        <TaskForm
          initialTask={editingTask}
          projects={projects}
          onSave={handleSaveTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};
