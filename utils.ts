import { Habit, FocusSession, RecurrenceFreq } from './types';

export const uid = () => Math.random().toString(36).substring(2, 11);

// --- Datas (sempre em horário local; nunca usar toISOString para dia) ---

export const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayISO = () => toISODate(new Date());

export const parseISODate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDaysISO = (iso: string, days: number): string => {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

/** Próxima data (ISO) de uma tarefa recorrente, a partir de `fromISO`. */
export const nextRecurrenceISO = (freq: RecurrenceFreq, fromISO: string): string => {
  switch (freq) {
    case 'daily': return addDaysISO(fromISO, 1);
    case 'weekly': return addDaysISO(fromISO, 7);
    case 'weekdays': {
      let d = addDaysISO(fromISO, 1);
      let wd = parseISODate(d).getDay();
      while (wd === 0 || wd === 6) { d = addDaysISO(d, 1); wd = parseISODate(d).getDay(); }
      return d;
    }
    case 'monthly': {
      const d = parseISODate(fromISO);
      d.setMonth(d.getMonth() + 1);
      return toISODate(d);
    }
  }
};

/** Dias (ISO) da semana Dom–Sáb que contém hoje, deslocada por `offset` semanas. */
export const getWeekDays = (offset = 0): string[] => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toISODate(d);
  });
};

export const formatShortDate = (iso: string): string => {
  const d = parseISODate(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Quick-add em linguagem natural (PT-BR): extrai data e hora do texto.
 * Ex.: "pagar conta sexta 9h" -> { title: 'pagar conta', dueDate, dueTime: '09:00' }
 */
export const parseQuickTask = (input: string): { title: string; dueDate?: string; dueTime?: string } => {
  let text = ` ${input} `;
  let dueDate: string | undefined;
  let dueTime: string | undefined;

  const pad = (n: number) => String(n).padStart(2, '0');
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const offsetISO = (days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return toISODate(d);
  };

  // ===== HORA =====
  const timeMatchers: { re: RegExp; hm: (m: RegExpMatchArray) => [number, number] }[] = [
    { re: /\bmeio[\s-]?dia\b/i, hm: () => [12, 0] },
    { re: /\bmeia[\s-]?noite\b/i, hm: () => [0, 0] },
    { re: /\b(?:[àa]s\s*)?(\d{1,2})[:h](\d{2})\b/i, hm: m => [+m[1], +m[2]] },
    { re: /\b(?:[àa]s\s*)?(\d{1,2})\s*h(?:oras?)?\b/i, hm: m => [+m[1], 0] },
    { re: /\b[àa]s\s*(\d{1,2})\b/i, hm: m => [+m[1], 0] },
  ];
  for (const { re, hm } of timeMatchers) {
    const m = text.match(re);
    if (m) {
      const [h, min] = hm(m);
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        dueTime = `${pad(h)}:${pad(min)}`;
        text = text.replace(m[0], ' ');
        break;
      }
    }
  }

  // ===== DATA =====
  const isNext = /\b(pr[oó]xim[ao]|que\s+vem)\b/i.test(text);
  const removeAndSet = (re: RegExp, days: number): boolean => {
    const m = text.match(re);
    if (!m) return false;
    dueDate = offsetISO(days);
    text = text.replace(m[0], ' ');
    return true;
  };

  const dmy = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);

  if (removeAndSet(/\bdepois\s+de\s+amanh[ãa]\b/i, 2)) { /* feito */ }
  else if (removeAndSet(/\bamanh[ãa]\b/i, 1)) { /* feito */ }
  else if (removeAndSet(/\bhoje\b/i, 0)) { /* feito */ }
  else if (removeAndSet(/\b(semana\s+que\s+vem|pr[oó]xima\s+semana)\b/i, 7)) { /* feito */ }
  else if (dmy) {
    const dd = +dmy[1];
    const mm = +dmy[2] - 1;
    let yy = dmy[3] ? +dmy[3] : base.getFullYear();
    if (yy < 100) yy += 2000;
    const d = new Date(yy, mm, dd);
    if (!isNaN(d.getTime()) && d.getMonth() === mm) {
      dueDate = toISODate(d);
      text = text.replace(dmy[0], ' ');
    }
  } else {
    const weekdays: [RegExp, number][] = [
      [/\bdomingo\b/i, 0],
      [/\bsegunda(?:-?\s*feira)?\b/i, 1],
      [/\bter[çc]a(?:-?\s*feira)?\b/i, 2],
      [/\bquarta(?:-?\s*feira)?\b/i, 3],
      [/\bquinta(?:-?\s*feira)?\b/i, 4],
      [/\bsexta(?:-?\s*feira)?\b/i, 5],
      [/\bs[áa]bado\b/i, 6],
    ];
    for (const [re, dow] of weekdays) {
      const m = text.match(re);
      if (!m) continue;
      let ahead = (dow - base.getDay() + 7) % 7;
      if (ahead === 0) ahead = isNext ? 7 : 0;
      dueDate = offsetISO(ahead);
      text = text.replace(m[0], ' ').replace(/\b(pr[oó]xim[ao]|que\s+vem)\b/i, ' ');
      break;
    }
  }

  // ===== Limpeza do título (remove conectores soltos no início/fim) =====
  let title = text.replace(/\s{2,}/g, ' ').trim();
  for (let i = 0; i < 4; i++) {
    const t2 = title
      .replace(/[\s,]+(?:[àa]s|no|na|de|da|do|em|para|pra|dia)$/i, '')
      .replace(/^(?:[àa]s|no|na|de|da|do|em|para|pra|dia)\s+/i, '')
      .trim();
    if (t2 === title) break;
    title = t2;
  }

  return { title: title || input.trim(), dueDate, dueTime };
};

