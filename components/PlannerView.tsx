import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, CalendarPlus, CircleCheck, Calendar, Columns3, CalendarDays, CalendarRange, type LucideIcon } from 'lucide-react';
import { Task, TimeBlock, GoogleEvent, GOOGLE_EVENT_COLOR, PLANNER_START_HOUR, PLANNER_END_HOUR, PLANNER_HOUR_HEIGHT, WEEKDAY_SHORT } from '../types';
import { todayISO, addDaysISO, parseISODate, toISODate, timeToMinutes, formatLongDate, formatShortDate } from '../utils';
import { TimeBlockForm } from './TimeBlockForm';
import { googleCalendarUrl } from '../services/googleCalendar';

type ViewMode = 'day' | '3days' | 'week' | 'month';

interface PlannerViewProps {
  blocks: TimeBlock[];
  tasks: Task[];
  googleActive: boolean;
  googleEvents: Record<string, GoogleEvent[]>;
  onLoadGoogleEvents: (dateISO: string) => void;
  onSendBlockToGoogle: (block: TimeBlock) => void;
  onOpenGoogleSettings: () => void;
  onAddBlock: (data: Omit<TimeBlock, 'id'>) => void;
  onUpdateBlock: (block: TimeBlock) => void;
  onDeleteBlock: (id: string) => void;
}

const HOURS = Array.from({ length: PLANNER_END_HOUR - PLANNER_START_HOUR }, (_, i) => PLANNER_START_HOUR + i);
const GRID_START_MIN = PLANNER_START_HOUR * 60;
const PX_PER_MIN = PLANNER_HOUR_HEIGHT / 60;
const GRID_HEIGHT = HOURS.length * PLANNER_HOUR_HEIGHT;

const addMonthsISO = (iso: string, months: number): string => {
  const d = parseISODate(iso);
  d.setMonth(d.getMonth() + months);
  return toISODate(d);
};

