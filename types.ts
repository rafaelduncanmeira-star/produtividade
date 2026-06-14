
// --- Matriz de Eisenhower ---

export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';

export interface QuadrantInfo {
  label: string;
  hint: string;
  color: string;       // cor base (hex) para gráficos/bordas
  badgeClass: string;  // classes tailwind do selo
  cellClass: string;   // classes tailwind da célula da matriz
}

export const QUADRANTS: Quadrant[] = ['q1', 'q2', 'q3', 'q4'];

export const QUADRANT_INFO: Record<Quadrant, QuadrantInfo> = {
  q1: {
    label: 'Fazer agora',
    hint: 'Urgente e importante',
    color: '#f43f5e',
    badgeClass: 'bg-rose-100 text-rose-700',
    cellClass: 'border-rose-200 bg-rose-50/50',
  },
  q2: {
    label: 'Agendar',
    hint: 'Importante, não urgente',
    color: '#0f766e',
    badgeClass: 'bg-teal-100 text-teal-800',
    cellClass: 'border-teal-200 bg-teal-50/50',
  },
  q3: {
    label: 'Delegar',
    hint: 'Urgente, não importante',
    color: '#f59e0b',
    badgeClass: 'bg-amber-100 text-amber-700',
    cellClass: 'border-amber-200 bg-amber-50/50',
  },
  q4: {
    label: 'Eliminar',
    hint: 'Nem urgente, nem importante',
    color: '#94a3b8',
    badgeClass: 'bg-slate-100 text-slate-500',
    cellClass: 'border-slate-200 bg-slate-50/50',
  },
};

export const getQuadrant = (task: Pick<Task, 'urgent' | 'important'>): Quadrant => {
  if (task.urgent && task.important) return 'q1';
  if (task.important) return 'q2';
  if (task.urgent) return 'q3';
  return 'q4';
};

// --- Entidades ---

// Kanban: estágio da tarefa. 'done' é espelhado por `completed` (compatibilidade).
export type TaskStatus = 'todo' | 'doing' | 'done';

// Recorrência: ao concluir, gera a próxima ocorrência.
export type RecurrenceFreq = 'daily' | 'weekdays' | 'weekly' | 'monthly';

// Subtarefa (checklist dentro de uma tarefa)
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  urgent: boolean;
  important: boolean;
  dueDate?: string;            // 'YYYY-MM-DD' (local)
  dueTime?: string;            // 'HH:MM' (opcional); com horário aparece na Agenda do dia
  category: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  completed: boolean;
  completedAt?: string;        // ISO datetime
  status?: TaskStatus;         // coluna do Kanban; ausente = 'todo' (ou 'done' se completed)
  recurrence?: RecurrenceFreq; // se definido, concluir gera a próxima ocorrência
  recurrenceSpawned?: boolean; // marca interna p/ não gerar a próxima ocorrência duas vezes
  subtasks?: Subtask[];        // checklist opcional
  projectId?: string;          // meta/projeto ao qual a tarefa pertence
  createdAt: string;           // ISO datetime
}

// Estágio efetivo da tarefa no Kanban (deriva de `completed` + `status`).
export const getTaskStatus = (task: Pick<Task, 'completed' | 'status'>): TaskStatus =>
  task.completed ? 'done' : task.status === 'doing' ? 'doing' : 'todo';

export interface KanbanColumnInfo {
  id: TaskStatus;
  label: string;
  dotClass: string;   // cor do marcador da coluna
  ringClass: string;  // borda da coluna
}

export const KANBAN_COLUMNS: KanbanColumnInfo[] = [
  { id: 'todo', label: 'A fazer', dotClass: 'bg-slate-400', ringClass: 'border-slate-200' },
  { id: 'doing', label: 'Fazendo', dotClass: 'bg-teal-700', ringClass: 'border-teal-200' },
  { id: 'done', label: 'Concluído', dotClass: 'bg-emerald-500', ringClass: 'border-emerald-200' },
];

export const RECURRENCE_OPTIONS: { value: '' | RecurrenceFreq; label: string }[] = [
  { value: '', label: 'Não repete' },
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekdays', label: 'Dias úteis (seg–sex)' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly', label: 'Todo mês' },
];

