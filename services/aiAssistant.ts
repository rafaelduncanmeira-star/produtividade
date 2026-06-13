import { supabase } from './supabaseClient';
import {
  Task, TimeBlock, Habit, Project, TaskStatus, DEFAULT_TASK_CATEGORIES, HABIT_COLORS, HABIT_EMOJIS, BLOCK_COLORS, PROJECT_EMOJIS, getTaskStatus,
} from '../types';
import { todayISO, uid } from '../utils';

// Ações estruturadas devolvidas pelo assistente (validadas aqui no cliente)

export interface AIResult {
  reply: string;
  actions: AIAction[];
}

export type AIAction =
  | { type: 'create_task'; data: Omit<Task, 'id'>; label: string }
  | { type: 'create_block'; data: Omit<TimeBlock, 'id'>; label: string }
  | { type: 'create_habit'; data: Omit<Habit, 'id'>; label: string }
  | { type: 'create_project'; data: Omit<Project, 'id'>; tasks: Omit<Task, 'id'>[]; label: string }
  | { type: 'complete_task'; taskId: string; label: string }
  | { type: 'set_task_status'; taskId: string; status: TaskStatus; label: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const STATUS_LABELS: Record<TaskStatus, string> = { todo: 'A fazer', doing: 'Fazendo', done: 'Concluído' };

// Constrói os dados de uma tarefa a partir do JSON da IA (usado por create_task e create_project)
const coerceTaskData = (raw: any, now: string): Omit<Task, 'id'> | null => {
  if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null;
  const dueDate = typeof raw.dueDate === 'string' && DATE_RE.test(raw.dueDate) ? raw.dueDate : undefined;
  const category = DEFAULT_TASK_CATEGORIES.includes(raw.category) ? raw.category : 'Outros';
  const subs = Array.isArray(raw.subtasks)
    ? raw.subtasks.filter((s: unknown): s is string => typeof s === 'string' && !!s.trim())
        .slice(0, 8).map((s: string) => ({ id: uid(), title: s.trim().slice(0, 100), done: false }))
    : [];
  return {
    title: raw.title.trim().slice(0, 120),
    urgent: !!raw.urgent,
    important: raw.important !== false,
    dueDate,
    category,
    estimatedPomodoros: Math.min(12, Math.max(0, Math.round(Number(raw.estimatedPomodoros)) || 1)),
    completedPomodoros: 0,
    completed: false,
    subtasks: subs.length ? subs : undefined,
    createdAt: now,
  };
};

const coerceAction = (raw: any, index: number, taskMap: Map<string, Task>): AIAction | null => {
  if (!raw || typeof raw !== 'object') return null;
  const now = new Date().toISOString();

  if (raw.type === 'create_task') {
    const data = coerceTaskData(raw, now);
    if (!data) return null;
    const sc = data.subtasks?.length ?? 0;
    return { type: 'create_task', data, label: `Tarefa: ${data.title}${data.dueDate ? ` (até ${data.dueDate.slice(8, 10)}/${data.dueDate.slice(5, 7)})` : ''}${sc ? ` · ${sc} passos` : ''}` };
  }

  if (raw.type === 'create_block' && typeof raw.title === 'string' && raw.title.trim()
    && typeof raw.date === 'string' && DATE_RE.test(raw.date)
    && typeof raw.start === 'string' && TIME_RE.test(raw.start)
    && typeof raw.end === 'string' && TIME_RE.test(raw.end) && raw.end > raw.start) {
    const data: Omit<TimeBlock, 'id'> = {
      title: raw.title.trim().slice(0, 120),
      date: raw.date,
      start: raw.start,
      end: raw.end,
      color: BLOCK_COLORS[index % BLOCK_COLORS.length],
    };
    return { type: 'create_block', data, label: `Bloco: ${data.title} — ${data.date.slice(8, 10)}/${data.date.slice(5, 7)} ${data.start}–${data.end}` };
  }

  if (raw.type === 'create_habit' && typeof raw.name === 'string' && raw.name.trim()) {
    const targetDays = Array.isArray(raw.targetDays)
      ? raw.targetDays.filter((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6)
      : [];
    const data: Omit<Habit, 'id'> = {
      name: raw.name.trim().slice(0, 80),
      emoji: typeof raw.emoji === 'string' && [...raw.emoji].length <= 2 && raw.emoji.trim() ? raw.emoji : HABIT_EMOJIS[0],
      color: HABIT_COLORS[index % HABIT_COLORS.length],
      targetDays: targetDays.length > 0 ? targetDays : [0, 1, 2, 3, 4, 5, 6],
      completions: [],
      createdAt: now,
    };
    return { type: 'create_habit', data, label: `Hábito: ${data.emoji} ${data.name}` };
  }

  if (raw.type === 'create_project' && typeof raw.name === 'string' && raw.name.trim()) {
    const dueDate = typeof raw.dueDate === 'string' && DATE_RE.test(raw.dueDate) ? raw.dueDate : undefined;
    const tasks = (Array.isArray(raw.tasks) ? raw.tasks : [])
      .map((t: any) => coerceTaskData(typeof t === 'string' ? { title: t } : t, now))
      .filter((t: Omit<Task, 'id'> | null): t is Omit<Task, 'id'> => t !== null)
      .slice(0, 12);
    const data: Omit<Project, 'id'> = {
      name: raw.name.trim().slice(0, 80),
      emoji: typeof raw.emoji === 'string' && [...raw.emoji].length <= 2 && raw.emoji.trim() ? raw.emoji : PROJECT_EMOJIS[0],
      color: BLOCK_COLORS[index % BLOCK_COLORS.length],
      dueDate,
      createdAt: now,
    };
    return { type: 'create_project', data, tasks, label: `Meta: ${data.emoji} ${data.name}${tasks.length ? ` · ${tasks.length} tarefas` : ''}` };
  }

  // Concluir uma tarefa existente (id precisa estar na lista enviada à IA)
  if (raw.type === 'complete_task' && typeof raw.taskId === 'string') {
    const t = taskMap.get(raw.taskId);
    if (!t || t.completed) return null;
    return { type: 'complete_task', taskId: t.id, label: `Concluir: ${t.title}` };
  }

  // Mover uma tarefa existente no quadro
  if (raw.type === 'set_task_status' && typeof raw.taskId === 'string'
    && (raw.status === 'todo' || raw.status === 'doing' || raw.status === 'done')) {
    const t = taskMap.get(raw.taskId);
    if (!t || getTaskStatus(t) === raw.status) return null;
    return { type: 'set_task_status', taskId: t.id, status: raw.status, label: `Mover "${t.title}" → ${STATUS_LABELS[raw.status as TaskStatus]}` };
  }

  return null;
};

// Contexto enviado à IA: data/hora + tarefas pendentes (com id) + blocos de hoje
const buildContext = (tasks: Task[], blocks: TimeBlock[]): string => {
  const now = new Date();
  const today = todayISO();
  const dateLine = `Data atual: ${today} (${new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now)}), horário atual: ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}.`;
  const pending = tasks.filter(t => !t.completed).slice(0, 40);
  const tasksLine = pending.length
    ? `\n\nTAREFAS EXISTENTES (use o id EXATO ao concluir/mover):\n${pending.map(t => `- [${t.id}] ${t.title} (${STATUS_LABELS[getTaskStatus(t)]})`).join('\n')}`
    : '';
  const todayBlocks = blocks.filter(b => b.date === today).sort((a, b) => a.start.localeCompare(b.start));
  const blocksLine = todayBlocks.length
    ? `\n\nBLOCOS DE HOJE (evite conflitar):\n${todayBlocks.map(b => `- ${b.start}–${b.end} ${b.title}`).join('\n')}`
    : '';
  return dateLine + tasksLine + blocksLine;
};

export const askAssistant = async (
  command: string,
  ctx?: { tasks: Task[]; blocks: TimeBlock[] },
): Promise<AIResult> => {
  const context = buildContext(ctx?.tasks ?? [], ctx?.blocks ?? []);
  const taskMap = new Map((ctx?.tasks ?? []).map(t => [t.id, t]));

  const { data, error } = await supabase.functions.invoke('tempo-ai', {
    body: { command, context },
  });

  if (error) {
    // Tenta extrair a mensagem amigável devolvida pela função
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) throw new Error(body.error);
    } catch (e) {
      if (e instanceof Error && e.message && !e.message.includes('context')) throw e;
    }
    throw new Error('Não foi possível falar com o assistente. Verifique sua conexão.');
  }
  if (data?.error) throw new Error(data.error);

  const actions = (Array.isArray(data?.actions) ? data.actions : [])
    .map((raw: any, i: number) => coerceAction(raw, i, taskMap))
    .filter((a: AIAction | null): a is AIAction => a !== null);

  return { reply: typeof data?.reply === 'string' ? data.reply : 'Feito!', actions };
};
