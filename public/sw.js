/* Service Worker do Foco GeriClass — estratégia network-first para o shell do app.
   Sempre tenta a rede (atualização instantânea quando online) e cai no cache
   apenas como fallback offline. Não intercepta chamadas externas
   (Supabase, Google, Gemini, Tailwind CDN). */
const CACHE = 'tempo-ai-v49';
const SHELL = ['./', './index.html', './index.js'];

// --- Push (lembretes diários que chegam mesmo com o app fechado) ---
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = {}; }
  const title = payload.title || 'Foco GeriClass';
  const options = {
    body: payload.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: payload.tag || 'foco-lembrete',
    renotify: true,
    data: { url: payload.url || './' },
  };
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    // Atualiza o selo do ícone mesmo com o app fechado (onde houver suporte).
    if (typeof payload.count === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
      try {
        if (payload.count > 0) await self.navigator.setAppBadge(payload.count);
        else await self.navigator.clearAppBadge();
      } catch (e) { /* ignore */ }
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) { try { await client.focus(); return; } catch (e) { /* ignore */ } }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Só cuida de recursos do próprio app (mesma origem). Deixa APIs externas passarem direto.
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Só cacheia respostas OK (evita gravar 404/500 e travar o app offline)
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
