// Notificações do navegador (funcionam com o app aberto, inclusive em aba ao fundo).
// Notificação com o app totalmente fechado exigiria Web Push (servidor + VAPID).

export const notifSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export const notifPermission = (): NotificationPermission | 'unsupported' =>
  notifSupported() ? Notification.permission : 'unsupported';

export const requestNotifPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!notifSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

export const sendNotification = (title: string, body?: string): void => {
  if (!notifSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: './icon-192.png', badge: './icon-192.png', tag: `${title}|${body ?? ''}` });
  } catch {
    /* alguns navegadores exigem ServiceWorkerRegistration.showNotification; falha silenciosa */
  }
};

// --- Selo no ícone do app (Badging API) ---
// Mostra um número sobre o ícone do app instalado (igual WhatsApp/Mail).
// Funciona no Android (Chrome) e iOS 16.4+ com o app na tela de início.
// Só atualiza com o app aberto; o push (servidor) cuida do app fechado.
type BadgeNav = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export const badgeSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'setAppBadge' in navigator;

export const updateBadge = (count: number): void => {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as BadgeNav;
  if (!nav.setAppBadge) return;
  try {
    const p = count > 0
      ? nav.setAppBadge(count)
      : (nav.clearAppBadge ? nav.clearAppBadge() : nav.setAppBadge(0));
    p?.catch?.(() => { /* permissão/indisponível: ignora */ });
  } catch {
    /* ignore */
  }
};
