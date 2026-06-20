// Web Push (lembretes diários que chegam mesmo com o app fechado).
// A inscrição do aparelho é guardada no Supabase (push_subscriptions); um
// agendador no servidor (pg_cron → função tempo-push) envia o lembrete na
// hora escolhida, com a contagem de tarefas do dia.
import { supabase } from './supabaseClient';

// Chave PÚBLICA do VAPID — segura para expor. A privada vive só no servidor.
const VAPID_PUBLIC = 'BDUzRx_CaRknUSzQ396lj-hSjrHKaDuEHrm2s-rHFnmZULNy6ftU2XMf8U-knx__wMAVz_GSHrr8Zek8QiYuja4';

export const pushSupported = (): boolean =>
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  typeof window !== 'undefined' &&
  'PushManager' in window &&
  'Notification' in window;

const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const getRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.ready; } catch { return null; }
};

export const hasPushSubscription = async (): Promise<boolean> => {
  const reg = await getRegistration();
  if (!reg) return false;
  try { return (await reg.pushManager.getSubscription()) !== null; } catch { return false; }
};

const deviceTz = (): string => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'; }
  catch { return 'America/Sao_Paulo'; }
};

export interface ReminderPrefs {
  morningEnabled: boolean;
  morningHour: number;
  eveningEnabled: boolean;
  eveningHour: number;
}

// Salva as preferências de lembrete deste aparelho. Cria a inscrição de push na
// primeira vez que algo é ligado; depois só atualiza horários e flags.
// Omite last_sent_on/last_evening_on de propósito: trocar a hora não reenvia hoje.
export const saveReminderPrefs = async (p: ReminderPrefs): Promise<boolean> => {
  if (!pushSupported()) return false;
  const reg = await getRegistration();
  if (!reg) return false;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    if (!p.morningEnabled && !p.eveningEnabled) return true; // nada a inscrever ainda
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const j = sub.toJSON();
  if (!j.keys?.p256dh || !j.keys?.auth) return false;
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    tz: deviceTz(),
    enabled: p.morningEnabled,
    reminder_hour: p.morningHour,
    evening_enabled: p.eveningEnabled,
    evening_hour: p.eveningHour,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  return !error;
};

// Dispara um push de teste imediato para os aparelhos deste usuário.
export const sendTestPush = async (): Promise<{ ok: boolean; sent: number; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('tempo-push', { body: { test: true } });
    if (error) return { ok: false, sent: 0, error: error.message };
    return { ok: true, sent: (data as { sent?: number })?.sent ?? 0 };
  } catch (e) {
    return { ok: false, sent: 0, error: (e as Error).message };
  }
};
