import { supabase } from './supabaseClient';
import {
  Task, TimeBlock, Habit, DEFAULT_TASK_CATEGORIES, HABIT_COLORS, HABIT_EMOJIS, BLOCK_COLORS,
} from '../types';
import { todayISO } from '../utils';

// Ações estruturadas devolvidas pelo assistente (validadas aqui no cliente)

export interface AIResult {
  reply: string;
  actions: AIAction[];
}

export type AIAction =
  | { type: 'create_task'; data: Omit<Task, 'id'>; label: string }
  | { type: 'create_block'; data: Omit<TimeBlock, 'id'>; label: string }
  | { type: 'create_habit'; data: Omit<Habit, 'id'>; label: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const coerceAction = (raw: any, index: number): AIAction | null => {
  if (!raw || typeof raw !== 'object') return null;
  const now = new Date().toISOString();

  if (raw.type === 'create_task' && typeof raw.title === 'string' && raw.title.trim()) {
    const dueDate = typeof raw.dueDate === 'string' && DATE_RE.test(raw.dueDate) ? raw.dueDate : undefined;
    const category = DEFAULT_TASK_CATEGORIES.includes(raw.category) ? raw.category : 'Outros';
    const data: Omit<Task, 'id'> = {
      title: raw.title.trim().slice(0, 120),
      urgent: !!raw.urgent,
      important: raw.important !== false,
      dueDate,
      category,
      estimatedPomodoros: Math.min(12, Math.max(0, Math.round(Number(raw.estimatedPomodoros)) || 1)),
      completedPomodoros: 0,
      completed: false,
      createdAt: now,
    };
    return { type: 'create_task', data, label: `Tarefa: ${data.title}${dueDate ? ` (até ${dueDate.slice(8, 10)}/${dueDate.slice(5, 7)})` : ''}` };
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

  return null;
};

export const askAssistant = async (command: string): Promise<AIResult> => {
  const now = new Date();
  const context = `Data atual: ${todayISO()} (${new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now)}), horário atual: ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}.`;

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
    .map((raw: any, i: number) => coerceAction(raw, i))
    .filter((a: AIAction | null): a is AIAction => a !== null);

  return { reply: typeof data?.reply === 'string' ? data.reply : 'Feito!', actions };
};
