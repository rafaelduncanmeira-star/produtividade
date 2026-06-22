import React, { useState } from 'react';
import { X, Save, Volume2, VolumeX, Timer } from 'lucide-react';
import { PomodoroSettings } from '../types';

interface PomodoroSettingsModalProps {
  settings: PomodoroSettings;
  onSave: (settings: PomodoroSettings) => void;
  onClose: () => void;
}

const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';
const fieldCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition';

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

  const numberInput = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        min="1"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={fieldCls}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur sticky top-0 z-10">
          <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center"><Timer size={16} strokeWidth={2.5} /></span>
            Configurações do Timer
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 gap-4">
            {numberInput('Foco (min)', focusMinutes, setFocusMinutes)}
            {numberInput('Pausa curta (min)', shortBreakMinutes, setShortBreakMinutes)}
            {numberInput('Pausa longa (min)', longBreakMinutes, setLongBreakMinutes)}
            {numberInput('Focos até pausa longa', sessionsUntilLongBreak, setSessionsUntilLongBreak)}
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
              soundEnabled ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white'
            }`}
          >
            {soundEnabled ? <Volume2 size={18} className="text-teal-500" /> : <VolumeX size={18} className="text-slate-300" />}
            <span className="flex-1 text-sm font-bold text-slate-700">Som ao concluir fase</span>
            <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${soundEnabled ? 'bg-teal-700' : 'bg-slate-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${soundEnabled ? 'translate-x-4' : ''}`} />
            </div>
          </button>

          <p className="text-[11px] text-slate-400">
            Mudanças de duração valem a partir da próxima fase; a fase em andamento não é alterada.
          </p>

          <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-teal-800 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-md shadow-teal-200">
            <Save size={18} /> Salvar
          </button>
        </form>
      </div>
    </div>
  );
};
