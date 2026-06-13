import { supabase } from './supabaseClient';
import { Task, Habit, Project, DailyReview, TimeBlock, FocusSession, PomodoroSettings, TimerState, GoogleSettings } from '../types';

// Snapshot completo do estado do app, salvo como JSON (1 registro por usuário)
export interface AppSnapshot {
  tasks?: Task[];
  sessions?: FocusSession[];
  habits?: Habit[];
  blocks?: TimeBlock[];
  projects?: Project[];
  reviews?: DailyReview[];
  pomodoroSettings?: PomodoroSettings;
  googleSettings?: GoogleSettings;
  timer?: TimerState;
}

export const loadSnapshot = async (userId: string): Promise<AppSnapshot | null> => {
  const { data, error } = await supabase
    .from('tempo_app_state')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar seus dados. Verifique sua conexão.');
  const snap = data?.data as AppSnapshot | undefined;
  return snap && Object.keys(snap).length > 0 ? snap : null;
};

export const saveSnapshot = async (userId: string, snapshot: AppSnapshot): Promise<void> => {
  const { error } = await supabase
    .from('tempo_app_state')
    .upsert({ user_id: userId, data: snapshot, updated_at: new Date().toISOString() });
  if (error) throw new Error('Falha ao salvar na nuvem.');
};

/** Dados salvos pelo app antes da era do login (migração do localStorage antigo). */
export const legacyLocalSnapshot = (): AppSnapshot => {
  const read = <T,>(key: string): T | undefined => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  };
  return {
    tasks: read<Task[]>('tempo_tasks'),
    sessions: read<FocusSession[]>('tempo_sessions'),
    habits: read<Habit[]>('tempo_habits'),
    blocks: read<TimeBlock[]>('tempo_blocks'),
    projects: read<Project[]>('tempo_projects'),
    pomodoroSettings: read<PomodoroSettings>('tempo_pomodoro_settings'),
    googleSettings: read<GoogleSettings>('tempo_google_settings'),
    timer: read<TimerState>('tempo_timer_state'),
  };
};

export const cachedSnapshot = (userId: string): AppSnapshot | null => {
  try {
    const raw = localStorage.getItem(`tempo_snapshot_${userId}`);
    return raw ? (JSON.parse(raw) as AppSnapshot) : null;
  } catch {
    return null;
  }
};

export const cacheSnapshot = (userId: string, snapshot: AppSnapshot) => {
  try {
    localStorage.setItem(`tempo_snapshot_${userId}`, JSON.stringify(snapshot));
  } catch { /* armazenamento cheio: ignora, a nuvem é a fonte principal */ }
};
