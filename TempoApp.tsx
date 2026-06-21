import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LayoutDashboard, CheckSquare, Timer, Repeat, CalendarClock, BarChart3, MoreHorizontal, X, Calendar, LogOut, Sparkles, Bell, BellRing, BellOff, Sun, Moon, Target, WifiOff, Download } from 'lucide-react';
import {
  Task, TaskStatus, Habit, Project, DailyReview, TimeBlock, FocusSession, PomodoroSettings, TimerState, TimerPhase,
  GoogleSettings, GoogleEvent, DEFAULT_POMODORO_SETTINGS, DEFAULT_TIMER_STATE, DEFAULT_GOOGLE_SETTINGS, GOOGLE_CLIENT_ID,
} from './types';
import { uid, toISODate, todayISO, formatTimerMs, playBeep, nextRecurrenceISO, timeToMinutes, formatShortDate } from './utils';
import { haptic, celebrateComplete } from './feedback';
import { useToast } from './components/Toast';
import { AppSnapshot } from './services/cloudStore';
import { notifPermission, sendNotification, updateBadge } from './services/notifications';
import {
  getValidToken, requestToken, disconnectGoogle, fetchDayEvents,
  createEventFromBlock, updateEventFromBlock, deleteEventById,
} from './services/googleCalendar';
import { TodayView } from './components/TodayView';
import { TasksView } from './components/TasksView';
import { FocusView } from './components/FocusView';
import { PomodoroSettingsModal } from './components/PomodoroSettingsModal';
import { HabitsView } from './components/HabitsView';
import { PlannerView } from './components/PlannerView';
import { ReportsView } from './components/ReportsView';
import { GoogleSettingsModal } from './components/GoogleSettingsModal';
import { AIAssistant } from './components/AIAssistant';
import { MetasView } from './components/MetasView';
import { TaskForm } from './components/TaskForm';
import { HabitForm } from './components/HabitForm';
import { TimeBlockForm } from './components/TimeBlockForm';
import { ProjectForm } from './components/ProjectForm';
import { CreateFab } from './components/CreateFab';
import { ReminderModal } from './components/ReminderModal';
import { usePwa } from './components/usePwa';

// Dados iniciais de exemplo
const now = new Date().toISOString();
const today = todayISO();

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Responder e-mails importantes', urgent: true, important: true, dueDate: today, category: 'Trabalho', estimatedPomodoros: 1, completedPomodoros: 0, completed: false, createdAt: now },
  { id: 't2', title: 'Estudar 1 capítulo do curso', urgent: false, important: true, dueDate: today, category: 'Estudos', estimatedPomodoros: 2, completedPomodoros: 0, completed: false, createdAt: now },
  { id: 't3', title: 'Agendar consulta no dentista', urgent: true, important: false, category: 'Saúde', estimatedPomodoros: 1, completedPomodoros: 0, completed: false, createdAt: now },
  { id: 't4', title: 'Organizar fotos antigas do celular', urgent: false, important: false, category: 'Pessoal', estimatedPomodoros: 1, completedPomodoros: 0, completed: false, createdAt: now },
];

const INITIAL_HABITS: Habit[] = [
  { id: 'h1', name: 'Beber 2L de água', color: '#06b6d4', emoji: '💧', targetDays: [0, 1, 2, 3, 4, 5, 6], completions: [], createdAt: now },
  { id: 'h2', name: 'Exercício físico', color: '#10b981', emoji: '🏃', targetDays: [1, 3, 5], completions: [], createdAt: now },
  { id: 'h3', name: 'Leitura antes de dormir', color: '#0f766e', emoji: '📖', targetDays: [0, 1, 2, 3, 4, 5, 6], completions: [], createdAt: now },
];

const INITIAL_BLOCKS: TimeBlock[] = [
  { id: 'b1', date: today, start: '08:00', end: '09:00', title: 'Planejar o dia', color: '#0f766e' },
  { id: 'b2', date: today, start: '09:00', end: '11:00', title: 'Trabalho focado', color: '#10b981' },
  { id: 'b3', date: today, start: '14:00', end: '15:00', title: 'Reuniões', color: '#f59e0b' },
];

type View = 'today' | 'tasks' | 'metas' | 'focus' | 'habits' | 'planner' | 'reports';

const NAV_ITEMS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'today', label: 'Hoje', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
  { id: 'focus', label: 'Focar', icon: Timer },
  { id: 'planner', label: 'Planejar', icon: CalendarClock },
  { id: 'habits', label: 'Hábitos', icon: Repeat },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
];

const MOBILE_NAV: View[] = ['today', 'tasks', 'focus', 'planner'];
const MORE_NAV: View[] = ['habits', 'metas', 'reports'];

const phaseDurationMin = (phase: TimerPhase, settings: PomodoroSettings): number => {
  if (phase === 'focus') return settings.focusMinutes;
  if (phase === 'short_break') return settings.shortBreakMinutes;
  return settings.longBreakMinutes;
};

