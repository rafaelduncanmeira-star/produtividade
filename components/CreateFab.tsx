import React, { useState } from 'react';
import { Plus, CheckSquare, Repeat, CalendarClock, Sparkles, Target } from 'lucide-react';

interface CreateFabProps {
  onTask: () => void;
  onHabit: () => void;
  onBlock: () => void;
  onProject: () => void;
  onAI: () => void;
}

// Bolinha flutuante (mobile) no canto inferior direito: menu rápido de criação + IA.
export const CreateFab: React.FC<CreateFabProps> = ({ onTask, onHabit, onBlock, onProject, onAI }) => {
  const [open, setOpen] = useState(false);

  const actions = [
    { label: 'Assistente IA', icon: <Sparkles size={18} />, run: onAI },
    { label: 'Tarefa', icon: <CheckSquare size={18} />, run: onTask },
    { label: 'Hábito', icon: <Repeat size={18} />, run: onHabit },
    { label: 'Meta', icon: <Target size={18} />, run: onProject },
    { label: 'Bloco de agenda', icon: <CalendarClock size={18} />, run: onBlock },
  ];

  return (
    <div className="md:hidden">
      {open && <div className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />}

      <div className="create-fab fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 w-56 divide-y divide-slate-100 animate-[fab-in_0.18s_ease_both]">
            {actions.map(a => (
              <button
                key={a.label}
                onClick={() => { a.run(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center shrink-0">
                  {a.icon}
                </span>
                <span className="text-[15px] font-medium text-slate-800">{a.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Fechar menu' : 'Criar ou usar a IA'}
          aria-expanded={open}
          className={`w-14 h-14 rounded-full bg-teal-800 text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform ${open ? 'rotate-45' : ''}`}
        >
          <Plus size={26} />
        </button>
      </div>
    </div>
  );
};
