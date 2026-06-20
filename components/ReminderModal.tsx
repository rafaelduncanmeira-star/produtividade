import React, { useState, useEffect } from 'react';
import { X, BellRing, Clock, Send, Smartphone, LoaderCircle } from 'lucide-react';
import { useToast } from './Toast';
import { requestNotifPermission } from '../services/notifications';
import { pushSupported, enableDailyPush, disableDailyPush, sendTestPush, hasPushSubscription } from '../services/push';

interface ReminderModalProps {
  notifPerm: NotificationPermission | 'unsupported';
  onPermChange: (p: NotificationPermission | 'unsupported') => void;
  onClose: () => void;
}

const CACHE_KEY = 'tempo_reminder';
const HOURS = [6, 7, 8, 9, 12, 18, 20, 21];
const readCache = (): { enabled: boolean; hour: number } => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) { const c = JSON.parse(raw); return { enabled: !!c.enabled, hour: typeof c.hour === 'number' ? c.hour : 8 }; }
  } catch { /* ignore */ }
  return { enabled: false, hour: 8 };
};
const writeCache = (enabled: boolean, hour: number) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ enabled, hour })); } catch { /* ignore */ }
};

export const ReminderModal: React.FC<ReminderModalProps> = ({ notifPerm, onPermChange, onClose }) => {
  const { toast } = useToast();
  const cached = readCache();
  const [enabled, setEnabled] = useState(cached.enabled);
  const [hour, setHour] = useState(cached.hour);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();

  // Reconcilia o estado guardado com a inscrição real do aparelho.
  useEffect(() => {
    let alive = true;
    if (cached.enabled) {
      hasPushSubscription().then(has => { if (alive && !has) setEnabled(false); });
    }
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const label = (h: number) => `${String(h).padStart(2, '0')}:00`;

  const turnOn = async (h: number) => {
    setBusy(true);
    try {
      let perm = notifPerm;
      if (perm !== 'granted') {
        perm = await requestNotifPermission();
        onPermChange(perm);
      }
      if (perm !== 'granted') {
        toast('Permita as notificações para ativar o lembrete.');
        return false;
      }
      const ok = await enableDailyPush(h);
      if (!ok) { toast('Não foi possível ativar agora. Tente de novo.'); return false; }
      writeCache(true, h);
      toast(`🔔 Lembrete diário ativado às ${label(h)}`);
      return true;
    } catch {
      toast('Não foi possível ativar agora.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async () => {
    if (busy) return;
    if (!enabled) {
      const ok = await turnOn(hour);
      if (ok) setEnabled(true);
    } else {
      setBusy(true);
      try {
        await disableDailyPush();
        writeCache(false, hour);
        setEnabled(false);
        toast('Lembrete diário desativado.');
      } finally { setBusy(false); }
    }
  };

  const handleHour = async (h: number) => {
    setHour(h);
    if (enabled) {
      setBusy(true);
      try {
        const ok = await enableDailyPush(h);
        if (ok) { writeCache(true, h); toast(`Horário do lembrete: ${label(h)}`); }
      } finally { setBusy(false); }
    } else {
      writeCache(false, h);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const r = await sendTestPush();
      if (r.ok && r.sent > 0) toast('Enviado! A notificação deve chegar em instantes 🔔');
      else if (r.ok) toast('Ative o lembrete neste aparelho primeiro.');
      else toast('Não foi possível enviar o teste agora.');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-rise"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-800 to-emerald-700 text-white flex items-center justify-center shrink-0">
              <BellRing size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display">Lembretes</h2>
              <p className="text-xs text-slate-400">Um aviso diário com as tarefas do dia</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:text-slate-600 -mr-2 -mt-1"><X size={20} /></button>
        </div>

        {!supported || notifPerm === 'unsupported' ? (
          <p className="mt-4 text-sm text-slate-500 bg-slate-50 rounded-xl p-4">
            Este navegador não suporta lembretes push. No iPhone, abra pelo Safari e adicione o app à tela de início.
          </p>
        ) : notifPerm === 'denied' ? (
          <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-4">
            As notificações estão bloqueadas. Ative-as para este site nas configurações do navegador e tente de novo.
          </p>
        ) : (
          <>
            {/* Liga/desliga */}
            <button
              onClick={handleToggle}
              disabled={busy}
              className="mt-5 w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 disabled:opacity-60 transition"
            >
              <span className="flex-1 text-left">
                <span className="block text-sm font-bold text-slate-700">Lembrete diário no celular</span>
                <span className="block text-xs text-slate-400">Chega mesmo com o app fechado</span>
              </span>
              {busy ? (
                <LoaderCircle size={20} className="animate-spin text-slate-300" />
              ) : (
                <span className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${enabled ? 'bg-teal-700' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                </span>
              )}
            </button>

            {/* Horário */}
            <div className={`mt-4 transition-opacity ${enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                <Clock size={13} /> Horário do lembrete
              </div>
              <div className="grid grid-cols-4 gap-2">
                {HOURS.map(h => (
                  <button
                    key={h}
                    onClick={() => handleHour(h)}
                    disabled={busy}
                    className={`py-2.5 rounded-xl text-sm font-semibold tabular-nums transition ${
                      hour === h ? 'bg-teal-700 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label(h)}
                  </button>
                ))}
              </div>
            </div>

            {/* Teste */}
            {enabled && (
              <button
                onClick={handleTest}
                disabled={busy}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 disabled:opacity-60 transition active:scale-[0.98]"
              >
                <Send size={16} /> Enviar um teste agora
              </button>
            )}

            <p className="mt-4 flex items-start gap-2 text-[11px] text-slate-400">
              <Smartphone size={14} className="shrink-0 mt-0.5" />
              No iPhone, instale o app primeiro (Compartilhar → “Adicionar à Tela de Início”) para receber os lembretes.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
