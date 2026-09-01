import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home, MessageCircle, Camera, CalendarDays, Grid3X3, Plus, BookOpen, Heart, Images,
  Gift, ListChecks, Wallet, Clock, HelpCircle, Languages, Activity, Sparkles, Settings,
  Mail, NotebookPen, CalendarClock, Trophy, Search, Bell, Lock, LogOut, WifiOff, CloudOff,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { get, post } from '../lib/api';
import { fa } from '../lib/format';
import { cn, Modal, Button, Input, PageLoading } from '../ui/components';

export const modules = [
  { to: '/dashboard', label: 'خانه', icon: Home },
  { to: '/chat', label: 'چت', icon: MessageCircle },
  { to: '/memories', label: 'خاطرات', icon: Camera },
  { to: '/journal', label: 'دفتر خاطرات', icon: BookOpen },
  { to: '/photos', label: 'عکس‌ها', icon: Images },
  { to: '/calendar', label: 'تقویم', icon: CalendarDays },
  { to: '/moods', label: 'حال‌وسوز', icon: Heart },
  { to: '/questions', label: 'سؤال روز', icon: HelpCircle },
  { to: '/love-letters', label: 'نامه‌ها', icon: Mail },
  { to: '/story', label: 'داستان ما', icon: NotebookPen },
  { to: '/countdowns', label: 'شمارش معکوس', icon: Clock },
  { to: '/wishlist', label: 'آرزوها', icon: Gift },
  { to: '/bucket-list', label: 'باکت‌لیست', icon: Trophy },
  { to: '/date-planner', label: 'قرار‌ساز', icon: CalendarClock },
  { to: '/tasks', label: 'کارها', icon: ListChecks },
  { to: '/expenses', label: 'خرج‌ها', icon: Wallet },
  { to: '/love-language', label: 'زبان عشق', icon: Languages },
  { to: '/relationship', label: 'سلامت رابطه', icon: Activity },
  { to: '/compliments', label: 'قدردانی', icon: Sparkles },
  { to: '/ai', label: 'دستیار دونفره', icon: Sparkles },
];

const bottomTabs = [
  { to: '/dashboard', label: 'خانه', icon: Home },
  { to: '/chat', label: 'چت', icon: MessageCircle },
  { to: '/memories', label: 'خاطرات', icon: Camera },
  { to: '/calendar', label: 'تقویم', icon: CalendarDays },
  { to: '/more', label: 'بیشتر', icon: Grid3X3 },
];

const fabActions = [
  { to: '/memories?new=1', label: 'خاطره', emoji: '📸' },
  { to: '/journal?new=1', label: 'یادداشت', emoji: '📓' },
  { to: '/moods', label: 'حال', emoji: '💗' },
  { to: '/photos?new=1', label: 'عکس', emoji: '🖼️' },
  { to: '/tasks?new=1', label: 'کار', emoji: '✅' },
  { to: '/calendar?new=1', label: 'رویداد', emoji: '📅' },
];

export function Brand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 30, md: 38, lg: 52 }[size];
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* ⚠️ Brand asset — swap /assets/brand/logo.svg to rebrand everywhere */}
      <img src="/assets/brand/logo.svg" alt="Couple OS" width={s} height={s} className="drop-shadow-[0_0_14px_rgba(244,114,182,0.45)]" />
      <div className="leading-none">
        <div className={cn('font-bold gradient-text', size === 'lg' ? 'text-2xl' : 'text-base')}>Couple OS</div>
        {size !== 'sm' && <div className="text-[10px] text-muted2 mt-1">دنیای کوچیک دوتایی ما</div>}
      </div>
    </div>
  );
}

