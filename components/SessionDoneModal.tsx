import React from 'react';
import { X, Check, ListChecks, Coffee, CircleCheck } from 'lucide-react';
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
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/40 md:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-rise"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <span className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <CircleCheck size={26} />
          </span>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <h2 className="text-[17px] font-semibold text-slate-800 mt-3">Foco concluído</h2>
        <p className="text-[15px] text-slate-500 mt-1 leading-relaxed">
          +{minutes} min em <span className="font-semibold text-slate-700">{task.title}</span>
          {task.estimatedPomodoros > 0 && <> · {task.completedPomodoros}/{task.estimatedPomodoros} focos</>}
        </p>

        <div className="mt-4 space-y-2">
          {nextSub && (
            <button
              onClick={onMarkSubtask}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 text-left transition active:scale-95"
            >
              <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0"><ListChecks size={15} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium text-slate-700">Marcar uma subtarefa</span>
                <span className="block text-[13px] text-slate-400 truncate">{nextSub.title}</span>
              </span>
            </button>
          )}
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-white bg-teal-800 active:scale-95 transition"
          >
            <Check size={18} /> Concluir tarefa
          </button>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition active:scale-95"
          >
            <Coffee size={16} /> Seguir para a pausa
          </button>
        </div>
      </div>
    </div>
  );
};
