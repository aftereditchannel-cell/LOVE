import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, get, post, ApiError } from '../lib/api';
import { flushOutbox, useOnlineStatus } from '../offline/outbox';

export type MeState = {
  user: {
    id: string; email: string; displayName: string; avatarUrl: string | null;
    emailVerified: boolean; totpEnabled: boolean; lockEnabled: boolean; theme: string; locale: string;
  };
  profile: { nickname: string | null; birthday: string | null; favoriteColor: string | null; favoriteThings: string | null; bio: string | null } | null;
  couple: { id: string; title: string | null; startDate: string | null } | null;
};

type Ctx = {
  me: MeState | null;
  loading: boolean;
  locked: boolean;
  online: boolean;
  pendingOutbox: number;
  setLocked: (v: boolean) => void;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingOutbox, setPendingOutbox] = useState(0);

  const reload = useCallback(async () => {
    try {
      const data = await get<MeState>('/api/auth/me');
      setMe(data);
      applyTheme(data.user.theme);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // theme side-effect
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => applyTheme(me?.user.theme ?? 'system');
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [me?.user.theme]);

  // offline/online + outbox flush
  useEffect(() => {
    const un = useOnlineStatus((o) => {
      setOnline(o);
      if (o) flushOutbox((p, o2) => api(p, o2)).then(() => setPendingOutbox(JSON.parse(localStorage.getItem('couple-os-outbox') ?? '[]').length));
    });
    const onOutbox = (e: any) => setPendingOutbox(e.detail ?? 0);
    window.addEventListener('outbox-change', onOutbox);
    return () => { un(); window.removeEventListener('outbox-change', onOutbox); };
  }, []);

  // auto-lock after idle when lock enabled
  useEffect(() => {
    if (!me?.user.lockEnabled) return;
    let timer = 0;
    const reset = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => setLocked(true), 10 * 60 * 1000);
    };
    reset();
    const evs = ['click', 'keydown', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => { clearTimeout(timer); evs.forEach((e) => window.removeEventListener(e, reset)); };
  }, [me?.user.lockEnabled]);

  const logout = useCallback(async () => {
    try { await post('/api/auth/logout'); } catch { /* noop */ }
    setMe(null);
  }, []);

  const value = useMemo(() => ({ me, loading, locked, online, pendingOutbox, setLocked, reload, logout }), [me, loading, locked, online, pendingOutbox, reload, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

function applyTheme(theme: string) {
  const light = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.classList.toggle('light', light);
}

export { ApiError };
