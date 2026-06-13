import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LayoutDashboard, CheckSquare, Timer, Repeat, CalendarClock, BarChart3, MoreHorizontal, X, Calendar, LogOut, Sparkles, Bell, BellRing, BellOff, Sun, Moon, Target } from 'lucide-react';
import {
  Task, TaskStatus, Habit, Project, DailyReview, TimeBlock, FocusSession, PomodoroSettings, TimerState, TimerPhase,
  GoogleSettings, GoogleEvent, DEFAULT_POMODORO_SETTINGS, DEFAULT_TIMER_STATE, DEFAULT_GOOGLE_SETTINGS, GOOGLE_CLIENT_ID,
} from './types';
import { uid, toISODate, todayISO, formatTimerMs, playBeep, nextRecurrenceISO, timeToMinutes } from './utils';
import { AppSnapshot } from './services/cloudStore';
import { notifPermission, requestNotifPermission, sendNotification } from './services/notifications';
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
  { id: 'h3', name: 'Leitura antes de dormir', color: '#6366f1', emoji: '📖', targetDays: [0, 1, 2, 3, 4, 5, 6], completions: [], createdAt: now },
];

const INITIAL_BLOCKS: TimeBlock[] = [
  { id: 'b1', date: today, start: '08:00', end: '09:00', title: 'Planejar o dia', color: '#6366f1' },
  { id: 'b2', date: today, start: '09:00', end: '11:00', title: 'Trabalho focado', color: '#10b981' },
  { id: 'b3', date: today, start: '14:00', end: '15:00', title: 'Reuniões', color: '#f59e0b' },
];

type View = 'today' | 'tasks' | 'metas' | 'focus' | 'habits' | 'planner' | 'reports';

const NAV_ITEMS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'today', label: 'Hoje', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'focus', label: 'Foco', icon: Timer },
  { id: 'habits', label: 'Hábitos', icon: Repeat },
  { id: 'planner', label: 'Agenda', icon: CalendarClock },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
];

