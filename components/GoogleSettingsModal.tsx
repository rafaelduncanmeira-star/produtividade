import React, { useState } from 'react';
import { X, Calendar, Link2, Unlink, LoaderCircle, CircleCheck, ExternalLink } from 'lucide-react';
import { GoogleSettings } from '../types';

interface GoogleSettingsModalProps {
  settings: GoogleSettings;
  connected: boolean;
  appConfigured: boolean;            // true = app tem um Client ID global (conexão de 1 toque)
  onConnect: (clientId?: string) => Promise<void>;
  onDisconnect: () => void;
  onClose: () => void;
}

export const GoogleSettingsModal: React.FC<GoogleSettingsModalProps> = ({
  settings, connected, appConfigured, onConnect, onDisconnect, onClose,
}) => {
  const [clientId, setClientId] = useState(settings.clientId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!appConfigured && !clientId.trim()) {
      setError('Cole o ID do cliente para conectar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConnect(appConfigured ? undefined : clientId.trim());
    } catch (e) {
      setError((e as Error).message || 'Não foi possível conectar ao Google.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex justify-between items-center bg-white sticky top-0 z-10 border-b border-slate-100">
          <h3 className="text-[17px] font-semibold text-slate-800 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0"><Calendar size={15} className="text-[#4285F4]" /></span>
            Google Agenda
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {connected ? (
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
              <CircleCheck size={20} className="text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-emerald-700">Conectado</p>
                <p className="text-[13px] text-emerald-600">Seus blocos vão para o Google e seus eventos aparecem aqui.</p>
              </div>
            </div>
          ) : (
            <p className="text-[15px] text-slate-500 leading-relaxed">
              Conecte sua conta Google <strong className="text-slate-700 font-semibold">uma vez</strong>: seus eventos passam a aparecer na Agenda e na tela Hoje, e você envia blocos para a sua agenda direto daqui.
            </p>
          )}

          {/* Conexão */}
          <button
            onClick={handleConnect}
            disabled={busy}
            className="w-full py-2.5 bg-teal-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Link2 size={18} />}
            {connected ? 'Reconectar' : 'Conectar com Google'}
          </button>

          {connected && (
            <button
              onClick={onDisconnect}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:text-rose-600 flex items-center justify-center gap-2 transition"
            >
              <Unlink size={18} /> Desconectar
            </button>
          )}

          {error && (
            <div className="bg-rose-50 rounded-xl px-4 py-3 text-[13px] text-rose-600">
              {error}
            </div>
          )}

          {appConfigured ? (
            !connected && (
              <p className="text-[13px] text-slate-400 leading-relaxed">
                Se o Google mostrar um aviso de "app não verificado", toque em <strong className="text-slate-500 font-semibold">Avançado → Continuar</strong> para prosseguir.
              </p>
            )
          ) : (
            // Modo manual (avançado): app sem Client ID global
            <>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">
                  ID do cliente (OAuth) · avançado
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="xxxxxxxx.apps.googleusercontent.com"
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-teal-300 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">Ainda não tem a chave?</p>
                <ol className="text-[13px] text-slate-500 space-y-1 list-decimal list-inside">
                  <li>Crie um projeto no Google Cloud Console</li>
                  <li>Ative a API do Google Calendar</li>
                  <li>Crie um "ID do cliente OAuth" do tipo Aplicativo da Web</li>
                  <li>Adicione este site nas origens JavaScript autorizadas</li>
                  <li>Copie o ID e cole acima</li>
                </ol>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-teal-700 hover:underline"
                >
                  Abrir o painel do Google <ExternalLink size={13} />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
