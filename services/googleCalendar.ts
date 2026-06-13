import { GoogleEvent, TimeBlock } from '../types';
import { parseISODate, toISODate } from '../utils';

// Integração client-side com o Google Calendar via Google Identity Services
// (token OAuth de curta duração, renovado automaticamente quando expira)

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_KEY = 'tempo_google_token';
const API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

declare global {
  interface Window { google?: any }
}

let gisPromise: Promise<void> | null = null;

export const loadGis = (): Promise<void> => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { gisPromise = null; reject(new Error('Não foi possível carregar o Google. Verifique sua conexão.')); };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
};

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

export const getValidToken = (): string | null => {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t: StoredToken = JSON.parse(raw);
    return Date.now() < t.expiresAt ? t.accessToken : null;
  } catch {
    return null;
  }
};

export const requestToken = async (clientId: string): Promise<string> => {
  await loadGis();
  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp: any) => {
          if (resp.error || !resp.access_token) {
            reject(new Error(resp.error_description || resp.error || 'O Google não autorizou o acesso.'));
            return;
          }
          const stored: StoredToken = {
            accessToken: resp.access_token,
            expiresAt: Date.now() + (Number(resp.expires_in || 3600) - 60) * 1000,
          };
          localStorage.setItem(TOKEN_KEY, JSON.stringify(stored));
          resolve(resp.access_token);
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Conexão com o Google cancelada.'));
        },
      });
      client.requestAccessToken();
    } catch (e) {
      reject(e as Error);
    }
  });
};

export const disconnectGoogle = () => {
  const token = getValidToken();
  if (token && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(token, () => {}); } catch { /* melhor esforço */ }
  }
  localStorage.removeItem(TOKEN_KEY);
};

const pad = (n: number) => String(n).padStart(2, '0');
const toHHmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const handleApiError = (status: number): never => {
  if (status === 401 || status === 403) {
    localStorage.removeItem(TOKEN_KEY);
    throw new Error('A sessão do Google expirou. Conecte novamente.');
  }
  throw new Error(`Erro do Google Agenda (código ${status}).`);
};

export const fetchDayEvents = async (dateISO: string, token: string): Promise<GoogleEvent[]> => {
  const dayStart = parseISODate(dateISO);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const params = new URLSearchParams({
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });
  const res = await fetch(`${API_BASE}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) handleApiError(res.status);
  const data = await res.json();
  return (data.items ?? [])
    .filter((ev: any) => ev.status !== 'cancelled')
    .map((ev: any): GoogleEvent => {
      const allDay = !!ev.start?.date && !ev.start?.dateTime;
      const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
      const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
      return {
        id: ev.id,
        title: ev.summary || '(sem título)',
        date: dateISO,
        allDay,
        start: start ? toHHmm(start) : '',
        end: end ? toHHmm(end) : '',
      };
    });
};

export const createEventFromBlock = async (block: TimeBlock, token: string): Promise<string> => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(blockToEventBody(block)),
  });
  if (!res.ok) handleApiError(res.status);
  const data = await res.json();
  return data.id as string;
};

export const updateEventFromBlock = async (block: TimeBlock, token: string): Promise<void> => {
  if (!block.googleEventId) return;
  const res = await fetch(`${API_BASE}/${encodeURIComponent(block.googleEventId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(blockToEventBody(block)),
  });
  // 404/410: evento foi apagado direto no Google; não é um erro fatal
  if (!res.ok && res.status !== 404 && res.status !== 410) handleApiError(res.status);
};

export const deleteEventById = async (eventId: string, token: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) handleApiError(res.status);
};

const blockToEventBody = (block: TimeBlock) => {
  const [y, m, d] = block.date.split('-').map(Number);
  const [sh, sm] = block.start.split(':').map(Number);
  const [eh, em] = block.end.split(':').map(Number);
  return {
    summary: block.title,
    start: { dateTime: new Date(y, m - 1, d, sh, sm).toISOString() },
    end: { dateTime: new Date(y, m - 1, d, eh, em).toISOString() },
  };
};

// "Link mágico": URL do Google Agenda com o evento pré-preenchido — sem login
// nem configuração. Funciona para qualquer usuário (mão única, 1 clique).
export const googleCalendarUrl = (e: { title: string; date: string; start: string; end: string }): string => {
  const day = e.date.replace(/-/g, '');
  const dates = `${day}T${e.start.replace(':', '')}00/${day}T${e.end.replace(':', '')}00`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title || 'Bloco')}&dates=${dates}`;
};

// Link mágico para um prazo de tarefa: evento de DIA INTEIRO (fim exclusivo = dia seguinte)
export const googleAllDayUrl = (title: string, dateISO: string): string => {
  const start = dateISO.replace(/-/g, '');
  const next = parseISODate(dateISO);
  next.setDate(next.getDate() + 1);
  const end = toISODate(next).replace(/-/g, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title || 'Tarefa')}&dates=${start}/${end}`;
};