const MOBILE_NAV: View[] = ['today', 'tasks', 'focus', 'habits'];
const MORE_NAV: View[] = ['metas', 'planner', 'reports'];

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
  const [currentView, setCurrentView] = useState<View>('today');
  const [moreOpen, setMoreOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
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
      const fresh = await requestToken(clientId);
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
      alert((e as Error).message || 'Não foi possível enviar para o Google Agenda.');
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
          task.id === t.linkedTaskId ? { ...task, completedPomodoros: task.completedPomodoros + 1 } : task
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
      document.title = `${formatTimerMs(remainingMs)} — ${label} | Tempo AI`;
    } else {
      document.title = 'Tempo AI';
    }
  }, [remainingMs, timer.status, timer.phase]);

  // Lembretes (app aberto): avisa quando um bloco de hoje está prestes a começar
  useEffect(() => {
    if (notifPerm !== 'granted') return;
    const check = () => {
      const today = todayISO();
      const d = new Date();
      const nowMin = d.getHours() * 60 + d.getMinutes();
      blocks.filter(b => b.date === today).forEach(b => {
        const diff = timeToMinutes(b.start) - nowMin;
        const key = `${today}:${b.id}`;
        if (diff >= 0 && diff <= 5 && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          sendNotification(`⏰ ${b.title}`, diff === 0 ? `Começa agora · ${b.start}` : `Começa em ${diff} min · ${b.start}`);
        }
      });
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [notifPerm, blocks]);

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
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));
  const toggleTask = (id: string) => setTasks(prev => {
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

  // Define o estágio de uma tarefa (Kanban e IA); concluir gera a próxima ocorrência recorrente
  const setTaskStatusById = (id: string, status: TaskStatus) => setTasks(prev => {
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

  const quickAddTask = (title: string, dueDate?: string) => addTask({
    title, urgent: false, important: true, dueDate, category: 'Outros',
    estimatedPomodoros: 1, completedPomodoros: 0, completed: false, createdAt: new Date().toISOString(),
  });

  const addHabit = (data: Omit<Habit, 'id'>) => setHabits(prev => [...prev, { ...data, id: uid() }]);
  const updateHabit = (habit: Habit) => setHabits(prev => prev.map(h => h.id === habit.id ? habit : h));
  const deleteHabit = (id: string) => setHabits(prev => prev.filter(h => h.id !== id));
  const toggleHabitDay = (habitId: string, isoDate: string) => setHabits(prev => prev.map(h => {
    if (h.id !== habitId) return h;
    const done = h.completions.includes(isoDate);
    return { ...h, completions: done ? h.completions.filter(d => d !== isoDate) : [...h.completions, isoDate] };
  }));

  const addProject = (data: Omit<Project, 'id'>) => setProjects(prev => [...prev, { ...data, id: uid() }]);
  const updateProject = (project: Project) => setProjects(prev => prev.map(p => (p.id === project.id ? project : p)));
  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.map(t => (t.projectId === id ? { ...t, projectId: undefined } : t)));
  };
  // IA: cria a meta e já adiciona as tarefas vinculadas a ela
  const createProjectWithTasks = (data: Omit<Project, 'id'>, taskList: Omit<Task, 'id'>[]) => {
    const projectId = uid();
    setProjects(prev => [...prev, { ...data, id: projectId }]);
    if (taskList.length) setTasks(prev => [...taskList.map(t => ({ ...t, id: uid(), projectId })), ...prev]);
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

  const handleNotifClick = async () => {
    if (notifPerm === 'granted') { sendNotification('Lembretes já estão ativos ✅'); return; }
    if (notifPerm === 'denied' || notifPerm === 'unsupported') return;
    const p = await requestNotifPermission();
    setNotifPerm(p);
    if (p === 'granted') sendNotification('Lembretes ativados ✅', 'Avisaremos dos blocos e do fim do Pomodoro.');
  };

  const timerActive = timer.status === 'running' || timer.status === 'paused';

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-slate-200 fixed inset-y-0 z-40">
        <div className="px-6 py-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">Tempo AI</h1>
          <p className="text-xs text-slate-400 mt-1">Gestão de tempo e produtividade</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                currentView === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === 'focus' && timerActive && (
                <span className="ml-auto text-xs font-bold text-indigo-600 tabular-nums">{formatTimerMs(remainingMs)}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-2 space-y-1">
          <button
            onClick={() => setIsAIOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 transition-all shadow-md shadow-indigo-200"
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
              onClick={handleNotifClick}
              title={notifPerm === 'denied' ? 'Notificações bloqueadas no navegador' : 'Lembretes de blocos e Pomodoro'}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              {notifPerm === 'granted' ? <BellRing size={18} className="text-indigo-600" /> : notifPerm === 'denied' ? <BellOff size={18} /> : <Bell size={18} />}
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
        <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">Tempo AI</h1>
          <div className="flex items-center gap-2">
            {timerActive && currentView !== 'focus' && (
              <button
                onClick={() => navigate('focus')}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full tabular-nums active:scale-95 transition-transform"
              >
                <Timer size={14} />
                {formatTimerMs(remainingMs)}
              </button>
            )}
            {notifPerm !== 'unsupported' && (
              <button onClick={handleNotifClick} aria-label="Lembretes" className="p-1 text-slate-400">
                {notifPerm === 'granted' ? <BellRing size={20} className="text-indigo-600" /> : notifPerm === 'denied' ? <BellOff size={20} /> : <Bell size={20} />}
              </button>
            )}
            <button onClick={toggleTheme} aria-label="Alternar tema" className="p-1 text-slate-400">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8 pb-28 md:pb-8 max-w-5xl mx-auto">
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
              onQuickAddTask={(title) => quickAddTask(title, todayISO())}
              onToggleHabitDay={toggleHabitDay}
              onStartFocusTask={startFocusOnTask}
              onNavigate={(v) => navigate(v as View)}
              review={reviews.find(r => r.date === todayISO()) ?? null}
              onSaveReview={(mood, note) => saveDailyReview(todayISO(), mood, note)}
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
            <ReportsView tasks={tasks} habits={habits} sessions={sessions} />
          )}
        </main>
      </div>

      {/* Botão do assistente IA (mobile) */}
      <button
        onClick={() => setIsAIOpen(true)}
        aria-label="Assistente IA"
        className="md:hidden fixed bottom-24 left-4 z-40 w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-90 transition-transform"
      >
        <Sparkles size={22} />
      </button>

      {/* Barra de abas (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map(id => {
            const item = NAV_ITEMS.find(n => n.id === id)!;
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 min-h-[56px] justify-center ${active ? 'text-indigo-600' : 'text-slate-400'}`}
              >
                <item.icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 py-2.5 min-h-[56px] justify-center ${MORE_NAV.includes(currentView) ? 'text-indigo-600' : 'text-slate-400'}`}
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
                      currentView === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
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
    </div>
  );
};

export default TempoApp;
