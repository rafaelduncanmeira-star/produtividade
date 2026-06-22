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
    { label: 'Assistente IA', style: { backgroundImage: 'linear-gradient(135deg, #0f766e, #047857)' }, icon: <Sparkles size={20} />, run: onAI },
    { label: 'Tarefa', style: { backgroundColor: '#0f766e' }, icon: <CheckSquare size={20} />, run: onTask },
    { label: 'Hábito', style: { backgroundColor: '#10b981' }, icon: <Repeat size={20} />, run: onHabit },
    { label: 'Meta', style: { backgroundColor: '#0ea5e9' }, icon: <Target size={20} />, run: onProject },
    { label: 'Bloco de agenda', style: { backgroundColor: '#f59e0b' }, icon: <CalendarClock size={20} />, run: onBlock },
  ];

  return (
    <div className="md:hidden">
      {open && <div className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />}

      <div className="create-fab fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
        {open && actions.map((a, i) => (
          <button
            key={a.label}
            onClick={() => { a.run(); setOpen(false); }}
            className="flex items-center gap-2.5 animate-[fab-in_0.18s_ease_both]"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            <span className="px-2.5 py-1 rounded-lg bg-white shadow-md text-sm font-medium text-slate-700">{a.label}</span>
            <span className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white" style={a.style}>
              {a.icon}
            </span>
          </button>
        ))}

        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Fechar menu' : 'Criar ou usar a IA'}
          aria-expanded={open}
          className={`w-14 h-14 rounded-full bg-teal-800 text-white shadow-lg shadow-teal-300 flex items-center justify-center active:scale-90 transition-transform ${open ? 'rotate-45' : 'animate-float'}`}
        >
          <Plus size={26} />
        </button>
      </div>
    </div>
  );
};
