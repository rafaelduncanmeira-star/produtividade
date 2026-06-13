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
    new Notification(title, { body, icon: './icon-192.png', badge: './icon-192.png', tag: title });
  } catch {
    /* alguns navegadores exigem ServiceWorkerRegistration.showNotification; falha silenciosa */
  }
};
