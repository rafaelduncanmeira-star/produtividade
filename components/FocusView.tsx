import React, { useMemo } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Settings, Timer } from 'lucide-react';
import { Task, FocusSession, PomodoroSettings, TimerState, TIMER_PHASE_LABELS } from '../types';
import { formatTimerMs, formatMinutes, todayISO } from '../utils';

interface FocusViewProps {
  timer: TimerState;
  remainingMs: number;
  settings: PomodoroSettings;
  tasks: Task[];
  sessions: FocusSession[];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
  onLinkTask: (id: string | null) => void;
  onOpenSettings: () => void;
}

const PHASE_COLORS: Record<TimerState['phase'], { stroke: string; text: string; bg: string }> = {
  focus: { stroke: '#0d9488', text: 'text-teal-600', bg: 'bg-teal-600 hover:bg-teal-700 shadow-teal-200' },
  short_break: { stroke: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' },
  long_break: { stroke: '#0ea5e9', text: 'text-sky-600', bg: 'bg-sky-600 hover:bg-sky-700 shadow-sky-200' },
};

const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const FocusView: React.FC<FocusViewProps> = ({
  timer, remainingMs, settings, tasks, sessions,
  onStart, onPause, onResume, onReset, onSkip, onLinkTask, onOpenSettings,
}) => {
  const colors = PHASE_COLORS[timer.phase];
  const totalMs = (timer.phaseMinutes ?? (
    timer.phase === 'focus' ? settings.focusMinutes
      : timer.phase === 'short_break' ? settings.shortBreakMinutes
      : settings.longBreakMinutes
  )) * 60000;
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;

  const pendingTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const taskById = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  const todaySessions = useMemo(() => {
    const today = todayISO();
    return sessions.filter(s => s.date === today).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, [sessions]);
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0);

  const dotsInCycle = timer.cyclesCompleted % settings.sessionsUntilLongBreak;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Foco</h2>
          <p className="text-slate-500 text-sm">Técnica Pomodoro: foco total, uma tarefa de cada vez.</p>
        </div>
        <button
          onClick={onOpenSettings}
          aria-label="Configurações do timer"
          className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col items-center">
        <span className={`text-xs font-bold uppercase tracking-widest ${colors.text}`}>
          {TIMER_PHASE_LABELS[timer.phase]}
        </span>

        {/* Mostrador circular */}
        <div className="relative my-5">
          <svg width="260" height="260" viewBox="0 0 260 260" className="-rotate-90">
            <circle cx="130" cy="130" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <circle
              cx="130" cy="130" r={RADIUS} fill="none"
              stroke={colors.stroke} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * progress}
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-bold text-slate-800 tabular-nums">{formatTimerMs(remainingMs)}</span>
            {timer.linkedTaskId && taskById.get(timer.linkedTaskId) && (
              <span className="text-xs text-slate-400 mt-2 max-w-[180px] truncate">
                {taskById.get(timer.linkedTaskId)!.title}
              </span>
            )}
          </div>
        </div>

        {/* Indicador de ciclos até a pausa longa */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: settings.sessionsUntilLongBreak }, (_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < dotsInCycle ? 'bg-teal-500' : 'bg-slate-200'}`} />
          ))}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            aria-label="Reiniciar"
            className="p-3.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
          >
            <RotateCcw size={20} />
          </button>
          {timer.status === 'running' ? (
            <button
              onClick={onPause}
              className={`flex items-center gap-2 ${colors.bg} text-white px-10 py-4 rounded-full font-bold shadow-lg active:scale-95 transition-all`}
            >
              <Pause size={22} /> Pausar
            </button>
          ) : (
            <button
              onClick={timer.status === 'paused' ? onResume : onStart}
              className={`flex items-center gap-2 ${colors.bg} text-white px-10 py-4 rounded-full font-bold shadow-lg active:scale-95 transition-all`}
            >
              <Play size={22} />
              {timer.status === 'paused' ? 'Continuar' : timer.phase === 'focus' ? 'Iniciar foco' : 'Iniciar pausa'}
            </button>
          )}
          <button
            onClick={onSkip}
            aria-label="Pular fase"
            className="p-3.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Vincular tarefa */}
        <div className="w-full max-w-sm mt-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-center">
            Focar em qual tarefa?
          </label>
          <select
            value={timer.linkedTaskId ?? ''}
            onChange={e => onLinkTask(e.target.value || null)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-200 outline-none bg-white text-sm text-slate-600"
          >
            <option value="">Sem tarefa vinculada</option>
            {pendingTasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessões de hoje */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-sm">Sessões de hoje</h3>
          <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
            {formatMinutes(todayMinutes)} focado
          </span>
        </div>
        {todaySessions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Nenhuma sessão concluída hoje. Comece agora! 🍅</p>
        ) : (
          <div className="space-y-1.5">
            {todaySessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                <Timer size={16} className="text-teal-400 shrink-0" />
                <span className="text-sm text-slate-600 flex-1 truncate">
                  {s.taskId && taskById.get(s.taskId) ? taskById.get(s.taskId)!.title : 'Foco livre'}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {new Date(s.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs font-bold text-slate-500">{s.minutes}min</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
