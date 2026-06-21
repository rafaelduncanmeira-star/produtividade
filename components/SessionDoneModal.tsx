import React from 'react';
import { X, Check, ListChecks, Coffee } from 'lucide-react';
import { Task } from '../types';

interface SessionDoneModalProps {
  task: Task;
  minutes: number;
  onComplete: () => void;
  onMarkSubtask: () => void;
  onClose: () => void;
}

// Aparece ao terminar um pomodoro com tarefa vinculada: o +1 já foi registrado;
// aqui o usuário decide avançar (subtarefa), concluir a tarefa ou ir pra pausa.
export const SessionDoneModal: React.FC<SessionDoneModalProps> = ({ task, minutes, onComplete, onMarkSubtask, onClose }) => {
  const subs = task.subtasks ?? [];
  const nextSub = subs.find(s => !s.done);
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-rise"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-800 to-emerald-700 text-white flex items-center justify-center text-2xl">🍅</div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:text-slate-600 -mr-2 -mt-1"><X size={20} /></button>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mt-3 font-display">Foco concluído!</h2>
        <p className="text-sm text-slate-500 mt-1">
          +{minutes} min em <span className="font-semibold text-slate-700">{task.title}</span>
          {task.estimatedPomodoros > 0 && <> · {task.completedPomodoros}/{task.estimatedPomodoros} 🍅</>}
        </p>

        <div className="mt-4 space-y-2">
          {nextSub && (
            <button
              onClick={onMarkSubtask}
              className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 text-left transition active:scale-[0.99]"
            >
              <ListChecks size={18} className="text-teal-700 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-700">Marcar uma subtarefa</span>
                <span className="block text-xs text-slate-400 truncate">{nextSub.title}</span>
              </span>
            </button>
          )}
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-800 to-emerald-700 hover:brightness-110 active:scale-[0.98] transition shadow-md shadow-teal-200"
          >
            <Check size={18} /> Concluir tarefa
          </button>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-slate-500 font-medium hover:bg-slate-50 transition"
          >
            <Coffee size={16} /> Seguir para a pausa
          </button>
        </div>
      </div>
    </div>
  );
};
