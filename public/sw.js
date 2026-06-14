/* Service Worker do GeriClass Foco — estratégia network-first para o shell do app.
   Sempre tenta a rede (atualização instantânea quando online) e cai no cache
   apenas como fallback offline. Não intercepta chamadas externas
   (Supabase, Google, Gemini, Tailwind CDN). */
const CACHE = 'tempo-ai-v9';
const SHELL = ['./', './index.html', './index.js'];

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
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
