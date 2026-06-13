import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import {
  AppSnapshot, loadSnapshot, saveSnapshot, legacyLocalSnapshot, cachedSnapshot, cacheSnapshot,
} from './services/cloudStore';
import { AuthView } from './components/AuthView';
import TempoApp from './TempoApp';

const SAVE_DEBOUNCE_MS = 1200;

const Splash: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">Tempo AI</h1>
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <LoaderCircle size={16} className="animate-spin" /> {message}
    </div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [initial, setInitial] = useState<AppSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') {
        const novaSenha = window.prompt('Digite sua nova senha (mínimo 6 caracteres):');
        if (novaSenha) supabase.auth.updateUser({ password: novaSenha });
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
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const cloud = await loadSnapshot(userId);
        if (cancelled) return;
        setInitial(cloud ?? cachedSnapshot(userId) ?? legacyLocalSnapshot());
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
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const current = sessionRef.current;
      if (current && latestRef.current) {
        saveSnapshot(current.user.id, latestRef.current).catch(() => { /* offline: cache local segura */ });
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const handleSignOut = useCallback(async () => {
    window.clearTimeout(saveTimerRef.current);
    const s = sessionRef.current;
    if (s && latestRef.current) {
      try { await saveSnapshot(s.user.id, latestRef.current); } catch { /* melhor esforço */ }
    }
    await supabase.auth.signOut();
    setInitial(null);
  }, []);

  if (!authReady) return <Splash message="Carregando..." />;
  if (!session) return <AuthView />;
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-slate-600 text-sm">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm"
        >
          Tentar de novo
        </button>
      </div>
    );
  }
  if (!initial) return <Splash message="Sincronizando seus dados..." />;

  return (
    <TempoApp
      key={session.user.id}
      userEmail={session.user.email ?? ''}
      initial={initial}
      onSnapshotChange={handleSnapshotChange}
      onSignOut={handleSignOut}
    />
  );
};

export default App;
