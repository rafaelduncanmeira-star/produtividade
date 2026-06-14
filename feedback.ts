// Feedback tátil e visual: deixa as ações (concluir, bater meta) gostosas de usar.

// Vibração curta no celular — silenciosamente ignorada onde não há suporte.
export const haptic = (pattern: number | number[] = 12) => {
  try { navigator.vibrate?.(pattern); } catch { /* sem suporte */ }
};

const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#38bdf8'];

// Explosão de confete leve, sem dependência: cria divs animados via CSS e remove no fim.
export const fireConfetti = (count = 80) => {
  if (typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return; // respeita acessibilidade

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const left = Math.random() * 100;
    const size = 6 + Math.random() * 6;
    const delay = Math.random() * 0.2;
    const duration = 1.6 + Math.random() * 1.2;
    const drift = (Math.random() - 0.5) * 180;
    piece.style.cssText =
      `position:absolute;top:-16px;left:${left}vw;width:${size}px;height:${size * 0.5}px;` +
      `background:${color};border-radius:1px;opacity:0;will-change:transform,opacity;` +
      `animation:confetti-fall ${duration}s ${delay}s ease-in forwards;--drift:${drift}px`;
    container.appendChild(piece);
  }

  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3200);
};
