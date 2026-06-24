import React from 'react';
import { CalendarClock, X } from 'lucide-react';

interface QuickWhenProps {
  title: string;
  onPick: (when: 'today' | 'tomorrow' | 'none') => void;
  onCancel: () => void;
}

/**
 * Mini-seletor "Quando?" mostrado logo após a captura rápida quando o texto
 * não traz uma data. Mantém a barrinha veloz, mas sem criar a tarefa "às cegas".
 */
export const QuickWhen: React.FC<QuickWhenProps> = ({ title, onPick, onCancel }) => (
  <div
    className="mt-2 rounded-xl border border-teal-100 bg-teal-50/60 p-3 animate-rise"
    role="group"
    aria-label="Quando fazer esta tarefa?"
  >
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <p className="text-sm text-slate-600 min-w-0 flex items-center gap-1.5">
        <CalendarClock size={15} className="shrink-0 text-teal-600" />
        <span className="shrink-0 font-medium">Quando?</span>
        <span className="font-semibold text-slate-800 truncate">{title}</span>
      </p>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancelar"
        className="shrink-0 -m-1 p-1 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        autoFocus
        onClick={() => onPick('today')}
        className="text-sm font-semibold px-3.5 py-2 rounded-lg bg-teal-800 text-white hover:bg-teal-900 active:scale-95 transition"
      >
        Hoje
      </button>
      <button
        type="button"
        onClick={() => onPick('tomorrow')}
        className="text-sm font-medium px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition"
      >
        Amanhã
      </button>
      <button
        type="button"
        onClick={() => onPick('none')}
        className="text-sm font-medium px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition"
      >
        Sem data
      </button>
    </div>
  </div>
);