const weekStartISO = (iso: string): string => {
  const d = parseISODate(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // volta para a segunda-feira daquela semana
  return toISODate(d);
};

// ---------- Coluna de um dia (timeline) ----------
interface DayColumnProps {
  date: string;
  blocks: TimeBlock[];
  googleEvents: GoogleEvent[];   // eventos com horário, já filtrados, deste dia
  now: Date;
  googleActive: boolean;
  taskById: Map<string, Task>;
  dense?: boolean;
  onCreateAt: (date: string, hour: number) => void;
  onBlockPointerDown: (e: React.PointerEvent, b: TimeBlock) => void;
  onSendBlockToGoogle: (b: TimeBlock) => void;
  onDeleteBlock: (id: string) => void;
  colRef?: (el: HTMLDivElement | null) => void;
  draggingId?: string | null;
}

const DayColumn: React.FC<DayColumnProps> = ({
  date, blocks, googleEvents, now, googleActive, taskById, dense,
  onCreateAt, onBlockPointerDown, onSendBlockToGoogle, onDeleteBlock, colRef, draggingId,
}) => {
  const isToday = date === todayISO();
  const dayBlocks = useMemo(
    () => blocks.filter(b => b.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [blocks, date]
  );
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && nowMinutes >= GRID_START_MIN && nowMinutes <= PLANNER_END_HOUR * 60;

  return (
    <div ref={colRef} className="relative flex-1 min-w-0 border-l border-slate-100 first:border-l-0" style={{ height: GRID_HEIGHT }}>
      {HOURS.map((hour, i) => (
        <div
          key={hour}
          onClick={() => onCreateAt(date, hour)}
          className="absolute inset-x-0 border-t border-slate-100 cursor-pointer hover:bg-teal-50/40 transition-colors"
          style={{ top: i * PLANNER_HOUR_HEIGHT, height: PLANNER_HOUR_HEIGHT }}
        />
      ))}

      {googleEvents.map(ev => {
        const startMin = Math.max(timeToMinutes(ev.start), GRID_START_MIN);
        const endMin = Math.min(timeToMinutes(ev.end || ev.start), PLANNER_END_HOUR * 60);
        const height = Math.max((endMin - startMin) * PX_PER_MIN, 22);
        const evColor = ev.color ?? GOOGLE_EVENT_COLOR;
        return (
          <div
            key={ev.id}
            className="absolute left-1 right-1 rounded-lg px-2 py-1 border border-dashed overflow-hidden pointer-events-none"
            style={{ top: (startMin - GRID_START_MIN) * PX_PER_MIN, height, borderColor: `${evColor}88`, backgroundColor: `${evColor}0d` }}
          >
            <p className="text-[11px] font-bold truncate flex items-center gap-1" style={{ color: evColor }}>
              <Calendar size={10} className="shrink-0" /> {ev.title}
            </p>
            {!dense && <p className="text-[10px] text-slate-500">{ev.start} – {ev.end}</p>}
          </div>
        );
      })}

      {dayBlocks.map(block => {
        const startMin = Math.max(timeToMinutes(block.start), GRID_START_MIN);
        const endMin = Math.min(timeToMinutes(block.end), PLANNER_END_HOUR * 60);
        const height = Math.max((endMin - startMin) * PX_PER_MIN, 22);
        const linkedTask = block.taskId ? taskById.get(block.taskId) : undefined;
        return (
          <div
            key={block.id}
            onPointerDown={e => onBlockPointerDown(e, block)}
            className={`group absolute left-1 right-1 rounded-lg px-2 py-1 cursor-grab active:cursor-grabbing touch-none border-l-4 overflow-hidden hover:brightness-95 transition-all ${block.id === draggingId ? 'opacity-80 ring-2 ring-teal-400 z-20 shadow-lg' : ''}`}
            style={{ top: (startMin - GRID_START_MIN) * PX_PER_MIN, height, backgroundColor: `${block.color}26`, borderLeftColor: block.color }}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[11px] font-bold truncate" style={{ color: block.color }}>{block.title}</p>
                {!dense && (
                  <p className="text-[10px] text-slate-500">
                    {block.start} – {block.end}
                    {linkedTask && <span className="ml-1 opacity-70">· {linkedTask.title}</span>}
                  </p>
                )}
              </div>
              {!dense && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {googleActive ? (block.googleEventId ? (
                    <span title="Já está no Google Agenda" className="p-1" style={{ color: GOOGLE_EVENT_COLOR }}><CircleCheck size={13} /></span>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); onSendBlockToGoogle(block); }}
                      title="Enviar para o Google Agenda" aria-label="Enviar para o Google Agenda"
                      className="p-1 text-slate-400 hover:text-[#4285F4]"
                    ><CalendarPlus size={13} /></button>
                  )) : (
                    <a
                      href={googleCalendarUrl(block)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      title="Adicionar ao Google Agenda" aria-label="Adicionar ao Google Agenda"
                      className="p-1 text-slate-400 hover:text-[#4285F4]"
                    ><CalendarPlus size={13} /></a>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteBlock(block.id); }}
                    aria-label="Excluir bloco"
                    className="p-1 text-slate-400 hover:text-rose-600 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  ><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {showNowLine && (
        <div className="absolute inset-x-0 z-10 flex items-center pointer-events-none" style={{ top: (nowMinutes - GRID_START_MIN) * PX_PER_MIN }}>
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 -ml-0.5" />
          <div className="flex-1 h-px bg-rose-500" />
        </div>
      )}
    </div>
  );
};

// ---------- Grade do mês ----------
interface MonthGridProps {
  anchor: string;
  blocks: TimeBlock[];
  onPickDay: (date: string) => void;
}

const MonthGrid: React.FC<MonthGridProps> = ({ anchor, blocks, onPickDay }) => {
  const a = parseISODate(anchor);
  const month = a.getMonth();
  const first = new Date(a.getFullYear(), month, 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const weeks = cells.slice(35).some(d => d.getMonth() === month) ? 6 : 5;
  const shown = cells.slice(0, weeks * 7);

  const byDate = useMemo(() => {
    const m = new Map<string, TimeBlock[]>();
    for (const b of blocks) { const arr = m.get(b.date); if (arr) arr.push(b); else m.set(b.date, [b]); }
    for (const arr of m.values()) arr.sort((x, y) => x.start.localeCompare(y.start));
    return m;
  }, [blocks]);
  const today = todayISO();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 md:p-3">
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_SHORT.map(w => (
          <div key={w} className="text-center text-[10px] font-semibold text-slate-400 py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {shown.map(d => {
          const iso = toISODate(d);
          const inMonth = d.getMonth() === month;
          const isToday = iso === today;
          const dayBlocks = byDate.get(iso) ?? [];
          return (
            <button
              key={iso}
              onClick={() => onPickDay(iso)}
              className={`min-h-[68px] md:min-h-[92px] rounded-lg border p-1 text-left flex flex-col gap-0.5 transition-colors ${inMonth ? 'bg-white border-slate-100 hover:border-teal-300' : 'bg-slate-50/60 border-transparent'}`}
            >
              <span className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-teal-800 text-white' : inMonth ? 'text-slate-600' : 'text-slate-300'}`}>
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayBlocks.slice(0, 3).map(b => (
                  <span key={b.id} className="text-[9px] leading-tight truncate rounded px-1 py-0.5 font-medium" style={{ backgroundColor: `${b.color}22`, color: b.color }}>
                    {b.title}
                  </span>
                ))}
                {dayBlocks.length > 3 && <span className="text-[9px] text-slate-400 pl-1">+{dayBlocks.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ---------- Agenda da semana em lista (mobile) ----------
interface WeekAgendaProps {
  days: string[];
  blocks: TimeBlock[];
  tasks: Task[];
  eventsForDay: (date: string) => GoogleEvent[];
  onCreate: (date: string) => void;
  onEditBlock: (b: TimeBlock) => void;
}

const WeekAgenda: React.FC<WeekAgendaProps> = ({ days, blocks, tasks, eventsForDay, onCreate, onEditBlock }) => {
  const today = todayISO();
  type Item = { key: string; start: string; title: string; color: string; kind: 'block' | 'task' | 'event'; block?: TimeBlock };
  return (
    <div className="space-y-2.5">
      {days.map(d => {
        const dt = parseISODate(d);
        const isToday = d === today;
        const items: Item[] = [
          ...blocks.filter(b => b.date === d).map(b => ({ key: `b-${b.id}`, start: b.start, title: b.title, color: b.color, kind: 'block' as const, block: b })),
          ...tasks.filter(t => !t.completed && t.dueTime && t.dueDate === d).map(t => ({ key: `t-${t.id}`, start: t.dueTime!, title: t.title, color: '#0f766e', kind: 'task' as const })),
          ...eventsForDay(d).filter(ev => !ev.allDay).map(ev => ({ key: `g-${ev.id}`, start: ev.start, title: ev.title, color: ev.color ?? GOOGLE_EVENT_COLOR, kind: 'event' as const })),
        ].sort((a, b) => a.start.localeCompare(b.start));
        return (
          <div key={d} className={`bg-white rounded-2xl border p-3 ${isToday ? 'border-teal-200' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold capitalize ${isToday ? 'text-teal-700' : 'text-slate-700'}`}>
                  {WEEKDAY_SHORT[dt.getDay()]}, {dt.getDate()}/{String(dt.getMonth() + 1).padStart(2, '0')}
                </span>
                {isToday && <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">hoje</span>}
              </div>
              <button onClick={() => onCreate(d)} aria-label="Adicionar bloco" className="p-1 text-slate-300 hover:text-teal-700"><Plus size={16} /></button>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400">Nada agendado</p>
            ) : (
              <div className="space-y-1.5">
                {items.map(it => (
                  <button
                    key={it.key}
                    onClick={it.block ? () => onEditBlock(it.block!) : undefined}
                    className={`w-full flex items-center gap-2.5 text-left ${it.block ? '' : 'cursor-default'}`}
                  >
                    <span className="text-[11px] tabular-nums text-slate-400 w-10 shrink-0">{it.start}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: it.color }} />
                    <span className="text-sm text-slate-700 truncate flex-1">{it.title}</span>
                    {it.kind === 'task' && <CircleCheck size={13} className="text-slate-300 shrink-0" />}
                    {it.kind === 'event' && <Calendar size={12} className="text-slate-300 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---------- Componente principal ----------
export const PlannerView: React.FC<PlannerViewProps> = ({
  blocks, tasks, googleActive, googleEvents, onLoadGoogleEvents, onSendBlockToGoogle, onOpenGoogleSettings,
  onAddBlock, onUpdateBlock, onDeleteBlock,
}) => {
  // No desktop abre na semana (7 dias); no celular começa no Dia (sem 7 colunas)
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? 'week' : 'day'
  );
  const [anchor, setAnchor] = useState(todayISO());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [createDate, setCreateDate] = useState(todayISO());
  const [prefillStart, setPrefillStart] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [blockDrag, setBlockDrag] = useState<{ blockId: string; dur: number; overDate: string; startMin: number } | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);

  const visibleDays = useMemo(() => {
    if (viewMode === 'day') return [anchor];
    if (viewMode === '3days') return [0, 1, 2].map(i => addDaysISO(anchor, i));
    if (viewMode === 'week') { const s = weekStartISO(anchor); return [0, 1, 2, 3, 4, 5, 6].map(i => addDaysISO(s, i)); }
    return [];
  }, [viewMode, anchor]);

  // Carrega eventos do Google dos dias visíveis (dia / 3 dias)
  useEffect(() => {
    if (!googleActive || viewMode === 'month') return;
    visibleDays.forEach(d => onLoadGoogleEvents(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleActive, viewMode, anchor]);

  const taskById = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
  const syncedIds = useMemo(() => new Set(blocks.map(b => b.googleEventId).filter(Boolean)), [blocks]);
  const eventsForDay = (date: string) => (googleEvents[date] ?? []).filter(ev => !syncedIds.has(ev.id));

  const step = (dir: -1 | 1) => {
    if (viewMode === 'day') setAnchor(addDaysISO(anchor, dir));
    else if (viewMode === '3days') setAnchor(addDaysISO(anchor, dir * 3));
    else if (viewMode === 'week') setAnchor(addDaysISO(anchor, dir * 7));
    else setAnchor(addMonthsISO(anchor, dir));
  };

  const navLabel = () => {
    if (viewMode === 'day') return anchor === todayISO() ? 'Hoje' : formatLongDate(parseISODate(anchor));
    if (viewMode === '3days') return `${formatShortDate(anchor)} – ${formatShortDate(addDaysISO(anchor, 2))}`;
    if (viewMode === 'week') { const s = weekStartISO(anchor); return `${formatShortDate(s)} – ${formatShortDate(addDaysISO(s, 6))}`; }
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(parseISODate(anchor));
  };

  const openCreate = (date: string, hour?: number) => {
    setEditingBlock(null);
    setCreateDate(date);
    setPrefillStart(hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : null);
    setIsFormOpen(true);
  };

  const handleSave = (data: Omit<TimeBlock, 'id'>, id?: string) => {
    if (id) onUpdateBlock({ ...data, id }); else onAddBlock(data);
    setIsFormOpen(false);
    setEditingBlock(null);
  };

  const minToHHmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const openBlockEdit = (b: TimeBlock) => { setEditingBlock(b); setIsFormOpen(true); };

  const dateAt = (x: number): string | null => {
    for (const d of visibleDays) {
      const el = colRefs.current[d];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right) return d;
    }
    return null;
  };

  // Arrastar um bloco para remarcar: eixo Y muda o horário (snap 15min); colunas mudam o dia
  const startBlockDrag = (e: React.PointerEvent, block: TimeBlock) => {
    if ((e.target as HTMLElement).closest('button, a')) return;  // botões internos do bloco
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const dur = timeToMinutes(block.end) - timeToMinutes(block.start);
    const col0 = colRefs.current[block.date];
    const grabMin = col0 ? (startY - col0.getBoundingClientRect().top) / PX_PER_MIN + GRID_START_MIN : timeToMinutes(block.start);
    const offset = grabMin - timeToMinutes(block.start);
    let moved = false;

    const compute = (x: number, y: number) => {
      const overDate = dateAt(x) ?? block.date;
      const c = colRefs.current[overDate] ?? col0;
      const top = c ? c.getBoundingClientRect().top : 0;
      let startMin = (y - top) / PX_PER_MIN + GRID_START_MIN - offset;
      startMin = Math.round(startMin / 15) * 15;
      startMin = Math.max(GRID_START_MIN, Math.min(startMin, PLANNER_END_HOUR * 60 - dur));
      return { overDate, startMin };
    };

    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) < 5 && Math.abs(ev.clientY - startY) < 5) return;
      moved = true;
      const { overDate, startMin } = compute(ev.clientX, ev.clientY);
      setBlockDrag({ blockId: block.id, dur, overDate, startMin });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) { openBlockEdit(block); return; }
      const { overDate, startMin } = compute(ev.clientX, ev.clientY);
      setBlockDrag(null);
      const start = minToHHmm(startMin);
      if (overDate !== block.date || start !== block.start) {
        onUpdateBlock({ ...block, date: overDate, start, end: minToHHmm(startMin + dur) });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const previewBlocks = useMemo(() => {
    if (!blockDrag) return blocks;
    const start = minToHHmm(blockDrag.startMin);
    const end = minToHHmm(blockDrag.startMin + blockDrag.dur);
    return blocks.map(b => (b.id === blockDrag.blockId ? { ...b, date: blockDrag.overDate, start, end } : b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, blockDrag]);

  const allDayEvents = viewMode === 'month' ? [] : visibleDays.flatMap(d => eventsForDay(d).filter(ev => ev.allDay));

  const modes: { id: ViewMode; label: string; Icon: LucideIcon; desktopOnly?: boolean }[] = [
    { id: 'day', label: 'Dia', Icon: Calendar },
    { id: '3days', label: '3 dias', Icon: Columns3 },
    { id: 'week', label: 'Semana', Icon: CalendarRange },
    { id: 'month', label: 'Mês', Icon: CalendarDays },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-display">Planejamento</h2>
          <p className="text-slate-500 text-sm">Organize seu tempo em blocos.</p>
        </div>
        <button
          onClick={() => openCreate(viewMode === 'month' ? todayISO() : anchor)}
          className="hidden md:flex items-center gap-2 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md shadow-teal-200 active:scale-95"
        >
          <Plus size={18} /><span>Novo Bloco</span>
        </button>
      </div>

      {/* Alternância de visão */}
      <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
        {modes.map(({ id, label, Icon, desktopOnly }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={`${desktopOnly ? 'hidden md:flex' : 'flex'} items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === id ? 'bg-white shadow-sm text-teal-800' : 'text-slate-500'}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-3 py-2">
        <button onClick={() => step(-1)} aria-label="Anterior" className="p-2 text-slate-400 hover:text-teal-700 rounded-lg"><ChevronLeft size={18} /></button>
        <button onClick={() => setAnchor(todayISO())} className="text-sm font-medium capitalize text-slate-700 hover:text-teal-700">{navLabel()}</button>
        <button onClick={() => step(1)} aria-label="Próximo" className="p-2 text-slate-400 hover:text-teal-700 rounded-lg"><ChevronRight size={18} /></button>
      </div>

      {/* Eventos de dia inteiro do Google */}
      {allDayEvents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allDayEvents.map(ev => (
            <span
              key={ev.id}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border"
              style={{ borderColor: `${ev.color ?? GOOGLE_EVENT_COLOR}55`, color: ev.color ?? GOOGLE_EVENT_COLOR, backgroundColor: `${ev.color ?? GOOGLE_EVENT_COLOR}10` }}
            >
              <Calendar size={12} /> {ev.title} · dia inteiro
            </span>
          ))}
        </div>
      )}

      {!googleActive && (
        <button
          onClick={onOpenGoogleSettings}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-[#4285F4] bg-white border border-dashed border-slate-200 rounded-xl py-2.5 transition-colors"
        >
          <Calendar size={14} /> Conectar Google Agenda para ver seus eventos aqui
        </button>
      )}

      {/* Conteúdo */}
      {viewMode === 'month' ? (
        <MonthGrid anchor={anchor} blocks={blocks} onPickDay={(d) => { setAnchor(d); setViewMode('day'); }} />
      ) : (
      <>
        {viewMode === 'week' && (
          <div className="md:hidden">
            <WeekAgenda
              days={visibleDays}
              blocks={previewBlocks}
              tasks={tasks}
              eventsForDay={eventsForDay}
              onCreate={(d) => openCreate(d)}
              onEditBlock={openBlockEdit}
            />
          </div>
        )}
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-2 md:p-3 overflow-hidden ${viewMode === 'week' ? 'hidden md:block' : ''}`}>
          {(viewMode === '3days' || viewMode === 'week') && (
            <div className="flex">
              <div className="w-10 md:w-12 shrink-0" />
              {visibleDays.map(d => {
                const dt = parseISODate(d);
                const isToday = d === todayISO();
                return (
                  <div key={d} className="flex-1 min-w-0 text-center py-1.5 border-l border-slate-100 first:border-l-0">
                    <p className={`text-[11px] font-semibold capitalize ${isToday ? 'text-teal-700' : 'text-slate-500'}`}>
                      {WEEKDAY_SHORT[dt.getDay()]} {dt.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex">
            {/* Régua de horas */}
            <div className="w-10 md:w-12 shrink-0 relative" style={{ height: GRID_HEIGHT }}>
              {HOURS.map((hour, i) => (
                <span
                  key={hour}
                  className="absolute left-1 text-[10px] text-slate-400 font-medium select-none"
                  style={{ top: i * PLANNER_HOUR_HEIGHT + 2 }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
              ))}
            </div>
            {/* Colunas dos dias */}
            {visibleDays.map(d => (
              <DayColumn
                key={d}
                date={d}
                blocks={previewBlocks}
                googleEvents={eventsForDay(d).filter(ev => !ev.allDay)}
                now={now}
                googleActive={googleActive}
                taskById={taskById}
                dense={viewMode === '3days' || viewMode === 'week'}
                colRef={(el) => { colRefs.current[d] = el; }}
                draggingId={blockDrag?.blockId ?? null}
                onCreateAt={openCreate}
                onBlockPointerDown={startBlockDrag}
                onSendBlockToGoogle={onSendBlockToGoogle}
                onDeleteBlock={onDeleteBlock}
              />
            ))}
          </div>
        </div>
      </>
      )}

      {viewMode !== 'month' && (
        <p className={`text-center text-sm text-slate-400 -mt-2 ${viewMode === 'week' ? 'hidden md:block' : ''}`}>Toque num horário para criar · arraste um bloco para remarcar.</p>
      )}

      {isFormOpen && (
        <TimeBlockForm
          initialBlock={editingBlock}
          defaultDate={createDate}
          defaultStart={prefillStart ?? undefined}
          tasks={tasks}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditingBlock(null); }}
        />
      )}
    </div>
  );
};
