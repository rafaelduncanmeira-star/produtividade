import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ToastAction { label: string; onClick: () => void; }
interface ToastOptions { action?: ToastAction; duration?: number; icon?: React.ReactNode; }
interface ToastItem extends ToastOptions { id: number; message: string; }

interface ToastCtx { toast: (message: string, options?: ToastOptions) => void; }

const Ctx = createContext<ToastCtx | null>(null);

export const useToast = (): ToastCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
};

let counter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((message: string, options?: ToastOptions) => {
    const id = ++counter;
    const duration = options?.duration ?? (options?.action ? 6000 : 3500);
    setItems(prev => [...prev.slice(-2), { id, message, ...options }]); // no máx. 3 visíveis
    timers.current[id] = setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] md:pb-6 pointer-events-none">
        {items.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto max-w-sm flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full bg-slate-800 text-white text-sm shadow-lg shadow-black/20 animate-[toast-in_0.2s_ease]"
          >
            {t.icon && <span className="shrink-0">{t.icon}</span>}
            <span className="flex-1 font-medium leading-snug">{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                className="shrink-0 font-semibold text-teal-300 hover:text-teal-200 px-1"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="shrink-0 p-1 text-slate-400 hover:text-white">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};
