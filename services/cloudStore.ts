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

export interface SnapshotRow {
  data: AppSnapshot;
  updatedAt: string | null;
}

export const loadSnapshot = async (userId: string): Promise<SnapshotRow | null> => {
  const { data, error } = await supabase
    .from('tempo_app_state')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar seus dados. Verifique sua conexão.');
  if (!data) return null; // nenhum registro na nuvem (usuário novo)
  return { data: (data.data as AppSnapshot) ?? {}, updatedAt: (data.updated_at as string | null) ?? null };
};

/** Só a versão (updated_at) do snapshot — usado para detectar edição em outro aparelho. */
export const fetchSnapshotVersion = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('tempo_app_state')
    .select('updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.updated_at as string | null) ?? null;
};

export const saveSnapshot = async (userId: string, snapshot: AppSnapshot): Promise<string> => {
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from('tempo_app_state')
    .upsert({ user_id: userId, data: snapshot, updated_at: updatedAt });
  if (error) throw new Error('Falha ao salvar na nuvem.');
  return updatedAt;
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
