import React, { useState, useMemo, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, CalendarPlus, CircleCheck, Calendar } from 'lucide-react';
import { Task, TimeBlock, GoogleEvent, GOOGLE_EVENT_COLOR, PLANNER_START_HOUR, PLANNER_END_HOUR, PLANNER_HOUR_HEIGHT } from '../types';
import { todayISO, addDaysISO, parseISODate, timeToMinutes, formatLongDate } from '../utils';
import { TimeBlockForm } from './TimeBlockForm';

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

const HOURS = Array.from(
  { length: PLANNER_END_HOUR - PLANNER_START_HOUR },
  (_, i) => PLANNER_START_HOUR + i
);
const GRID_START_MIN = PLANNER_START_HOUR * 60;
const PX_PER_MIN = PLANNER_HOUR_HEIGHT / 60;

export const PlannerView: React.FC<PlannerViewProps> = ({
  blocks, tasks, googleActive, googleEvents, onLoadGoogleEvents, onSendBlockToGoogle, onOpenGoogleSettings,
  onAddBlock, onUpdateBlock, onDeleteBlock,
}) => {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [prefillStart, setPrefillStart] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const isToday = selectedDate === todayISO();

  // Linha do "agora": atualiza a cada minuto
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);

  const dayBlocks = useMemo(
    () => blocks
      .filter(b => b.date === selectedDate)
      .sort((a, b) => a.start.localeCompare(b.start)),
    [blocks, selectedDate]
  );

  // Eventos do Google do dia selecionado (ignora os que já são espelho de um bloco enviado)
  useEffect(() => {
    if (googleActive) onLoadGoogleEvents(selectedDate);
  }, [googleActive, selectedDate, onLoadGoogleEvents, googleEvents]);

  const dayGoogleEvents = useMemo(() => {
    const list = googleEvents[selectedDate] ?? [];
    const syncedIds = new Set(blocks.map(b => b.googleEventId).filter(Boolean));
    return list.filter(ev => !syncedIds.has(ev.id));
  }, [googleEvents, selectedDate, blocks]);

  const timedGoogleEvents = dayGoogleEvents.filter(ev => !ev.allDay);
  const allDayGoogleEvents = dayGoogleEvents.filter(ev => ev.allDay);

  const taskById = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && nowMinutes >= GRID_START_MIN && nowMinutes <= PLANNER_END_HOUR * 60;

  const openCreate = (hour?: number) => {
    setEditingBlock(null);
    setPrefillStart(hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : null);
    setIsFormOpen(true);
  };

  const handleSave = (data: Omit<TimeBlock, 'id'>, id?: string) => {
    if (id) onUpdateBlock({ ...data, id });
    else onAddBlock(data);
    setIsFormOpen(false);
    setEditingBlock(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Planejamento</h2>
          <p className="text-slate-500 text-sm">Organize seu dia em blocos de tempo.</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md shadow-indigo-200 active:scale-95"
        >
          <Plus size={18} />
          <span>Novo Bloco</span>
        </button>
      </div>

      {/* Navegação de dia */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-3 py-2">
        <button onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <button
            onClick={() => setSelectedDate(todayISO())}
            className={`text-sm font-medium capitalize ${isToday ? 'text-slate-700' : 'text-indigo-600 hover:underline'}`}
          >
            {isToday ? 'Hoje' : formatLongDate(parseISODate(selectedDate))}
          </button>
          {isToday && <p className="text-[10px] text-slate-400 capitalize">{formatLongDate(parseISODate(selectedDate))}</p>}
        </div>
        <button onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Eventos de dia inteiro do Google */}
      {allDayGoogleEvents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allDayGoogleEvents.map(ev => (
            <span
              key={ev.id}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border"
              style={{ borderColor: `${GOOGLE_EVENT_COLOR}55`, color: GOOGLE_EVENT_COLOR, backgroundColor: `${GOOGLE_EVENT_COLOR}10` }}
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

      {/* Grade do dia */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 md:p-4 overflow-hidden">
        <div className="relative" style={{ height: HOURS.length * PLANNER_HOUR_HEIGHT }}>
          {/* Linhas de hora (clicáveis para criar bloco) */}
          {HOURS.map((hour, i) => (
            <div
              key={hour}
              onClick={() => openCreate(hour)}
              className="absolute inset-x-0 border-t border-slate-100 flex cursor-pointer hover:bg-indigo-50/40 transition-colors"
              style={{ top: i * PLANNER_HOUR_HEIGHT, height: PLANNER_HOUR_HEIGHT }}
            >
              <span className="w-12 shrink-0 text-[10px] text-slate-400 font-medium pt-1 pl-1 select-none">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
          ))}

          {/* Eventos do Google (somente leitura) */}
          {timedGoogleEvents.map(ev => {
            const startMin = Math.max(timeToMinutes(ev.start), GRID_START_MIN);
            const endMin = Math.min(timeToMinutes(ev.end || ev.start), PLANNER_END_HOUR * 60);
            const height = Math.max((endMin - startMin) * PX_PER_MIN, 24);
            return (
              <div
                key={ev.id}
                className="absolute left-14 right-1 md:right-2 rounded-lg px-3 py-1.5 border border-dashed overflow-hidden pointer-events-none"
                style={{
                  top: (startMin - GRID_START_MIN) * PX_PER_MIN,
                  height,
                  borderColor: `${GOOGLE_EVENT_COLOR}88`,
                  backgroundColor: `${GOOGLE_EVENT_COLOR}0d`,
                }}
              >
                <p className="text-xs font-bold truncate flex items-center gap-1" style={{ color: GOOGLE_EVENT_COLOR }}>
                  <Calendar size={11} className="shrink-0" /> {ev.title}
                </p>
                <p className="text-[10px] text-slate-500">{ev.start} – {ev.end} · Google Agenda</p>
              </div>
            );
          })}

          {/* Blocos */}
          {dayBlocks.map(block => {
            const startMin = Math.max(timeToMinutes(block.start), GRID_START_MIN);
            const endMin = Math.min(timeToMinutes(block.end), PLANNER_END_HOUR * 60);
            const height = Math.max((endMin - startMin) * PX_PER_MIN, 24);
            const linkedTask = block.taskId ? taskById.get(block.taskId) : undefined;
            return (
              <div
                key={block.id}
                onClick={() => { setEditingBlock(block); setIsFormOpen(true); }}
                className="group absolute left-14 right-1 md:right-2 rounded-lg px-3 py-1.5 cursor-pointer border-l-4 overflow-hidden hover:brightness-95 transition-all"
                style={{
                  top: (startMin - GRID_START_MIN) * PX_PER_MIN,
                  height,
                  backgroundColor: `${block.color}26`,
                  borderLeftColor: block.color,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: block.color }}>{block.title}</p>
                    <p className="text-[10px] text-slate-500">
                      {block.start} – {block.end}
                      {linkedTask && <span className="ml-1.5 opacity-70">· {linkedTask.title}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {googleActive && (
                      block.googleEventId ? (
                        <span title="Já está no Google Agenda" className="p-1" style={{ color: GOOGLE_EVENT_COLOR }}>
                          <CircleCheck size={13} />
                        </span>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); onSendBlockToGoogle(block); }}
                          title="Enviar para o Google Agenda"
                          aria-label="Enviar para o Google Agenda"
                          className="p-1 text-slate-400 transition-colors hover:text-[#4285F4]"
                        >
                          <CalendarPlus size={13} />
                        </button>
                      )
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteBlock(block.id); }}
                      aria-label="Excluir bloco"
                      className="p-1 text-slate-400 hover:text-rose-600 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Linha do horário atual */}
          {showNowLine && (
            <div
              className="absolute inset-x-0 z-10 flex items-center pointer-events-none"
              style={{ top: (nowMinutes - GRID_START_MIN) * PX_PER_MIN }}
            >
              <div className="w-2 h-2 rounded-full bg-rose-500 ml-11" />
              <div className="flex-1 h-px bg-rose-500" />
            </div>
          )}
        </div>
      </div>

      {dayBlocks.length === 0 && (
        <p className="text-center text-sm text-slate-400 -mt-2">
          Toque em um horário na grade para criar um bloco.
        </p>
      )}

      {/* FAB (mobile) */}
      <button
        onClick={() => openCreate()}
        aria-label="Novo bloco"
        className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus size={26} />
      </button>

      {isFormOpen && (
        <TimeBlockForm
          initialBlock={editingBlock}
          defaultDate={selectedDate}
          defaultStart={prefillStart ?? undefined}
          tasks={tasks}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditingBlock(null); }}
        />
      )}
    </div>
  );
};