export const RECURRENCE_LABELS: Record<RecurrenceFreq, string> = {
  daily: 'Diária', weekdays: 'Dias úteis', weekly: 'Semanal', monthly: 'Mensal',
};

export interface FocusSession {
  id: string;
  date: string;                // 'YYYY-MM-DD' (local), dia em que a sessão começou
  startedAt: string;           // ISO datetime
  minutes: number;
  taskId?: string;
}

export interface Habit {
  id: string;
  name: string;
  color: string;
  emoji: string;
  targetDays: number[];        // 0=Dom ... 6=Sáb
  completions: string[];       // ['YYYY-MM-DD', ...]
  createdAt: string;           // ISO datetime
}

// Meta/Projeto: agrupa tarefas rumo a um objetivo
export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: string;
  dueDate?: string;            // 'YYYY-MM-DD' (prazo opcional)
  createdAt: string;           // ISO datetime
}

// Revisão diária (humor + nota do dia)
export interface DailyReview {
  date: string;                // 'YYYY-MM-DD'
  mood: number;                // 1..5
  note?: string;
}

export const REVIEW_MOODS = ['😞', '😐', '🙂', '😀', '🤩'];

export interface TimeBlock {
  id: string;
  date: string;                // 'YYYY-MM-DD'
  start: string;               // 'HH:mm'
  end: string;                 // 'HH:mm'
  title: string;
  color: string;
  taskId?: string;
  googleEventId?: string;      // preenchido quando o bloco foi enviado ao Google Agenda
}

// --- Google Agenda ---

export interface GoogleSettings {
  clientId: string;            // OAuth Client ID gerado pelo usuário no Google Cloud
}

export const DEFAULT_GOOGLE_SETTINGS: GoogleSettings = { clientId: '' };

// Client ID OAuth do app (compartilhado): habilita "Conectar com Google" em 1 toque,
// sem cada usuário criar o seu. Vazio = cai no modo manual (avançado).
export const GOOGLE_CLIENT_ID = '302000666542-q3s86uoauf1bne6v17nlv4tr2osghd88.apps.googleusercontent.com';

export interface GoogleEvent {
  id: string;
  title: string;
  date: string;                // 'YYYY-MM-DD' (dia consultado)
  start: string;               // 'HH:mm' ('' para evento de dia inteiro)
  end: string;
  allDay: boolean;
  color?: string;              // cor da agenda de origem (hex)
}

export const GOOGLE_EVENT_COLOR = '#4285F4';

// --- Pomodoro ---

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  soundEnabled: boolean;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  soundEnabled: true,
};

export type TimerPhase = 'focus' | 'short_break' | 'long_break';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  phase: TimerPhase;
  status: TimerStatus;
  endsAt: number | null;       // epoch ms, definido enquanto rodando
  remainingMs: number | null;  // definido enquanto pausado
  phaseMinutes: number | null; // duração planejada da fase em andamento
  startedAt: string | null;    // ISO, início da fase de foco atual (para o log)
  linkedTaskId: string | null;
  cyclesCompleted: number;     // focos concluídos desde a última pausa longa
}

export const DEFAULT_TIMER_STATE: TimerState = {
  phase: 'focus',
  status: 'idle',
  endsAt: null,
  remainingMs: null,
  phaseMinutes: null,
  startedAt: null,
  linkedTaskId: null,
  cyclesCompleted: 0,
};

export const TIMER_PHASE_LABELS: Record<TimerPhase, string> = {
  focus: 'Foco',
  short_break: 'Pausa curta',
  long_break: 'Pausa longa',
};

// --- Constantes de UI ---

export const DEFAULT_TASK_CATEGORIES = ['Trabalho', 'Estudos', 'Pessoal', 'Saúde', 'Casa', 'Outros'];

export const HABIT_COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];
export const BLOCK_COLORS = HABIT_COLORS;

export const HABIT_EMOJIS = ['💧', '🏃', '📖', '🧘', '💪', '🥗', '😴', '🎸', '✍️', '🦷', '☀️', '🚭'];

export const PROJECT_EMOJIS = ['🎯', '📚', '💼', '🏆', '🚀', '🎓', '💡', '🗂️', '🔬', '🎨', '🔥', '⭐'];

export const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const PLANNER_START_HOUR = 6;
export const PLANNER_END_HOUR = 23;
export const PLANNER_HOUR_HEIGHT = 64; // px por hora
