import React from 'react';
import { X, Info, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 flex justify-between items-center bg-white sticky top-0 z-10 border-b border-slate-100">
          <h3 className="text-[17px] font-semibold text-slate-800 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-teal-800 text-white flex items-center justify-center shrink-0"><Info size={15} /></span>
            Matriz de Eisenhower
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <p className="text-[15px] text-slate-500 leading-relaxed">
            Uma técnica simples para priorizar: em cada tarefa, pergunte <strong className="text-slate-800 font-semibold">"é urgente?"</strong> e <strong className="text-slate-800 font-semibold">"é importante?"</strong>. O cruzamento das respostas coloca a tarefa em um dos 4 quadrantes — e cada um pede uma atitude diferente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUADRANTS.map(q => {
              const info = QUADRANT_INFO[q];
              return (
                <div key={q} className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
                    <h4 className="font-semibold text-slate-800 text-[15px]">{info.label}</h4>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{info.hint}</p>
                  <p className="text-[13px] text-slate-500 leading-relaxed">{TIPS[q]}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-start gap-2.5 bg-teal-50 rounded-xl p-4 text-[13px] text-teal-800 leading-relaxed">
            <Sparkles size={15} className="text-teal-600 shrink-0 mt-0.5" />
            <span><strong className="font-semibold">Dica:</strong> invista o máximo de tempo no quadrante <strong className="font-semibold">Agendar</strong> (importante, não urgente). É o que mantém as urgências sob controle.</span>
          </div>
          <p className="text-[13px] text-slate-400 leading-relaxed">
            No app, marque "urgente" e "importante" ao criar ou editar uma tarefa — ela aparece automaticamente no quadrante certo.
          </p>
        </div>
      </div>
    </div>
  );
};
