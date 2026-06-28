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

// Acento sutil por fase: anel + rótulo. Botões e números ficam calmos (teal/slate).
const PHASE_COLORS: Record<TimerState['phase'], { stroke: string; text: string }> = {
  focus: { stroke: '#0f766e', text: 'text-teal-700' },
  short_break: { stroke: '#10b981', text: 'text-emerald-600' },
  long_break: { stroke: '#0ea5e9', text: 'text-sky-600' },
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
  const isFocus = timer.phase === 'focus';

  return (
    <div className="space-y-5">
      {/* Título da tela + ajustes */}
      <div className="flex items-start justify-between gap-4 px-1 pt-1">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 font-display leading-tight">Foco</h2>
          <p className="text-slate-500 text-[15px] mt-0.5">Técnica Pomodoro: foco total, uma tarefa de cada vez.</p>
        </div>
        <button
          onClick={onOpenSettings}
          aria-label="Configurações do timer"
          className="shrink-0 w-11 h-11 flex items-center justify-center text-slate-500 hover:text-teal-800 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col items-center">
        {/* Vincular tarefa no topo: escolha a tarefa ANTES de iniciar o foco */}
        <div className="w-full max-w-sm mb-6">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 text-center">
            Vincular foco a uma tarefa
          </label>
          <select
            value={timer.linkedTaskId ?? ''}
            onChange={e => onLinkTask(e.target.value || null)}
            className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-[15px] text-slate-700 focus:ring-2 focus:ring-teal-300 outline-none"
          >
            <option value="">Nenhuma tarefa selecionada</option>
            {pendingTasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.text}`}>
          {TIMER_PHASE_LABELS[timer.phase]}
        </span>

        {/* Mostrador circular */}
        <div className="relative my-5">
          <svg width="260" height="260" viewBox="0 0 260 260" className="-rotate-90">
            <circle cx="130" cy="130" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="130" cy="130" r={RADIUS} fill="none"
              stroke={colors.stroke} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * progress}
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-6xl font-bold tabular-nums tracking-tight ${isFocus && timer.status === 'running' ? colors.text : 'text-slate-800'}`}>
              {formatTimerMs(remainingMs)}
            </span>
            {timer.linkedTaskId && taskById.get(timer.linkedTaskId) && (
              <span className="text-[13px] text-slate-400 mt-2 max-w-[180px] truncate">
                {taskById.get(timer.linkedTaskId)!.title}
              </span>
            )}
          </div>
        </div>

        {/* Indicador de ciclos até a pausa longa */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: settings.sessionsUntilLongBreak }, (_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i < dotsInCycle ? 'bg-teal-700' : 'bg-slate-200'}`} />
          ))}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            aria-label="Reiniciar"
            className="w-12 h-12 flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors active:scale-95"
          >
            <RotateCcw size={20} />
          </button>
          {timer.status === 'running' ? (
            <button
              onClick={onPause}
              className="flex items-center gap-2 bg-teal-800 text-white px-9 py-3.5 rounded-full font-semibold active:scale-95 transition"
            >
              <Pause size={20} /> Pausar
            </button>
          ) : (
            <button
              onClick={timer.status === 'paused' ? onResume : onStart}
              className="flex items-center gap-2 bg-teal-800 text-white px-9 py-3.5 rounded-full font-semibold active:scale-95 transition"
            >
              <Play size={20} />
              {timer.status === 'paused' ? 'Continuar' : timer.phase === 'focus' ? 'Iniciar foco' : 'Iniciar pausa'}
            </button>
          )}
          <button
            onClick={onSkip}
            aria-label="Pular fase"
            className="w-12 h-12 flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors active:scale-95"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* Sessões de hoje */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-[17px]">Sessões de hoje</h3>
          <span className="text-[13px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full tabular-nums">
            {formatMinutes(todayMinutes)} focado
          </span>
        </div>
        {todaySessions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Nenhuma sessão concluída hoje. Comece agora.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {todaySessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-3">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Timer size={15} />
                </span>
                <span className="text-[15px] text-slate-700 flex-1 truncate">
                  {s.taskId && taskById.get(s.taskId) ? taskById.get(s.taskId)!.title : 'Foco livre'}
                </span>
                <span className="text-[13px] text-slate-400 tabular-nums">
                  {new Date(s.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-sm font-semibold text-slate-500 tabular-nums">{s.minutes}min</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
