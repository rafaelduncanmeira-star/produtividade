// Feedback tátil e visual: deixa as ações (concluir, bater meta) gostosas de usar.

// Vibração curta no celular — silenciosamente ignorada onde não há suporte.
export const haptic = (pattern: number | number[] = 12) => {
  try { navigator.vibrate?.(pattern); } catch { /* sem suporte */ }
};

// Celebração elegante de "tudo concluído": um emblema com check que brota no
// centro (mola + check desenhando), anéis que se expandem e um brilho radial
// que dissolve. Sem dependências, sem confete. Removido sozinho ao fim.
export const celebrateComplete = () => {
  if (typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return; // respeita acessibilidade

  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;display:flex;align-items:center;justify-content:center;overflow:hidden';

  // Brilho radial suave por trás
  const glow = document.createElement('div');
  glow.style.cssText = 'position:absolute;width:62vmin;height:62vmin;border-radius:50%;background:radial-gradient(circle,rgba(16,185,129,0.22),rgba(13,148,136,0.10) 45%,transparent 70%);animation:celebrate-glow 1.3s ease-out forwards';
  root.appendChild(glow);

  // Anéis concêntricos que expandem e somem
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    const size = 76 + i * 26;
    ring.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;border:2px solid rgba(13,148,136,${0.5 - i * 0.13});animation:celebrate-ring 1.25s ${i * 0.1}s cubic-bezier(0.22,1,0.36,1) forwards`;
    root.appendChild(ring);
  }

  // Emblema central com check desenhando
  const badge = document.createElement('div');
  badge.style.cssText = 'position:relative;width:84px;height:84px;border-radius:50%;background:#0f766e;box-shadow:0 12px 30px rgba(13,148,136,0.45);display:flex;align-items:center;justify-content:center;animation:celebrate-badge 1.35s cubic-bezier(0.34,1.56,0.64,1) forwards';
  badge.innerHTML = '<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" style="stroke-dasharray:30;stroke-dashoffset:30;animation:celebrate-check 0.45s 0.25s ease forwards"/></svg>';
  root.appendChild(badge);

  document.body.appendChild(root);
  setTimeout(() => root.remove(), 1500);
};
