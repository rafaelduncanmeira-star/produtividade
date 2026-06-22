import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import {
  AppSnapshot, loadSnapshot, saveSnapshot, fetchSnapshotVersion, legacyLocalSnapshot, cachedSnapshot, cacheSnapshot,
} from './services/cloudStore';
import { disconnectGoogle } from './services/googleCalendar';
import { updateBadge } from './services/notifications';
import { AuthView } from './components/AuthView';
import { ToastProvider } from './components/Toast';
import TempoApp from './TempoApp';

const SAVE_DEBOUNCE_MS = 1200;

// Chaves globais (não vinculadas ao usuário) limpas no logout, p/ privacidade em aparelho compartilhado
const GLOBAL_KEYS = [
  'tempo_tasks', 'tempo_sessions', 'tempo_habits', 'tempo_blocks', 'tempo_projects',
  'tempo_pomodoro_settings', 'tempo_google_settings', 'tempo_timer_state',
  'tempo_onboarded', 'tempo_install_dismissed',
];

const Splash: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
    <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="Foco GeriClass" className="w-16 h-16 rounded-2xl shadow-lg shadow-teal-900/20" />
    <h1 className="text-2xl font-bold font-display text-teal-800">Foco GeriClass</h1>
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <LoaderCircle size={16} className="animate-spin" /> {message}
    </div>
  </div>
);

// Esqueleto da tela inicial enquanto sincroniza (mais "vivo" que um spinner)
const SkeletonHome: React.FC = () => (
  <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
    <div className="flex items-center gap-2.5 pt-2 mb-6">
      <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
      <div className="h-5 w-36 rounded bg-slate-200 animate-pulse" />
    </div>
    <div className="h-8 w-44 rounded-lg bg-slate-200 animate-pulse mb-4" />
    <div className="flex gap-4 mb-6">
      {[0, 1, 2].map(i => <div key={i} className="h-4 w-20 rounded bg-slate-200 animate-pulse" />)}
    </div>
    <div className="space-y-3">
      {[0, 1, 2, 3].map(i => <div key={i} className="h-[68px] rounded-2xl bg-white border border-slate-100 shadow-sm animate-pulse" />)}
    </div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [initial, setInitial] = useState<AppSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const sessionRef = useRef<Session | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const serverVersionRef = useRef<string | null>(null); // updated_at conhecido da nuvem
  const skipSaveRef = useRef(false);                     // pula o save imediato após recarregar da nuvem

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') {
        const novaSenha = window.prompt('Digite sua nova senha (mínimo 6 caracteres):');
        if (novaSenha && novaSenha.length >= 6) {
          supabase.auth.updateUser({ password: novaSenha })
            .then(({ error }) => window.alert(error ? 'Não foi possível alterar a senha.' : 'Senha alterada com sucesso!'));
        } else if (novaSenha !== null) {
          window.alert('A senha precisa ter pelo menos 6 caracteres.');
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Carrega os dados do usuário ao entrar: nuvem > cache local > dados antigos (pré-login)
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) {
      setInitial(null);
      setLoadError(null);
      serverVersionRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const cloud = await loadSnapshot(userId);
        if (cancelled) return;
        if (cloud) {
          // Há registro na nuvem (mesmo que vazio): é a fonte da verdade — não usa dados legados/globais
          serverVersionRef.current = cloud.updatedAt;
          setInitial(cloud.data);
        } else {
          // Usuário novo (sem registro): usa o cache deste usuário ou migra do localStorage antigo
          serverVersionRef.current = null;
          setInitial(cachedSnapshot(userId) ?? legacyLocalSnapshot());
        }
      } catch (e) {
        if (cancelled) return;
        const cached = cachedSnapshot(userId);
        if (cached) setInitial(cached);
        else setLoadError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Salva na nuvem com debounce + cache local imediato
  const saveTimerRef = useRef<number | undefined>(undefined);
  const latestRef = useRef<AppSnapshot | null>(null);
  const handleSnapshotChange = useCallback((snap: AppSnapshot) => {
    const s = sessionRef.current;
    if (!s) return;
    latestRef.current = snap;
    cacheSnapshot(s.user.id, snap);
    if (skipSaveRef.current) { skipSaveRef.current = false; return; } // acabou de vir da nuvem: não re-salva
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const current = sessionRef.current;
      if (current && latestRef.current) {
        saveSnapshot(current.user.id, latestRef.current)
          .then(ts => { serverVersionRef.current = ts; })
          .catch(() => { /* offline: cache local segura */ });
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // Recarrega o estado da nuvem (descartando edições pendentes do estado antigo) e remonta o app
  const reloadFromCloud = useCallback(async () => {
    const uid = sessionRef.current?.user.id;
    if (!uid) return;
    try {
      const cloud = await loadSnapshot(uid);
      if (!cloud) return;
      window.clearTimeout(saveTimerRef.current);
      latestRef.current = null;
      serverVersionRef.current = cloud.updatedAt;
      skipSaveRef.current = true;
      setInitial(cloud.data);
      setReloadKey(k => k + 1);
    } catch { /* mantém estado atual */ }
  }, []);

  // Multi-aparelho: ao reabrir o app, se outro dispositivo salvou depois, recarrega (evita sobrescrever)
  useEffect(() => {
    if (!userId) return;
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      const v = await fetchSnapshotVersion(userId).catch(() => null);
      if (v && serverVersionRef.current && v > serverVersionRef.current) reloadFromCloud();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId, reloadFromCloud]);

  const handleSignOut = useCallback(async () => {
    window.clearTimeout(saveTimerRef.current);
    const s = sessionRef.current;
    if (s && latestRef.current) {
      try { await saveSnapshot(s.user.id, latestRef.current); } catch { /* melhor esforço */ }
    }
    // Privacidade em aparelho compartilhado: revoga o Google e limpa resíduos globais do localStorage
    try { disconnectGoogle(); } catch { /* ignore */ }
    try { updateBadge(0); } catch { /* ignore */ }
    GLOBAL_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
    await supabase.auth.signOut();
    setInitial(null);
    serverVersionRef.current = null;
  }, []);

  if (!authReady) return <Splash message="Carregando..." />;
  if (!session) return <AuthView />;
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-slate-600 text-sm">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-teal-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm"
        >
          Tentar de novo
        </button>
      </div>
    );
  }
  if (!initial) return <SkeletonHome />;

  return (
    <ToastProvider>
      <TempoApp
        key={`${session.user.id}:${reloadKey}`}
        userEmail={session.user.email ?? ''}
        initial={initial}
        onSnapshotChange={handleSnapshotChange}
        onSignOut={handleSignOut}
      />
    </ToastProvider>
  );
};

export default App;
