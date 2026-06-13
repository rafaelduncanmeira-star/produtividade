import React, { useMemo } from 'react';
import { Timer, CheckCircle2, Flame, CalendarRange } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Task, Habit, FocusSession } from '../types';
import {
  todayISO, addDaysISO, getWeekDays, formatShortDate, formatMinutes,
  calcStreaks, habitCompletionRate, focusMinutesOn,
} from '../utils';

interface ReportsViewProps {
  tasks: Task[];
  habits: Habit[];
  sessions: FocusSession[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ tasks, habits, sessions }) => {
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

  const summaryCards = [
    { label: 'Foco hoje', value: formatMinutes(focusToday), icon: Timer, color: 'text-indigo-600 bg-indigo-50' },
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
              <Bar dataKey="Minutos" fill="#6366f1" radius={[4, 4, 0, 0]} />
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
