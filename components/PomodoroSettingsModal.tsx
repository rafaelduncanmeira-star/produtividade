import React, { useState } from 'react';
import { X, Volume2, VolumeX, Timer, Minus, Plus } from 'lucide-react';
import { PomodoroSettings } from '../types';

interface PomodoroSettingsModalProps {
  settings: PomodoroSettings;
  onSave: (settings: PomodoroSettings) => void;
  onClose: () => void;
}

export const PomodoroSettingsModal: React.FC<PomodoroSettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [focusMinutes, setFocusMinutes] = useState(String(settings.focusMinutes));
  const [shortBreakMinutes, setShortBreakMinutes] = useState(String(settings.shortBreakMinutes));
  const [longBreakMinutes, setLongBreakMinutes] = useState(String(settings.longBreakMinutes));
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(String(settings.sessionsUntilLongBreak));
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);

  const clamp = (val: string, min: number, max: number, fallback: number) => {
    const n = parseInt(val);
    if (isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      focusMinutes: clamp(focusMinutes, 1, 120, 25),
      shortBreakMinutes: clamp(shortBreakMinutes, 1, 60, 5),
      longBreakMinutes: clamp(longBreakMinutes, 1, 90, 15),
      sessionsUntilLongBreak: clamp(sessionsUntilLongBreak, 2, 10, 4),
      soundEnabled,
    });
  };

  // Stepper iOS: botões redondos + número grande. Mantém o valor como string (clamp só no salvar).
  const stepper = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    min: number,
    max: number,
    suffix: string,
  ) => {
    const cur = parseInt(value);
    const safe = isNaN(cur) ? min : cur;
    const step = (delta: number) => setValue(String(Math.min(max, Math.max(min, safe + delta))));
    return (
      <div className="flex items-center justify-between gap-3 py-3.5">
        <span className="text-[15px] text-slate-700">{label}</span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={safe <= min}
            aria-label={`Diminuir ${label}`}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center disabled:opacity-40 active:scale-90 transition"
          >
            <Minus size={16} />
          </button>
          <span className="min-w-[3.5rem] text-center text-[17px] font-semibold text-slate-800 tabular-nums">
            {safe}<span className="text-[13px] font-normal text-slate-400 ml-0.5">{suffix}</span>
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={safe >= max}
            aria-label={`Aumentar ${label}`}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center disabled:opacity-40 active:scale-90 transition"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex justify-between items-center bg-white sticky top-0 z-10 border-b border-slate-100">
          <h3 className="text-[17px] font-semibold text-slate-800 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-teal-800 text-white flex items-center justify-center shrink-0"><Timer size={15} /></span>
            Timer
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="divide-y divide-slate-100">
            {stepper('Foco', focusMinutes, setFocusMinutes, 1, 120, 'min')}
            {stepper('Pausa curta', shortBreakMinutes, setShortBreakMinutes, 1, 60, 'min')}
            {stepper('Pausa longa', longBreakMinutes, setLongBreakMinutes, 1, 90, 'min')}
            {stepper('Focos até pausa longa', sessionsUntilLongBreak, setSessionsUntilLongBreak, 2, 10, '')}
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 text-left"
          >
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${soundEnabled ? 'bg-teal-800 text-white' : 'bg-slate-200 text-slate-400'}`}>
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </span>
            <span className="flex-1 text-[15px] font-medium text-slate-700">Som ao concluir fase</span>
            <span className={`w-12 h-7 rounded-full p-0.5 transition-colors shrink-0 ${soundEnabled ? 'bg-teal-800' : 'bg-slate-200'}`}>
              <span className={`block w-6 h-6 bg-white rounded-full shadow transition-transform ${soundEnabled ? 'translate-x-5' : ''}`} />
            </span>
          </button>

          <p className="text-[13px] text-slate-400 leading-relaxed">
            Mudanças de duração valem a partir da próxima fase; a fase em andamento não é alterada.
          </p>

          <button type="submit" className="w-full py-2.5 rounded-xl font-semibold text-white bg-teal-800 active:scale-95 transition">
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
};