interface TempoAppProps {
  userEmail: string;
  initial: AppSnapshot;
  onSnapshotChange: (snapshot: AppSnapshot) => void;
  onSignOut: () => void;
}

const TempoApp: React.FC<TempoAppProps> = ({ userEmail, initial, onSnapshotChange, onSignOut }) => {
  const { toast } = useToast();
  const pwa = usePwa();
  const [currentView, setCurrentView] = useState<View>('today');
  const [moreOpen, setMoreOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [creating, setCreating] = useState<null | 'task' | 'habit' | 'block' | 'project'>(null);
  // Boas-vindas só no 1º acesso (e apenas quando ainda há dados de exemplo).
  const [showWelcome, setShowWelcome] = useState(() => {
    try { if (localStorage.getItem('tempo_onboarded')) return false; } catch { /* ignore */ }
    return (initial.tasks ?? INITIAL_TASKS).some(t => t.id === 't1');
  });
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const toggleTheme = () => setDark(d => {
    const next = !d;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('tempo_theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
    return next;
  });

  // --- Estado do usuário (carregado da nuvem, salvo de volta pelo App pai) ---
  const [tasks, setTasks] = useState<Task[]>(() => initial.tasks ?? INITIAL_TASKS);
  const [sessions, setSessions] = useState<FocusSession[]>(() => initial.sessions ?? []);
  const [habits, setHabits] = useState<Habit[]>(() => initial.habits ?? INITIAL_HABITS);
  const [projects, setProjects] = useState<Project[]>(() => initial.projects ?? []);
  const [reviews, setReviews] = useState<DailyReview[]>(() => initial.reviews ?? []);
  const [blocks, setBlocks] = useState<TimeBlock[]>(() => initial.blocks ?? INITIAL_BLOCKS);
  const [settings, setSettings] = useState<PomodoroSettings>(() => ({ ...DEFAULT_POMODORO_SETTINGS, ...initial.pomodoroSettings }));
  const [timer, setTimer] = useState<TimerState>(() => ({ ...DEFAULT_TIMER_STATE, ...initial.timer }));
  const [googleSettings, setGoogleSettings] = useState<GoogleSettings>(() => ({ ...DEFAULT_GOOGLE_SETTINGS, ...initial.googleSettings }));

  // Notifica o App pai a cada mudança; ele salva na nuvem (com debounce)
  const snapshot = useMemo<AppSnapshot>(() => ({
    tasks, sessions, habits, blocks, projects, reviews, pomodoroSettings: settings, timer, googleSettings,
  }), [tasks, sessions, habits, blocks, projects, reviews, settings, timer, googleSettings]);
  useEffect(() => { onSnapshotChange(snapshot); }, [snapshot, onSnapshotChange]);

  // --- Google Agenda ---
  const [isGoogleOpen, setIsGoogleOpen] = useState(false);
  const [googleConnected, setGoogleConnected] = useState<boolean>(() => getValidToken() !== null);
  const [googleEvents, setGoogleEvents] = useState<Record<string, GoogleEvent[]>>({});
  const googleEventsRef = useRef(googleEvents);
  useEffect(() => { googleEventsRef.current = googleEvents; }, [googleEvents]);
  const googleSettingsRef = useRef(googleSettings);
  useEffect(() => { googleSettingsRef.current = googleSettings; }, [googleSettings]);
  const autoRenewTriedRef = useRef(false);

  // Devolve um token válido, renovando sozinho quando expirar. Com a conta
  // Google logada no navegador, a renovação acontece sem nenhuma pergunta.
  // `interactive`: chamadas vindas de um clique podem abrir o popup do Google;
  // renovações em segundo plano tentam só uma vez por sessão.
  const ensureToken = useCallback(async (interactive: boolean): Promise<string | null> => {
    const cached = getValidToken();
    if (cached) return cached;
    const clientId = GOOGLE_CLIENT_ID || googleSettingsRef.current.clientId;
    if (!clientId) return null;
    if (!interactive && autoRenewTriedRef.current) return null;
    autoRenewTriedRef.current = true;
    try {
      const fresh = await requestToken(clientId, !interactive); // segundo plano = silencioso (sem popup)
      autoRenewTriedRef.current = false;
      setGoogleConnected(true);
      return fresh;
    } catch {
      setGoogleConnected(false);
      return null;
    }
  }, []);

  const connectGoogle = async (clientId?: string) => {
    const id = clientId || GOOGLE_CLIENT_ID || googleSettingsRef.current.clientId;
    if (!id) throw new Error('Google Agenda não configurado.');
    // Só guarda no perfil quando NÃO há ID global do app (modo manual/avançado)
    if (!GOOGLE_CLIENT_ID) { setGoogleSettings({ clientId: id }); googleSettingsRef.current = { clientId: id }; }
    await requestToken(id);
    autoRenewTriedRef.current = false;
    setGoogleConnected(true);
    setGoogleEvents({});
  };

  const handleGoogleDisconnect = () => {
    disconnectGoogle();
    setGoogleConnected(false);
    setGoogleEvents({});
  };

  const loadGoogleEventsFor = useCallback(async (dateISO: string) => {
    if (googleEventsRef.current[dateISO]) return;
    const token = await ensureToken(false);
    if (!token) return;
    try {
      const events = await fetchDayEvents(dateISO, token);
      setGoogleEvents(prev => ({ ...prev, [dateISO]: events }));
    } catch {
      setGoogleConnected(getValidToken() !== null);
    }
  }, [ensureToken]);

  const sendBlockToGoogle = async (block: TimeBlock) => {
    const token = await ensureToken(true);
    if (!token) {
      setIsGoogleOpen(true);
      return;
    }
    try {
      const eventId = await createEventFromBlock(block, token);
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, googleEventId: eventId } : b));
      setGoogleEvents({});
    } catch (e) {
      toast((e as Error).message || 'Não foi possível enviar para o Google Agenda.');
      setGoogleConnected(getValidToken() !== null);
    }
  };

  // --- Timer Pomodoro (vive aqui para continuar rodando em qualquer view) ---
  const timerRef = useRef(timer);
  useEffect(() => { timerRef.current = timer; }, [timer]);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const [nowTick, setNowTick] = useState(Date.now());
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(notifPermission());
  const notifiedRef = useRef<Set<string>>(new Set());

  // Selo no ícone do app (Badging API): nº de tarefas pendentes de hoje/atrasadas.
  // Reaplica ao mudar tarefas, ao conceder a permissão (o iOS exige) e ao voltar ao app.
  useEffect(() => {
    const refresh = () => {
      const t = todayISO();
      updateBadge(tasks.filter(x => !x.completed && !!x.dueDate && x.dueDate <= t).length);
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [tasks, notifPerm]);

  const completePhase = useCallback(() => {
    const t = timerRef.current;
    if (t.status !== 'running' || t.endsAt === null) return;
    // Guarda síncrona contra execução dupla (StrictMode / múltiplos gatilhos)
    timerRef.current = { ...t, status: 'idle' };

    const s = settingsRef.current;
    if (t.phase === 'focus') {
      const minutes = t.phaseMinutes ?? s.focusMinutes;
      const startedAt = t.startedAt ?? new Date(t.endsAt - minutes * 60000).toISOString();
      setSessions(prev => [...prev, {
        id: uid(),
        date: toISODate(new Date(startedAt)),
        startedAt,
        minutes,
        taskId: t.linkedTaskId ?? undefined,
      }]);
      if (t.linkedTaskId) {
        setTasks(prev => prev.map(task =>
          (task.id === t.linkedTaskId && !task.completed) ? { ...task, completedPomodoros: task.completedPomodoros + 1 } : task
        ));
      }
      const cycles = t.cyclesCompleted + 1;
      const nextPhase: TimerPhase = cycles % s.sessionsUntilLongBreak === 0 ? 'long_break' : 'short_break';
      setTimer({
        phase: nextPhase, status: 'idle', endsAt: null, remainingMs: null, phaseMinutes: null,
        startedAt: null, linkedTaskId: t.linkedTaskId, cyclesCompleted: cycles,
      });
    } else {
      setTimer({
        phase: 'focus', status: 'idle', endsAt: null, remainingMs: null, phaseMinutes: null,
        startedAt: null, linkedTaskId: t.linkedTaskId, cyclesCompleted: t.cyclesCompleted,
      });
    }
    if (s.soundEnabled) playBeep();
    sendNotification(
      t.phase === 'focus' ? 'Foco concluído! 🎉' : 'Pausa encerrada ⏰',
      t.phase === 'focus' ? 'Hora de uma pausa.' : 'Bora focar!'
    );
  }, []);

  // Recuperação pós-reload: fase terminou enquanto a página estava fechada
  useEffect(() => {
    const t = timerRef.current;
    if (t.status === 'running' && t.endsAt !== null && Date.now() >= t.endsAt) {
      completePhase();
    }
  }, [completePhase]);

  useEffect(() => {
    if (timer.status !== 'running') return;
    const iv = setInterval(() => {
      setNowTick(Date.now());
      const t = timerRef.current;
      if (t.status === 'running' && t.endsAt !== null && Date.now() >= t.endsAt) {
        completePhase();
      }
    }, 500);
    return () => clearInterval(iv);
  }, [timer.status, completePhase]);

  const remainingMs = useMemo(() => {
    if (timer.status === 'running' && timer.endsAt !== null) return Math.max(0, timer.endsAt - nowTick);
    if (timer.remainingMs !== null) return timer.remainingMs;
    return phaseDurationMin(timer.phase, settings) * 60000;
  }, [timer, nowTick, settings]);

  useEffect(() => {
    if (timer.status === 'running' || timer.status === 'paused') {
      const label = timer.phase === 'focus' ? 'Foco' : 'Pausa';
      document.title = `${formatTimerMs(remainingMs)} — ${label} | Foco GeriClass`;
    } else {
      document.title = 'Foco GeriClass';
    }
  }, [remainingMs, timer.status, timer.phase]);

  // Lembretes (app aberto): avisa quando um bloco ou tarefa de hoje está prestes a começar
  useEffect(() => {
    if (notifPerm !== 'granted') return;
    const check = () => {
      const today = todayISO();
      const d = new Date();
      const nowMin = d.getHours() * 60 + d.getMinutes();
      blocks.filter(b => b.date === today).forEach(b => {
        const diff = timeToMinutes(b.start) - nowMin;
        const key = `${today}:${b.id}:${b.start}`;
        if (diff >= 0 && diff <= 5 && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          sendNotification(`⏰ ${b.title}`, diff === 0 ? `Começa agora · ${b.start}` : `Começa em ${diff} min · ${b.start}`);
        }
      });
      tasks.filter(t => !t.completed && t.dueTime && t.dueDate === today).forEach(t => {
        const diff = timeToMinutes(t.dueTime!) - nowMin;
        const key = `task:${today}:${t.id}:${t.dueTime}`;
        if (diff >= 0 && diff <= 5 && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          sendNotification(`✅ ${t.title}`, diff === 0 ? `Agora · ${t.dueTime}` : `Em ${diff} min · ${t.dueTime}`);
        }
      });
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [notifPerm, blocks, tasks]);

  const startTimer = () => {
    setTimer(prev => {
      if (prev.status !== 'idle') return prev;
      const minutes = phaseDurationMin(prev.phase, settingsRef.current);
      return {
        ...prev,
        status: 'running',
        endsAt: Date.now() + minutes * 60000,
        remainingMs: null,
        phaseMinutes: minutes,
        startedAt: prev.phase === 'focus' ? new Date().toISOString() : prev.startedAt,
      };
    });
  };

  const pauseTimer = () => {
    setTimer(prev => {
      if (prev.status !== 'running' || prev.endsAt === null) return prev;
      return { ...prev, status: 'paused', remainingMs: Math.max(0, prev.endsAt - Date.now()), endsAt: null };
    });
  };

  const resumeTimer = () => {
    setTimer(prev => {
      if (prev.status !== 'paused' || prev.remainingMs === null) return prev;
      return { ...prev, status: 'running', endsAt: Date.now() + prev.remainingMs, remainingMs: null };
    });
  };

  const resetTimer = () => {
    setTimer(prev => ({
      ...prev, status: 'idle', endsAt: null, remainingMs: null, phaseMinutes: null, startedAt: null,
    }));
  };

  // Pula a fase atual sem registrar sessão nem contar ciclo
  const skipPhase = () => {
    setTimer(prev => ({
      ...prev,
      phase: prev.phase === 'focus' ? 'short_break' : 'focus',
      status: 'idle', endsAt: null, remainingMs: null, phaseMinutes: null, startedAt: null,
    }));
  };

  const linkTask = (taskId: string | null) => {
    setTimer(prev => ({ ...prev, linkedTaskId: taskId }));
  };

  // Atalho "Focar" de uma tarefa: vincula e, se ocioso, já inicia o foco
  const startFocusOnTask = (taskId: string) => {
    setTimer(prev => {
      if (prev.status !== 'idle') return { ...prev, linkedTaskId: taskId };
      const minutes = settingsRef.current.focusMinutes;
      return {
        ...prev,
        phase: 'focus',
        status: 'running',
        endsAt: Date.now() + minutes * 60000,
        remainingMs: null,
        phaseMinutes: minutes,
        startedAt: new Date().toISOString(),
        linkedTaskId: taskId,
      };
    });
    setCurrentView('focus');
    // Kanban: focar numa tarefa também a move para "Fazendo"
    setTasks(prev => prev.map(task =>
      task.id === taskId && !task.completed ? { ...task, status: 'doing' } : task
    ));
  };

  // --- Handlers de entidades ---
  const addTask = (data: Omit<Task, 'id'>) => setTasks(prev => [{ ...data, id: uid() }, ...prev]);
  const updateTask = (task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  const deleteTask = (id: string) => {
    const idx = tasks.findIndex(t => t.id === id);
    const target = tasks[idx];
    if (!target) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    toast('Tarefa excluída', { action: { label: 'Desfazer', onClick: () => setTasks(prev => {
      const copy = prev.filter(t => t.id !== target.id);
      copy.splice(Math.min(idx, copy.length), 0, target);
      return copy;
    } ) } });
  };

  // Celebra a conclusão de uma tarefa: vibração, aviso de recorrência e confete ao zerar o dia.
  const celebrateTaskDone = (target: Task) => {
    haptic();
    const reopen = () => setTasks(prev => prev.map(x => x.id === target.id ? { ...x, completed: false, completedAt: undefined } : x));
    if (target.recurrence && !target.recurrenceSpawned) {
      const nextDue = nextRecurrenceISO(target.recurrence, target.dueDate ?? todayISO());
      toast(`🔁 Próxima criada para ${formatShortDate(nextDue)}`);
    }
    const t = todayISO();
    const openToday = tasks.filter(x => !x.completed && !!x.dueDate && x.dueDate <= t);
    const lastOfDay = !!target.dueDate && target.dueDate <= t && openToday.length === 1 && openToday[0].id === target.id;
    if (lastOfDay) {
      celebrateComplete();
      toast('🎉 Tudo de hoje concluído!', { action: { label: 'Desfazer', onClick: reopen } });
    } else {
      toast('✅ Tarefa concluída', { action: { label: 'Desfazer', onClick: reopen } });
    }
  };

  const toggleTask = (id: string) => {
    const target = tasks.find(t => t.id === id);
    if (target && !target.completed) celebrateTaskDone(target);
    setTasks(prev => {
    const target = prev.find(t => t.id === id);
    if (!target) return prev;
    const completing = !target.completed;
    const ts = new Date().toISOString();
    let next = prev.map(t =>
      t.id === id ? { ...t, completed: completing, completedAt: completing ? ts : undefined } : t
    );
    // Tarefa recorrente: ao concluir pela 1ª vez, cria a próxima ocorrência
    if (completing && target.recurrence && !target.recurrenceSpawned) {
      next = next.map(t => (t.id === id ? { ...t, recurrenceSpawned: true } : t));
      const nextDue = nextRecurrenceISO(target.recurrence, target.dueDate ?? todayISO());
      next = [{
        ...target,
        id: uid(),
        completed: false,
        completedAt: undefined,
        completedPomodoros: 0,
        status: 'todo',
        recurrenceSpawned: false,
        dueDate: nextDue,
        createdAt: ts,
      }, ...next];
    }
    return next;
    });
  };

  // Define o estágio de uma tarefa (Kanban e IA); concluir gera a próxima ocorrência recorrente
  const setTaskStatusById = (id: string, status: TaskStatus) => {
    const target = tasks.find(t => t.id === id);
    if (target && status === 'done' && !target.completed) celebrateTaskDone(target);
    setTasks(prev => {
    const target = prev.find(t => t.id === id);
    if (!target) return prev;
    const done = status === 'done';
    const ts = new Date().toISOString();
    let next = prev.map(t => t.id === id
      ? { ...t, status, completed: done, completedAt: done ? (t.completedAt ?? ts) : undefined }
      : t);
    if (done && target.recurrence && !target.recurrenceSpawned) {
      next = next.map(t => (t.id === id ? { ...t, recurrenceSpawned: true } : t));
      const nextDue = nextRecurrenceISO(target.recurrence, target.dueDate ?? todayISO());
      next = [{
        ...target, id: uid(), completed: false, completedAt: undefined, completedPomodoros: 0,
        status: 'todo', recurrenceSpawned: false, dueDate: nextDue, createdAt: ts,
      }, ...next];
    }
    return next;
    });
  };

  const quickAddTask = (title: string, dueDate?: string, dueTime?: string, recurrence?: Task['recurrence']) => {
    addTask({
      title, urgent: false, important: true, dueDate, dueTime, category: 'Outros',
      estimatedPomodoros: 1, completedPomodoros: 0, completed: false, recurrence, createdAt: new Date().toISOString(),
    });
    if (recurrence) toast(`🔁 Recorrente${dueTime ? ' · ' + dueTime : ''}`);
    else if (dueDate && dueDate !== todayISO()) toast(`📅 Agendada: ${formatShortDate(dueDate)}${dueTime ? ' · ' + dueTime : ''}`);
    else if (dueTime) toast(`⏰ Hoje às ${dueTime}`);
  };

  const addHabit = (data: Omit<Habit, 'id'>) => setHabits(prev => [...prev, { ...data, id: uid() }]);
  const updateHabit = (habit: Habit) => setHabits(prev => prev.map(h => h.id === habit.id ? habit : h));
  const deleteHabit = (id: string) => {
    const idx = habits.findIndex(h => h.id === id);
    const target = habits[idx];
    if (!target) return;
    setHabits(prev => prev.filter(h => h.id !== id));
    toast('Hábito excluído', { action: { label: 'Desfazer', onClick: () => setHabits(prev => {
      const copy = prev.filter(h => h.id !== target.id);
      copy.splice(Math.min(idx, copy.length), 0, target);
      return copy;
    } ) } });
  };
  const toggleHabitDay = (habitId: string, isoDate: string) => {
    const habit = habits.find(h => h.id === habitId);
    const marking = habit ? !habit.completions.includes(isoDate) : false;
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const done = h.completions.includes(isoDate);
      return { ...h, completions: done ? h.completions.filter(d => d !== isoDate) : [...h.completions, isoDate] };
    }));
    // Celebra ao marcar um hábito de hoje; confete quando fecha todos os do dia.
    if (marking && isoDate === todayISO()) {
      haptic();
      const weekday = new Date().getDay();
      const todays = habits.filter(h => h.targetDays.includes(weekday));
      const doneCount = todays.filter(h => h.id === habitId || h.completions.includes(isoDate)).length;
      if (todays.length > 0 && doneCount === todays.length) {
        celebrateComplete();
        toast('🎉 Hábitos do dia completos!');
      }
    }
  };

  const addProject = (data: Omit<Project, 'id'>) => setProjects(prev => [...prev, { ...data, id: uid() }]);
  const updateProject = (project: Project) => setProjects(prev => prev.map(p => (p.id === project.id ? project : p)));
  const deleteProject = (id: string) => {
    const prevProjects = projects;
    const prevTasks = tasks;
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.map(t => (t.projectId === id ? { ...t, projectId: undefined } : t)));
    toast('Meta excluída', { action: { label: 'Desfazer', onClick: () => { setProjects(prevProjects); setTasks(prevTasks); } } });
  };
  // IA: cria a meta e já adiciona as tarefas vinculadas a ela
  const createProjectWithTasks = (data: Omit<Project, 'id'>, taskList: Omit<Task, 'id'>[]) => {
    const projectId = uid();
    setProjects(prev => [...prev, { ...data, id: projectId }]);
    if (taskList.length) setTasks(prev => [...taskList.map(t => ({ ...t, id: uid(), projectId })), ...prev]);
  };

  // Onboarding: fecha as boas-vindas; opcionalmente remove só os itens de exemplo.
  const dismissWelcome = (clearSamples: boolean) => {
    if (clearSamples) {
      setTasks(prev => prev.filter(t => !['t1', 't2', 't3', 't4'].includes(t.id)));
      setHabits(prev => prev.filter(h => !['h1', 'h2', 'h3'].includes(h.id)));
      setBlocks(prev => prev.filter(b => !['b1', 'b2', 'b3'].includes(b.id)));
    }
    try { localStorage.setItem('tempo_onboarded', '1'); } catch { /* ignore */ }
    setShowWelcome(false);
  };

  // Revisão diária: 1 registro por data (humor + nota)
  const saveDailyReview = (date: string, mood: number, note: string) => setReviews(prev => {
    const others = prev.filter(r => r.date !== date);
    return [...others, { date, mood, note: note.trim() || undefined }];
  });

  // Sincronização automática com o Google Agenda (silenciosa; o botão
  // manual no Planejamento continua disponível para blocos antigos)
  const autoSyncNewBlock = async (block: TimeBlock) => {
    const token = await ensureToken(true);
    if (!token) return;
    try {
      const eventId = await createEventFromBlock(block, token);
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, googleEventId: eventId } : b));
      setGoogleEvents({});
    } catch { /* sem conexão: usuário pode enviar manualmente */ }
  };

  const addBlock = (data: Omit<TimeBlock, 'id'>) => {
    const block: TimeBlock = { ...data, id: uid() };
    setBlocks(prev => [...prev, block]);
    autoSyncNewBlock(block);
  };

  const updateBlock = (block: TimeBlock) => {
    setBlocks(prev => prev.map(b => b.id === block.id ? block : b));
    if (block.googleEventId) {
      ensureToken(true).then(token => {
        if (token) updateEventFromBlock(block, token).then(() => setGoogleEvents({})).catch(() => {});
      });
    } else {
      autoSyncNewBlock(block);
    }
  };

  const deleteBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (block?.googleEventId) {
      ensureToken(true).then(token => {
        if (token) deleteEventById(block.googleEventId, token).then(() => setGoogleEvents({})).catch(() => {});
      });
    }
  };

  const navigate = (view: View) => {
    setCurrentView(view);
    setMoreOpen(false);
  };

  const timerActive = timer.status === 'running' || timer.status === 'paused';

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-slate-200 fixed inset-y-0 z-40">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="w-8 h-8 rounded-lg shadow-sm" />
            <h1 className="text-xl font-bold font-display bg-gradient-to-r from-teal-800 to-emerald-600 bg-clip-text text-transparent">Foco GeriClass</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Gestão de tempo e produtividade</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                currentView === item.id ? 'bg-teal-50 text-teal-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === 'focus' && timerActive && (
                <span className="ml-auto text-xs font-bold text-teal-700 tabular-nums">{formatTimerMs(remainingMs)}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-2 space-y-1">
          <button
            onClick={() => setIsAIOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-800 to-emerald-700 hover:brightness-110 transition-all shadow-md shadow-teal-200"
          >
            <Sparkles size={18} />
            <span>Assistente IA</span>
          </button>
          <button
            onClick={() => setIsGoogleOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <Calendar size={18} className={googleConnected ? 'text-[#4285F4]' : undefined} />
            <span>Google Agenda</span>
            {googleConnected && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
          {notifPerm !== 'unsupported' && (
            <button
              onClick={() => setIsReminderOpen(true)}
              title={notifPerm === 'denied' ? 'Notificações bloqueadas no navegador' : 'Lembrete diário e avisos do Pomodoro'}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              {notifPerm === 'granted' ? <BellRing size={18} className="text-teal-700" /> : notifPerm === 'denied' ? <BellOff size={18} /> : <Bell size={18} />}
              <span>Lembretes</span>
              {notifPerm === 'granted' && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            <span>{dark ? 'Tema claro' : 'Tema escuro'}</span>
          </button>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 truncate" title={userEmail}>{userEmail}</p>
            <p className="text-[10px] text-slate-300">Dados salvos na nuvem</p>
          </div>
          <button
            onClick={onSignOut}
            title="Sair da conta"
            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-60">
        {/* Top bar (mobile) */}
        <header className="header-glass md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="w-7 h-7 rounded-lg shadow-sm" />
            <h1 className="text-lg font-bold font-display bg-gradient-to-r from-teal-800 to-emerald-600 bg-clip-text text-transparent">Foco GeriClass</h1>
          </div>
          <div className="flex items-center gap-2">
            {timerActive && currentView !== 'focus' && (
              <button
                onClick={() => navigate('focus')}
                className="flex items-center gap-1.5 bg-teal-800 text-white text-xs font-bold px-3 py-1.5 rounded-full tabular-nums active:scale-95 transition-transform"
              >
                <Timer size={14} />
                {formatTimerMs(remainingMs)}
              </button>
            )}
            {notifPerm !== 'unsupported' && (
              <button onClick={() => setIsReminderOpen(true)} aria-label="Lembretes" className="p-1 text-slate-400">
                {notifPerm === 'granted' ? <BellRing size={20} className="text-teal-700" /> : notifPerm === 'denied' ? <BellOff size={20} /> : <Bell size={20} />}
              </button>
            )}
            <button onClick={toggleTheme} aria-label="Alternar tema" className="p-1 text-slate-400">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8 pb-[calc(9.5rem+env(safe-area-inset-bottom))] md:pb-8 max-w-5xl mx-auto">
          {pwa.showInstall && (
            <div className="mb-4 flex items-center gap-3 bg-white rounded-xl border border-teal-100 shadow-sm p-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-800 to-emerald-700 text-white flex items-center justify-center shrink-0">
                <Download size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Instalar o Foco GeriClass</p>
                <p className="text-xs text-slate-500">
                  {pwa.canInstall ? 'Acesso rápido na tela inicial, em tela cheia.' : 'Toque em Compartilhar e "Adicionar à Tela de Início".'}
                </p>
              </div>
              {pwa.canInstall && (
                <button onClick={pwa.promptInstall} className="shrink-0 bg-teal-800 text-white text-sm font-bold px-3 py-2 rounded-lg hover:bg-teal-900 active:scale-95 transition">
                  Instalar
                </button>
              )}
              <button onClick={pwa.dismissInstall} aria-label="Dispensar" className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
          )}
          <div key={currentView} className="animate-view-in">
          {currentView === 'today' && (
            <TodayView
              tasks={tasks}
              habits={habits}
              blocks={blocks}
              sessions={sessions}
              googleActive={googleConnected}
              googleEvents={googleEvents[todayISO()] ?? []}
              onLoadGoogleEvents={loadGoogleEventsFor}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onUpdateTask={updateTask}
              onQuickAddTask={(title, dueDate, dueTime, recurrence) => quickAddTask(title, dueDate ?? todayISO(), dueTime, recurrence)}
              projects={projects}
              onToggleHabitDay={toggleHabitDay}
              onStartFocusTask={startFocusOnTask}
              onNavigate={(v) => navigate(v as View)}
              review={reviews.find(r => r.date === todayISO()) ?? null}
              onSaveReview={(mood, note) => saveDailyReview(todayISO(), mood, note)}
              focusMinutes={settings.focusMinutes}
            />
          )}
          {currentView === 'tasks' && (
            <TasksView
              tasks={tasks}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onToggleTask={toggleTask}
              onSetStatus={setTaskStatusById}
              onStartFocusTask={startFocusOnTask}
              projects={projects}
            />
          )}
          {currentView === 'metas' && (
            <MetasView
              projects={projects}
              tasks={tasks}
              onAddProject={addProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onToggleTask={toggleTask}
              onStartFocusTask={startFocusOnTask}
            />
          )}
          {currentView === 'focus' && (
            <FocusView
              timer={timer}
              remainingMs={remainingMs}
              settings={settings}
              tasks={tasks}
              sessions={sessions}
              onStart={startTimer}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onReset={resetTimer}
              onSkip={skipPhase}
              onLinkTask={linkTask}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}
          {currentView === 'habits' && (
            <HabitsView
              habits={habits}
              onAddHabit={addHabit}
              onUpdateHabit={updateHabit}
              onDeleteHabit={deleteHabit}
              onToggleDay={toggleHabitDay}
            />
          )}
          {currentView === 'planner' && (
            <PlannerView
              blocks={blocks}
              tasks={tasks}
              googleActive={googleConnected}
              googleEvents={googleEvents}
              onLoadGoogleEvents={loadGoogleEventsFor}
              onSendBlockToGoogle={sendBlockToGoogle}
              onOpenGoogleSettings={() => setIsGoogleOpen(true)}
              onAddBlock={addBlock}
              onUpdateBlock={updateBlock}
              onDeleteBlock={deleteBlock}
            />
          )}
          {currentView === 'reports' && (
            <ReportsView tasks={tasks} habits={habits} sessions={sessions} reviews={reviews} />
          )}
          </div>
        </main>
      </div>

      {!pwa.online && (
        <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[95] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-white text-xs font-medium shadow-lg">
          <WifiOff size={13} /> Sem conexão
        </div>
      )}

      {/* Bolinha de criação rápida (mobile): IA / Tarefa / Hábito / Bloco */}
      <CreateFab
        onTask={() => setCreating('task')}
        onHabit={() => setCreating('habit')}
        onBlock={() => setCreating('block')}
        onProject={() => setCreating('project')}
        onAI={() => setIsAIOpen(true)}
      />

      {/* Barra de abas (mobile) */}
      <nav className="tabbar-glass md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map(id => {
            const item = NAV_ITEMS.find(n => n.id === id)!;
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 min-h-[56px] justify-center ${active ? 'text-teal-700' : 'text-slate-400'}`}
              >
                <item.icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 py-2.5 min-h-[56px] justify-center ${MORE_NAV.includes(currentView) ? 'text-teal-700' : 'text-slate-400'}`}
          >
            <MoreHorizontal size={22} />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* Sheet "Mais" (mobile) */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setMoreOpen(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800">Mais</h3>
              <button onClick={() => setMoreOpen(false)} className="p-2 text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-1">
              {MORE_NAV.map(id => {
                const item = NAV_ITEMS.find(n => n.id === id)!;
                return (
                  <button
                    key={id}
                    onClick={() => navigate(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium ${
                      currentView === id ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => { setMoreOpen(false); setIsGoogleOpen(true); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Calendar size={20} className={googleConnected ? 'text-[#4285F4]' : undefined} />
                <span>Google Agenda</span>
                {googleConnected && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />}
              </button>
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut size={20} />
                <span>Sair da conta</span>
                <span className="ml-auto text-[10px] text-slate-300 truncate max-w-[120px]">{userEmail}</span>
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-2">
                <a href={`${import.meta.env.BASE_URL}privacidade.html`} target="_blank" rel="noreferrer" className="hover:text-slate-600 transition-colors">Privacidade</a>
                <span>·</span>
                <a href={`${import.meta.env.BASE_URL}termos.html`} target="_blank" rel="noreferrer" className="hover:text-slate-600 transition-colors">Termos de Uso</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <PomodoroSettingsModal
          settings={settings}
          onSave={(s) => { setSettings(s); setIsSettingsOpen(false); }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isAIOpen && (
        <AIAssistant
          tasks={tasks}
          blocks={blocks}
          projects={projects}
          onCreateTask={addTask}
          onCreateBlock={addBlock}
          onCreateHabit={addHabit}
          onCreateProject={createProjectWithTasks}
          onSetTaskStatus={setTaskStatusById}
          onClose={() => setIsAIOpen(false)}
        />
      )}

      {isGoogleOpen && (
        <GoogleSettingsModal
          settings={googleSettings}
          connected={googleConnected}
          appConfigured={!!GOOGLE_CLIENT_ID}
          onConnect={connectGoogle}
          onDisconnect={handleGoogleDisconnect}
          onClose={() => setIsGoogleOpen(false)}
        />
      )}

      {isReminderOpen && (
        <ReminderModal
          notifPerm={notifPerm}
          onPermChange={setNotifPerm}
          onClose={() => setIsReminderOpen(false)}
        />
      )}

      {creating === 'task' && (
        <TaskForm
          projects={projects}
          onSave={(data) => { addTask(data); setCreating(null); }}
          onClose={() => setCreating(null)}
        />
      )}
      {creating === 'habit' && (
        <HabitForm
          onSave={(data) => { addHabit(data); setCreating(null); }}
          onClose={() => setCreating(null)}
        />
      )}
      {creating === 'block' && (
        <TimeBlockForm
          defaultDate={todayISO()}
          tasks={tasks}
          onSave={(data) => { addBlock(data); setCreating(null); }}
          onClose={() => setCreating(null)}
        />
      )}
      {creating === 'project' && (
        <ProjectForm
          onSave={(data) => { addProject(data); setCreating(null); }}
          onClose={() => setCreating(null)}
        />
      )}

      {showWelcome && (
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-800 to-emerald-700 text-white flex items-center justify-center mb-4">
              <Sparkles size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Bem-vindo ao Foco GeriClass 👋</h2>
            <p className="text-sm text-slate-500 mt-1">Organize tarefas, foque com pomodoro e construa hábitos — tudo num lugar só.</p>
            <div className="mt-4 space-y-2.5">
              {[
                { icon: CheckSquare, text: 'Priorize com a Matriz de Eisenhower' },
                { icon: Timer, text: 'Foque em blocos com o timer pomodoro' },
                { icon: Repeat, text: 'Crie hábitos e acompanhe sua evolução' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><Icon size={16} /></span>
                  <span className="text-sm text-slate-600">{text}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">Já deixamos alguns itens de exemplo pra você explorar.</p>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => dismissWelcome(false)}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-800 to-emerald-700 hover:brightness-110 active:scale-[0.98] transition"
              >
                Explorar com exemplos
              </button>
              <button
                onClick={() => dismissWelcome(true)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition"
              >
                Começar do zero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TempoApp;