export default function AppShell() {
  const { me, locked, setLocked, online, pendingOutbox, logout } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let alive = true;
    const load = () => get<{ unreadNotifications?: number }>('/api/dashboard').then((d) => alive && setUnread(d.unreadNotifications ?? 0)).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [loc.pathname]);

  useEffect(() => { setFabOpen(false); }, [loc.pathname]);

  return (
    <div className="min-h-dvh">
      {/* offline banner */}
      {!online && (
        <div className="fixed top-0 inset-x-0 z-[80] bg-amber-500/90 text-black text-xs font-medium text-center py-1.5 flex items-center justify-center gap-1">
          <WifiOff size={13} /> آفلاین هستی — تغییرات بعد از اتصال همگام می‌شن
          {pendingOutbox > 0 && <span className="num">({fa(pendingOutbox)} در صف)</span>}
        </div>
      )}

      {/* desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 right-0 w-64 flex-col gap-1 p-4 border-l border-white/5 bg-black/20 backdrop-blur-xl z-40">
        <div className="px-2 py-3 mb-2"><Brand /></div>
        <nav className="flex-1 overflow-y-auto space-y-0.5 pl-1">
          {modules.map((m) => (
            <NavLink key={m.to} to={m.to}
              className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200',
                isActive ? 'bg-gradient-to-l from-rose-500/20 to-purple-500/15 text-cream border border-rose-400/25' : 'text-muted2 hover:text-cream hover:bg-white/5 border border-transparent')}>
              <m.icon size={17} /> {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="pt-3 border-t border-white/5 space-y-0.5">
          <button onClick={() => setSearchOpen(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted2 hover:text-cream hover:bg-white/5"><Search size={17} /> جستجو</button>
          <button onClick={() => nav('/settings')} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted2 hover:text-cream hover:bg-white/5"><Settings size={17} /> تنظیمات</button>
          {me?.user.lockEnabled && (
            <button onClick={() => setLocked(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted2 hover:text-cream hover:bg-white/5"><Lock size={17} /> قفل فوری</button>
          )}
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted2 hover:text-rose-300 hover:bg-rose-500/10"><LogOut size={17} /> خروج</button>
        </div>
      </aside>

      {/* top bar (mobile/tablet) */}
      <header className="lg:hidden sticky top-0 z-40 px-4 pt-3 pb-2 bg-gradient-to-b from-ink/95 to-transparent backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Brand size="sm" />
          <div className="flex items-center gap-1">
            <button onClick={() => setSearchOpen(true)} className="p-2.5 rounded-full hover:bg-white/10" aria-label="جستجو"><Search size={19} /></button>
            <button onClick={() => nav('/notifications')} className="p-2.5 rounded-full hover:bg-white/10 relative" aria-label="اعلان‌ها">
              <Bell size={19} />
              {unread > 0 && <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center num">{fa(unread)}</span>}
            </button>
            {me?.user.lockEnabled && <button onClick={() => setLocked(true)} className="p-2.5 rounded-full hover:bg-white/10" aria-label="قفل"><Lock size={18} /></button>}
            <button onClick={() => nav('/settings')} className="p-2.5 rounded-full hover:bg-white/10" aria-label="تنظیمات"><Settings size={19} /></button>
          </div>
        </div>
      </header>

      {/* page content */}
      <main className={cn('px-4 pb-32 lg:pb-10 pt-2 lg:pt-8 lg:pr-72 max-w-6xl mx-auto w-full', !online && 'pt-9')}>
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FAB */}
      <div className="fixed bottom-20 lg:bottom-8 left-4 z-[60] flex flex-col items-center gap-2">
        <AnimatePresence>
          {fabOpen && (
            <motion.div initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.9 }}
              className="glass-strong p-2 flex flex-col gap-1 mb-1">
              {fabActions.map((a, i) => (
                <motion.button key={a.label} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                  onClick={() => nav(a.to)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-white/10 transition-colors">
                  <span>{a.emoji}</span>{a.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setFabOpen((v) => !v)}
          className="w-14 h-14 rounded-full bg-gradient-to-l from-rose-500 to-purple-500 text-white shadow-glow btn-glow flex items-center justify-center"
          aria-label="افزودن سریع">
          <motion.span animate={{ rotate: fabOpen ? 45 : 0 }}><Plus size={26} /></motion.span>
        </motion.button>
      </div>

      {/* bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass-strong !rounded-none border-x-0 border-b-0 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-5">
          {bottomTabs.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => cn('flex flex-col items-center gap-1 py-1.5 rounded-xl text-[10px] transition-colors', isActive ? 'text-rose-300' : 'text-muted2')}>
              {({ isActive }) => (<>
                <span className={cn('p-1.5 rounded-xl transition-all', isActive && 'bg-gradient-to-l from-rose-500/25 to-purple-500/20')}><t.icon size={20} /></span>
                {t.label}
              </>)}
            </NavLink>
          ))}
        </div>
      </nav>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {locked && me?.user.lockEnabled && <LockScreen onUnlock={() => setLocked(false)} />}
    </div>
  );
}

function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      get<{ results: any[] }>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((d) => setResults(d.results)).catch(() => {}).finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Modal open={open} onClose={onClose} title="جستجوی سراسری 🔎" wide>
      <Input autoFocus placeholder="خاطره، یادداشت، رویداد، نامه…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 space-y-1.5 max-h-[50vh] overflow-y-auto">
        {loading && <PageLoading />}
        {!loading && q && !results.length && <div className="text-sm text-muted2 text-center py-8">چیزی پیدا نشد 🌫️</div>}
        {results.map((r) => (
          <button key={r.type + r.id} onClick={() => { onClose(); nav(r.href); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 text-right transition-colors">
            <span className="text-lg">{{ memory: '📸', journal: '📓', event: '📅', wishlist: '🎁', letter: '💌', photo: '🖼️' }[r.type as string] ?? '🔹'}</span>
            <span className="flex-1">
              <span className="block text-sm">{r.title}</span>
              <span className="block text-[10px] text-muted2 mt-0.5">{r.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { logout } = useAuth();
  const submit = async (value: string) => {
    setBusy(true);
    try {
      await post('/api/settings/lock/verify', { pin: value });
      setPin(''); onUnlock();
    } catch (e: any) {
      setError(e.message || 'پین اشتباه است');
      setPin('');
    } finally { setBusy(false); }
  };
  const tap = (d: string) => {
    if (busy) return;
    const next = (pin + d).slice(0, 8);
    setPin(next); setError('');
    if (next.length >= 4) submit(next);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-ink/95 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 p-6">
      <Brand size="lg" />
      <div className="text-sm text-muted2 -mt-4">فضای دونفره‌ت قفله 🔒</div>
      <div className="flex gap-3" dir="ltr">
        {Array.from({ length: Math.max(4, pin.length || 4) }).map((_, i) => (
          <div key={i} className={cn('w-3.5 h-3.5 rounded-full transition-all', (pin.length > i) ? 'bg-gradient-to-l from-rose-400 to-purple-400 scale-110' : 'bg-white/15')} />
        ))}
      </div>
      {error && <div className="text-rose-400 text-xs -mt-4">{error}</div>}
      <div className="grid grid-cols-3 gap-3" dir="ltr">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => d === '' ? <div key={i} /> : (
          <button key={i} onClick={() => (d === '⌫' ? setPin((p) => p.slice(0, -1)) : tap(d))}
            className="w-16 h-16 rounded-full glass hover:bg-white/12 text-xl font-medium transition-all active:scale-90 num">
            {d === '⌫' ? '⌫' : fa(d)}
          </button>
        ))}
      </div>
      <button onClick={logout} className="text-xs text-muted2 hover:text-rose-300 transition-colors">خروج از حساب</button>
    </motion.div>
  );
}
