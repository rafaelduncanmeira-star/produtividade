import React, { useState, useEffect } from 'react';
import { X, BellRing, Send, Smartphone, LoaderCircle, Sun, Moon } from 'lucide-react';
import { useToast } from './Toast';
import { requestNotifPermission } from '../services/notifications';
import { pushSupported, saveReminderPrefs, sendTestPush, hasPushSubscription, type ReminderPrefs } from '../services/push';

interface ReminderModalProps {
  notifPerm: NotificationPermission | 'unsupported';
  onPermChange: (p: NotificationPermission | 'unsupported') => void;
  onClose: () => void;
}

const CACHE_KEY = 'tempo_reminder';
const MORNING_HOURS = [6, 7, 8, 9, 12];
const EVENING_HOURS = [18, 19, 20, 21, 22];
const DEFAULTS: ReminderPrefs = { morningEnabled: false, morningHour: 8, eveningEnabled: false, eveningHour: 21 };

const readCache = (): ReminderPrefs => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      return {
        morningEnabled: !!c.morningEnabled,
        // tolera o formato antigo { enabled, hour }
        morningHour: typeof c.morningHour === 'number' ? c.morningHour : (typeof c.hour === 'number' ? c.hour : 8),
        eveningEnabled: !!c.eveningEnabled,
        eveningHour: typeof c.eveningHour === 'number' ? c.eveningHour : 21,
      };
    }
  } catch { /* ignore */ }
  return DEFAULTS;
};
const writeCache = (p: ReminderPrefs) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
};
const lbl = (h: number) => `${String(h).padStart(2, '0')}:00`;

const Section: React.FC<{
  icon: React.ReactNode; title: string; subtitle: string; accent: string;
  enabled: boolean; hour: number; hours: number[]; busy: boolean;
  onToggle: () => void; onHour: (h: number) => void;
}> = ({ icon, title, subtitle, accent, enabled, hour, hours, busy, onToggle, onHour }) => (
  <div className="rounded-2xl border border-slate-100 p-4">
    <button onClick={onToggle} disabled={busy} className="w-full flex items-center gap-3 disabled:opacity-60">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}1a`, color: accent }}>{icon}</span>
      <span className="flex-1 text-left">
        <span className="block text-sm font-bold text-slate-700">{title}</span>
        <span className="block text-xs text-slate-400">{subtitle}</span>
      </span>
      <span className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${enabled ? 'bg-teal-700' : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </span>
    </button>
    <div className={`mt-3 grid grid-cols-5 gap-2 transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
      {hours.map(h => (
        <button
          key={h}
          onClick={() => onHour(h)}
          disabled={busy}
          className={`py-2 rounded-lg text-xs font-semibold tabular-nums transition ${hour === h ? 'bg-teal-700 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
        >
          {lbl(h)}
        </button>
      ))}
    </div>
  </div>
);

export const ReminderModal: React.FC<ReminderModalProps> = ({ notifPerm, onPermChange, onClose }) => {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<ReminderPrefs>(readCache);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();

  // Reconcilia o estado guardado com a inscrição real do aparelho.
  useEffect(() => {
    let alive = true;
    if (prefs.morningEnabled || prefs.eveningEnabled) {
      hasPushSubscription().then(has => {
        if (alive && !has) setPrefs(p => ({ ...p, morningEnabled: false, eveningEnabled: false }));
      });
    }
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = async (next: ReminderPrefs, msg?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const turningOn = (next.morningEnabled && !prefs.morningEnabled) || (next.eveningEnabled && !prefs.eveningEnabled);
      if ((next.morningEnabled || next.eveningEnabled) && notifPerm !== 'granted') {
        const perm = await requestNotifPermission();
        onPermChange(perm);
        if (perm !== 'granted') { toast('Permita as notificações para ativar.'); return; }
      }
      const ok = await saveReminderPrefs(next);
      if (!ok) { toast('Não foi possível salvar agora. Tente de novo.'); return; }
      setPrefs(next);
      writeCache(next);
      if (msg) toast(msg);
      else if (turningOn) toast('🔔 Lembrete ativado');
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await sendTestPush();
      if (r.ok && r.sent > 0) toast('Enviado! A notificação deve chegar em instantes 🔔');
      else if (r.ok) toast('Ative um lembrete neste aparelho primeiro.');
      else toast('Não foi possível enviar o teste agora.');
    } finally { setBusy(false); }
  };

  const anyOn = prefs.morningEnabled || prefs.eveningEnabled;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-rise max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-800 to-emerald-700 text-white flex items-center justify-center shrink-0">
              <BellRing size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Lembretes</h2>
              <p className="text-xs text-slate-400">Avisos diários no seu celular</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:text-slate-600 -mr-2 -mt-1"><X size={20} /></button>
        </div>

        {!supported || notifPerm === 'unsupported' ? (
          <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4">
            Este navegador não suporta lembretes push. No iPhone, abra pelo Safari e adicione o app à tela de início.
          </p>
        ) : notifPerm === 'denied' ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-4">
            As notificações estão bloqueadas. Ative-as para este site nas configurações do navegador e tente de novo.
          </p>
        ) : (
          <div className="space-y-3">
            <Section
              icon={<Sun size={18} />}
              title="Lembrete da manhã"
              subtitle="As tarefas do dia"
              accent="#0f766e"
              enabled={prefs.morningEnabled}
              hour={prefs.morningHour}
              hours={MORNING_HOURS}
              busy={busy}
              onToggle={() => commit(
                { ...prefs, morningEnabled: !prefs.morningEnabled },
                prefs.morningEnabled ? 'Lembrete da manhã desligado' : `🔔 Manhã às ${lbl(prefs.morningHour)}`,
              )}
              onHour={(h) => commit({ ...prefs, morningHour: h }, `Manhã: ${lbl(h)}`)}
            />
            <Section
              icon={<Moon size={18} />}
              title="Lembrete da noite"
              subtitle="Como foi seu dia?"
              accent="#7c3aed"
              enabled={prefs.eveningEnabled}
              hour={prefs.eveningHour}
              hours={EVENING_HOURS}
              busy={busy}
              onToggle={() => commit(
                { ...prefs, eveningEnabled: !prefs.eveningEnabled },
                prefs.eveningEnabled ? 'Lembrete da noite desligado' : `🌙 Noite às ${lbl(prefs.eveningHour)}`,
              )}
              onHour={(h) => commit({ ...prefs, eveningHour: h }, `Noite: ${lbl(h)}`)}
            />

            {anyOn && (
              <button
                onClick={handleTest}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 disabled:opacity-60 transition active:scale-[0.98]"
              >
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />} Enviar um teste agora
              </button>
            )}

            <p className="flex items-start gap-2 text-[11px] text-slate-400 pt-1">
              <Smartphone size={14} className="shrink-0 mt-0.5" />
              No iPhone, instale o app primeiro (Compartilhar → “Adicionar à Tela de Início”) para receber os lembretes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
