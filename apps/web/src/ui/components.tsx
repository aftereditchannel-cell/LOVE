import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export const cn = clsx;

// ---------- surfaces ----------
export function Glass({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass ring-soft', className)} {...rest}>{children}</div>;
}

export function PageHeader({ title, subtitle, back, actions }: { title: string; subtitle?: string; back?: () => void; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-2">
        {back && (
          <button onClick={back} className="mt-1 p-1.5 rounded-full hover:bg-white/10 transition-colors" aria-label="بازگشت">
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted2 mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ---------- buttons ----------
export function Button({ variant = 'primary', size = 'md', className, children, loading, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft'; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]';
  const sizes = { sm: 'px-3.5 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' };
  const variants = {
    primary: 'bg-gradient-to-l from-rose-500 to-purple-500 text-white btn-glow shadow-glow',
    soft: 'bg-white/10 hover:bg-white/15 text-cream border border-white/10',
    ghost: 'hover:bg-white/8 text-muted2 hover:text-cream',
    danger: 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30',
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} disabled={rest.disabled || loading} {...rest}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

// ---------- inputs ----------
const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-cream placeholder:text-muted2/70 focus:outline-none focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/15 transition-all';

export function Field({ label, hint, error, children }: { label?: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      {label && <span className="block text-xs text-muted2 mb-1.5">{label}</span>}
      {children}
      {hint && !error && <span className="block text-[11px] text-muted2/70 mt-1">{hint}</span>}
      {error && <span className="block text-[11px] text-rose-400 mt-1">{error}</span>}
    </label>
  );
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputCls, props.className)} {...props} />;
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, 'min-h-[110px] leading-7', props.className)} {...props} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputCls, 'appearance-none cursor-pointer')} {...props} />;
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 group">
      <span className={cn('w-10 h-6 rounded-full p-0.5 transition-colors duration-200 flex', checked ? 'bg-gradient-to-l from-rose-500 to-purple-500' : 'bg-white/15')}>
        <span className={cn('w-5 h-5 rounded-full bg-white shadow transition-transform duration-200', checked ? '-translate-x-4' : 'translate-x-0')} />
      </span>
      {label && <span className="text-sm text-muted2 group-hover:text-cream transition-colors">{label}</span>}
    </button>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn('px-3.5 py-1.5 rounded-full text-xs border transition-all duration-200 active:scale-95',
        active ? 'bg-gradient-to-l from-rose-500/25 to-purple-500/25 border-rose-400/40 text-cream' : 'bg-white/5 border-white/10 text-muted2 hover:text-cream hover:bg-white/10')}>
      {children}
    </button>
  );
}

// ---------- overlay: modal / bottom sheet ----------
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={cn('glass-strong relative w-full p-5 max-h-[88dvh] overflow-y-auto', wide ? 'max-w-2xl' : 'max-w-md')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{title}</h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10" aria-label="بستن"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- feedback ----------
export function Empty({ emoji = '🌙', title, hint, action }: { emoji?: string; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass flex flex-col items-center text-center py-12 px-6">
      <div className="text-5xl mb-4 animate-floaty">{emoji}</div>
      <div className="font-semibold mb-1">{title}</div>
      {hint && <div className="text-sm text-muted2 mb-5 max-w-xs leading-7">{hint}</div>}
      {action}
    </motion.div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 size={22} className={cn('animate-spin text-rose-300', className)} />;
}

export function PageLoading() {
  return (
    <div className="py-20 flex flex-col items-center gap-3">
      <Spinner />
      <span className="text-xs text-muted2">در حال بارگذاری…</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulseSoft rounded-xl bg-white/8', className)} />;
}

// ---------- misc ----------
export function Stat({ icon, label, value, accent = 'rose' }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: 'rose' | 'purple' }) {
  return (
    <Glass className="p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', accent === 'rose' ? 'bg-rose-500/15 text-rose-300' : 'bg-purple-500/15 text-purple-300')}>{icon}</div>
      <div>
        <div className="text-lg font-bold num">{value}</div>
        <div className="text-[11px] text-muted2">{label}</div>
      </div>
    </Glass>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-muted2">{children}</span>;
}

// ---------- tiny SVG charts ----------
export function LineChart({ points, height = 90, color = '#f472b6', label }: { points: number[]; height?: number; color?: string; label?: string }) {
  if (!points.length) return <div className="text-xs text-muted2 py-6 text-center">داده‌ای برای نمایش نیست</div>;
  const w = 300;
  const max = Math.max(...points, 10);
  const min = Math.min(...points, 0);
  const span = Math.max(max - min, 1);
  const stepX = points.length > 1 ? w / (points.length - 1) : w;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${(height - ((p - min) / span) * (height - 14) - 7).toFixed(1)}`).join(' ');
  return (
    <div>
      {label && <div className="text-[11px] text-muted2 mb-1">{label}</div>}
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img">
        <defs>
          <linearGradient id={`lg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path + ` L${w},${height} L0,${height} Z`} fill={`url(#lg-${color})`} stroke="none" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={i * stepX} cy={height - ((p - min) / span) * (height - 14) - 7} r="2.6" fill={color} />
        ))}
      </svg>
    </div>
  );
}

export function BarPair({ label, a, b, max = 10 }: { label: string; a: number; b: number; max?: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-16 text-muted2 shrink-0">{label}</span>
      <div className="flex-1 flex gap-1 items-center">
        <div className="h-2 rounded-full bg-rose-400/80" style={{ width: `${(a / max) * 100}%` }} />
        <div className="h-2 rounded-full bg-purple-400/80" style={{ width: `${(b / max) * 100}%` }} />
      </div>
    </div>
  );
}
