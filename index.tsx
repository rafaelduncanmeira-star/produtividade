import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Garante a marca de iOS mesmo que o index.html esteja em cache (CSS "Liquid Glass")
try {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua) || ((navigator as unknown as { platform?: string }).platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    document.documentElement.classList.add('ios');
  }
} catch { /* ignore */ }

// PWA: captura cedo o convite de instalação (pode disparar antes do React montar)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as unknown as { __bipEvent?: Event }).__bipEvent = e;
});

// PWA: registra o Service Worker (instalável + carregamento offline do shell)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
