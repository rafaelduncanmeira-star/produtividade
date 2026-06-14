import React, { useMemo } from 'react';
import { Timer, CheckCircle2, Flame, CalendarRange } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Task, Habit, FocusSession, DailyReview, REVIEW_MOODS } from '../types';
import {
  todayISO, addDaysISO, getWeekDays, formatShortDate, formatMinutes,
  calcStreaks, habitCompletionRate, focusMinutesOn,
} from '../utils';

interface ReportsViewProps {
  tasks: Task[];
  habits: Habit[];
  sessions: FocusSession[];
  reviews: DailyReview[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ tasks, habits, sessions, reviews }) => {
  const today = todayISO();
  const week = getWeekDays();

  // --- Cards de resumo ---
  const focusToday = useMemo(() => focusMinutesOn(sessions, today), [sessions, today]);

  const focusWeek = useMemo(
    () => sessions.filter(s => s.date >= week[0] && s.date <= week[6]).reduce((sum, s) => sum + s.minutes, 0),
    [sessions, week]
  );

  const tasksWeek = useMemo(
    () => tasks.filter(t => t.completed && t.completedAt && t.completedAt.slice(0, 10) >= week[0] && t.completedAt.slice(0, 10) <= week[6]).length,
    [tasks, week]
  );

  const bestStreak = useMemo(
    () => habits.reduce((best, h) => Math.max(best, calcStreaks(h, today).best), 0),
    [habits, today]
  );

  // --- Foco por dia (últimos 14 dias) ---
  const focusByDay = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const iso = addDaysISO(today, -(13 - i));
      return { name: formatShortDate(iso), Minutos: focusMinutesOn(sessions, iso) };
    });
  }, [sessions, today]);

  // --- Tarefas concluídas por semana (últimas 8 semanas) ---
  const tasksByWeek = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const days = getWeekDays(-(7 - i));
      const count = tasks.filter(t =>
        t.completed && t.completedAt &&
        t.completedAt.slice(0, 10) >= days[0] && t.completedAt.slice(0, 10) <= days[6]
      ).length;
      return { name: formatShortDate(days[0]), Tarefas: count };
    });
  }, [tasks]);

  // --- Taxa de conclusão de hábitos (30 dias) ---
  const habitRates = useMemo(
    () => habits.map(h => ({ habit: h, rate: habitCompletionRate(h, 30, today) })),
    [habits, today]
  );

  // --- Insights: foco por matéria (categoria), últimos 30 dias ---
  const focusByCategory = useMemo(() => {
    const start = addDaysISO(today, -29);
    const catByTask = new Map<string, string>(tasks.map((t): [string, string] => [t.id, t.category]));
    const totals = new Map<string, number>();
    for (const s of sessions) {
      if (s.date < start || s.date > today) continue;
      const cat = (s.taskId && catByTask.get(s.taskId)) || 'Geral';
      totals.set(cat, (totals.get(cat) ?? 0) + s.minutes);
    }
    return [...totals.entries()].map(([cat, minutes]) => ({ cat, minutes })).sort((a, b) => b.minutes - a.minutes);
  }, [sessions, tasks, today]);
  const focusCatMax = focusByCategory[0]?.minutes ?? 0;

  // --- Insights: estimado x real (pomodoros das tarefas concluídas) ---
  const pomo = useMemo(() => {
    let est = 0, real = 0;
    for (const t of tasks) {
      if (!t.completed) continue;
      est += t.estimatedPomodoros || 0;
      real += t.completedPomodoros || 0;
    }
    return { est, real };
  }, [tasks]);
  const pomoVerdict = pomo.est === 0
    ? 'Defina pomodoros estimados nas tarefas para comparar.'
    : pomo.real > pomo.est * 1.15 ? 'Você costuma subestimar o tempo das tarefas. ⏳'
    : pomo.real < pomo.est * 0.85 ? 'Você costuma superestimar — dá para apertar as estimativas. ✂️'
    : 'Suas estimativas estão bem calibradas! 👏';

  // --- Insights: melhor horário de foco ---
  const bestPeriod = useMemo(() => {
    const periods = [
      { label: 'Madrugada', hint: '0h–6h', min: 0, max: 6, minutes: 0 },
      { label: 'Manhã', hint: '6h–12h', min: 6, max: 12, minutes: 0 },
      { label: 'Tarde', hint: '12h–18h', min: 12, max: 18, minutes: 0 },
      { label: 'Noite', hint: '18h–24h', min: 18, max: 24, minutes: 0 },
    ];
    for (const s of sessions) {
      const h = new Date(s.startedAt).getHours();
      const p = periods.find(pe => h >= pe.min && h < pe.max);
      if (p) p.minutes += s.minutes;
    }
    const top = [...periods].sort((a, b) => b.minutes - a.minutes)[0];
    return top.minutes > 0 ? top : null;
  }, [sessions]);

  // --- Humor / Revisão do dia ---
  const reviewByDate = useMemo(() => new Map(reviews.map(r => [r.date, r])), [reviews]);
  const moodDays = useMemo(
    () => Array.from({ length: 14 }, (_, i) => {
      const iso = addDaysISO(today, -(13 - i));
      return { iso, day: iso.slice(8), mood: reviewByDate.get(iso)?.mood ?? 0, isToday: iso === today };
    }),
    [reviewByDate, today]
  );
  const reviewedDays = moodDays.filter(d => d.mood > 0);
  const avgMood = reviewedDays.length ? reviewedDays.reduce((s, d) => s + d.mood, 0) / reviewedDays.length : 0;
  const recentNotes = useMemo(
    () => [...reviews].filter(r => r.note && r.note.trim()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    [reviews]
  );

  const summaryCards = [
    { label: 'Foco hoje', value: formatMinutes(focusToday), icon: Timer, color: 'text-teal-700 bg-teal-50' },
    { label: 'Foco na semana', value: formatMinutes(focusWeek), icon: CalendarRange, color: 'text-sky-600 bg-sky-50' },
    { label: 'Tarefas na semana', value: String(tasksWeek), icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Melhor sequência', value: `${bestStreak} ${bestStreak === 1 ? 'dia' : 'dias'}`, icon: Flame, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Relatórios</h2>
        <p className="text-slate-500 text-sm">Acompanhe sua produtividade ao longo do tempo.</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <p className="text-lg font-bold text-slate-800">{card.value}</p>
            <p className="text-[11px] text-slate-400 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Humor / Revisão do dia */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Humor — últimos 14 dias</h3>
          {avgMood > 0 && (
            <span className="text-xs text-slate-400">
              média {REVIEW_MOODS[Math.round(avgMood) - 1]} · {reviewedDays.length} {reviewedDays.length === 1 ? 'dia' : 'dias'}
            </span>
          )}
        </div>
        {reviewedDays.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Faça a “Revisão do dia” na tela Hoje para acompanhar seu humor aqui.</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5">
              {moodDays.map(d => (
                <div key={d.iso} className={`flex flex-col items-center gap-1 rounded-lg py-2 ${d.isToday ? 'bg-teal-50' : ''}`}>
                  <span className={`text-lg leading-none ${d.mood ? '' : 'text-slate-200'}`}>{d.mood ? REVIEW_MOODS[d.mood - 1] : '·'}</span>
                  <span className="text-[9px] text-slate-400 tabular-nums">{d.day}</span>
                </div>
              ))}
            </div>
            {recentNotes.length > 0 && (
              <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
                {recentNotes.map(r => (
                  <div key={r.date} className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5 shrink-0">{REVIEW_MOODS[r.mood - 1]}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400 font-medium">{formatShortDate(r.date)}</p>
                      <p className="text-sm text-slate-600">{r.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Insights: estimativa + melhor horário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Estimativa de pomodoros</h3>
          <div className="flex items-end gap-3">
            <div><p className="text-2xl font-bold text-teal-700">{pomo.real}</p><p className="text-[11px] text-slate-400">reais 🍅</p></div>
            <span className="text-slate-300 text-lg pb-1">/</span>
            <div><p className="text-2xl font-bold text-slate-400">{pomo.est}</p><p className="text-[11px] text-slate-400">estimados</p></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{pomoVerdict}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Seu melhor horário de foco</h3>
          {bestPeriod ? (
            <>
              <p className="text-2xl font-bold text-slate-800">{bestPeriod.label}</p>
              <p className="text-[11px] text-slate-400">{bestPeriod.hint} · {formatMinutes(bestPeriod.minutes)} de foco no total</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Faça sessões de foco para descobrir.</p>
          )}
        </div>
      </div>

      {/* Foco por matéria */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Foco por matéria — últimos 30 dias</h3>
        {focusByCategory.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Nenhuma sessão de foco nos últimos 30 dias.</p>
        ) : (
          <div className="space-y-3">
            {focusByCategory.map(({ cat, minutes }) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 font-medium">{cat}</span>
                  <span className="text-xs font-bold text-teal-700">{formatMinutes(minutes)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-700 transition-all duration-700" style={{ width: `${focusCatMax ? (minutes / focusCatMax) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Foco por dia */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Minutos de foco — últimos 14 dias</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={focusByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [formatMinutes(value), 'Foco']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="Minutos" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tarefas por semana */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Tarefas concluídas por semana</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tasksByWeek} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="Tarefas" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Taxa de conclusão de hábitos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Hábitos — taxa de conclusão (30 dias)</h3>
        {habitRates.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Nenhum hábito criado ainda.</p>
        ) : (
          <div className="space-y-3">
            {habitRates.map(({ habit, rate }) => (
              <div key={habit.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                    <span>{habit.emoji}</span> {habit.name}
                  </span>
                  <span className="text-xs font-bold" style={{ color: habit.color }}>
                    {Math.round(rate * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${rate * 100}%`, backgroundColor: habit.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
