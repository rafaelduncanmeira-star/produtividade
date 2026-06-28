import { useEffect, useState } from 'react';
import { useToast } from './Toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);

const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

// Centraliza o comportamento de PWA: status online, convite de instalação e aviso de nova versão.
export function usePwa() {
  const { toast } = useToast();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => ((window as unknown as { __bipEvent?: BeforeInstallPromptEvent }).__bipEvent ?? null)
  );
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem('tempo_install_dismissed'); } catch { return false; }
  });

  // Online / offline
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Convite de instalação (Android/desktop): guarda o evento para disparar depois
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // Nova versão disponível -> toast "Atualizar"
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    let notified = false;
    const promptUpdate = () => {
      if (notified) return;
      notified = true;
      toast('Nova versão disponível', {
        action: { label: 'Atualizar', onClick: () => window.location.reload() },
        duration: 8000,
      });
    };

    navigator.serviceWorker.ready.then(r => {
      if (r.waiting && hadController) promptUpdate();          // já há uma versão esperando
      r.addEventListener('updatefound', () => {
        const nw = r.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) promptUpdate();
        });
      });
      r.update().catch(() => {});
    }).catch(() => {});

    // Um novo SW assumiu o controle após o carregamento => nova versão ativa
    const onCtrl = () => { if (hadController) promptUpdate(); };
    navigator.serviceWorker.addEventListener('controllerchange', onCtrl);

    // Procura atualização ao voltar para o app
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then(r => r?.update()).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onCtrl);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [toast]);

  const canInstall = !!deferred;
  const promptInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null);
  };
  const dismissInstall = () => {
    setDismissed(true);
    try { localStorage.setItem('tempo_install_dismissed', '1'); } catch { /* ignore */ }
  };

  const showInstall = !isStandalone() && !dismissed && (canInstall || isIOS());

  return { online, showInstall, canInstall, promptInstall, dismissInstall };
}