export const formatLongDate = (d: Date = new Date()): string =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);

export const getGreeting = (d: Date = new Date()): string => {
  const h = d.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

// --- Tempo / timer ---

export const formatMinutes = (min: number): string => {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

export const formatTimerMs = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const focusMinutesOn = (sessions: FocusSession[], dateISO: string): number =>
  sessions.filter(s => s.date === dateISO).reduce((sum, s) => sum + s.minutes, 0);

// --- Hábitos ---

export const calcStreaks = (habit: Habit, today: string = todayISO()): { current: number; best: number } => {
  if (habit.targetDays.length === 0) return { current: 0, best: 0 };
  const done = new Set(habit.completions);

  // Sequência atual: anda para trás a partir de hoje. Dias fora do alvo são
  // pulados; o próprio dia de hoje ainda pendente não quebra a sequência.
  let current = 0;
  const back = parseISODate(today);
  for (let i = 0; i < 366; i++) {
    const iso = toISODate(back);
    if (habit.targetDays.includes(back.getDay())) {
      if (done.has(iso)) current++;
      else if (iso !== today) break;
    }
    back.setDate(back.getDate() - 1);
  }

  // Melhor sequência: percorre do primeiro registro (ou criação) até hoje.
  const createdDate = habit.createdAt.slice(0, 10);
  const earliest = habit.completions.length
    ? [...habit.completions].sort()[0]
    : createdDate;
  const startISO = earliest < createdDate ? earliest : createdDate;

  let best = current;
  let run = 0;
  const cursor = parseISODate(startISO);
  const end = parseISODate(today);
  for (let i = 0; cursor <= end && i < 1500; i++) {
    const iso = toISODate(cursor);
    if (habit.targetDays.includes(cursor.getDay())) {
      if (done.has(iso)) {
        run++;
        if (run > best) best = run;
      } else if (iso !== today) {
        run = 0;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { current, best };
};

/** Taxa de conclusão do hábito nos últimos `days` dias (0 a 1). */
export const habitCompletionRate = (habit: Habit, days = 30, today: string = todayISO()): number => {
  const done = new Set(habit.completions);
  const createdDate = habit.createdAt.slice(0, 10);
  let target = 0;
  let completed = 0;
  const cursor = parseISODate(addDaysISO(today, -(days - 1)));
  const end = parseISODate(today);
  while (cursor <= end) {
    const iso = toISODate(cursor);
    if (iso >= createdDate && habit.targetDays.includes(cursor.getDay())) {
      target++;
      if (done.has(iso)) completed++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return target === 0 ? 0 : completed / target;
};

// --- Som ---

export const playBeep = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  } catch {
    // Autoplay bloqueado ou AudioContext indisponível: falha silenciosa
  }
};
