import React from 'react';
import { X, Info } from 'lucide-react';
import { QUADRANTS, QUADRANT_INFO, Quadrant } from '../types';

const TIPS: Record<Quadrant, string> = {
  q1: 'Crises e prazos que já chegaram. Faça você mesmo, o quanto antes.',
  q2: 'Planejar, estudar, saúde, relações. Reserve horários — é aqui que mora o crescimento e o que evita as coisas virarem urgência.',
  q3: 'Interrupções e pedidos que urgem mas pouco contribuem. Delegue ou resolva rápido.',
  q4: 'Distrações e desperdícios de tempo. Reduza ou elimine.',
};

interface EisenhowerInfoProps {
  onClose: () => void;
}

export const EisenhowerInfo: React.FC<EisenhowerInfoProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Info size={18} className="text-teal-700" /> Matriz de Eisenhower</h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <p className="text-sm text-slate-600">
            Uma técnica simples para priorizar: em cada tarefa, pergunte <strong className="text-slate-800">"é urgente?"</strong> e <strong className="text-slate-800">"é importante?"</strong>. O cruzamento das respostas coloca a tarefa em um dos 4 quadrantes — e cada um pede uma atitude diferente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUADRANTS.map(q => {
              const info = QUADRANT_INFO[q];
              return (
                <div key={q} className={`rounded-xl border-2 p-3 ${info.cellClass}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
                    <h4 className="font-bold text-slate-800 text-sm">{info.label}</h4>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{info.hint}</p>
                  <p className="text-xs text-slate-600">{TIPS[q]}</p>
                </div>
              );
            })}
          </div>
          <div className="bg-teal-50 rounded-xl p-3 text-sm text-teal-800">
            💡 <strong>Dica:</strong> invista o máximo de tempo no quadrante <strong>Agendar</strong> (importante, não urgente). É o que mantém as urgências sob controle.
          </div>
          <p className="text-xs text-slate-400">
            No app, marque "urgente" e "importante" ao criar ou editar uma tarefa — ela aparece automaticamente no quadrante certo.
          </p>
        </div>
      </div>
    </div>
  );
};
