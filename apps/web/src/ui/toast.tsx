import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string };
const ToastCtx = createContext<{ push: (kind: Toast['kind'], text: string) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
const colors = {
  success: 'border-emerald-400/30 text-emerald-300',
  error: 'border-rose-400/30 text-rose-300',
  info: 'border-purple-300/30 text-purple-200',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-3), { id, kind, text }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-24 md:bottom-8 inset-x-0 z-[90] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = icons[t.kind];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                className={`glass-strong pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-sm border ${colors[t.kind]}`}
              >
                <Icon size={17} />
                <span className="text-cream">{t.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function toastError(push: (k: any, t: string) => void, e: any, fallback = 'مشکلی پیش آمد؛ دوباره تلاش کن.') {
  push('error', e?.message && typeof e.message === 'string' ? e.message : fallback);
}
