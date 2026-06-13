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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={18} className="text-[#4285F4]" /> Google Agenda
          </h3>
          <button onClick={onClose} className="p-1"><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {connected ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <CircleCheck size={20} className="text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-700">Conectado!</p>
                <p className="text-xs text-emerald-600">Seus blocos vão para o Google e seus eventos aparecem aqui.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Conecte sua conta Google <strong>uma vez</strong>: seus eventos passam a aparecer no Planejamento e na tela Hoje, e você envia blocos para a sua agenda direto daqui.
            </p>
          )}

          {/* Conexão */}
          <button
            onClick={handleConnect}
            disabled={busy}
            className="w-full py-3 bg-[#4285F4] text-white rounded-xl font-bold hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Link2 size={18} />}
            {connected ? 'Reconectar' : 'Conectar com Google'}
          </button>

          {connected && (
            <button
              onClick={onDisconnect}
              className="w-full py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-medium hover:border-rose-300 hover:text-rose-600 flex items-center justify-center gap-2"
            >
              <Unlink size={18} /> Desconectar
            </button>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-600">
              {error}
            </div>
          )}

          {appConfigured ? (
            !connected && (
              <p className="text-[11px] text-slate-400">
                Se o Google mostrar um aviso de "app não verificado", toque em <strong>Avançado → Continuar</strong> para prosseguir.
              </p>
            )
          ) : (
            // Modo manual (avançado): app sem Client ID global
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  ID do cliente (OAuth) · avançado
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="xxxxxxxx.apps.googleusercontent.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                />
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-600 mb-2">Ainda não tem a chave?</p>
                <ol className="text-[11px] text-slate-500 space-y-1 list-decimal list-inside">
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
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                >
                  Abrir o painel do Google <ExternalLink size={12} />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
