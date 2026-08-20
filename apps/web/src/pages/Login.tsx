import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, ShieldCheck } from 'lucide-react';
import { post } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../layout/AppShell';
import { Button, Input, Field, Glass } from '../ui/components';
import { useToast, toastError } from '../ui/toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState<{ token: string } | null>(null);
  const [code, setCode] = useState('');
  const { reload } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as any;
  const toast = useToast();

  const go = () => nav(loc.state?.from || '/dashboard', { replace: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await post<any>('/api/auth/login', { email, password });
      if (r.mfaRequired) { setMfa({ token: r.mfaToken }); return; }
      await reload();
      go();
    } catch (err) { toastError(toast.push, err, 'ایمیل یا رمز اشتباه است.'); }
    finally { setBusy(false); }
  };

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await post('/api/auth/2fa/verify', { mfaToken: mfa!.token, code });
      await reload();
      go();
    } catch (err) { toastError(toast.push, err, 'کد تأیید اشتباه است.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Glass className="p-7">
          <div className="flex justify-center mb-6"><Brand /></div>
          {!mfa ? (
            <form onSubmit={submit} className="space-y-4">
              <h1 className="text-center font-bold text-lg mb-1">ورود به دنیای ما 💫</h1>
              <Field label="ایمیل">
                <Input type="email" dir="ltr" required autoComplete="email" placeholder="you@love.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="رمز عبور">
                <Input type="password" dir="ltr" required autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Button className="w-full" loading={busy}><LogIn size={17} /> ورود</Button>
              <div className="flex justify-between text-xs pt-1">
                <Link to="/forgot-password" className="text-muted2 hover:text-rose-300">رمزم رو یادم رفته</Link>
                <Link to="/register" className="text-rose-300 hover:text-rose-200">ساخت فضای دونفره</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={submitMfa} className="space-y-4 text-center">
              <ShieldCheck size={36} className="mx-auto text-purple-300" />
              <h2 className="font-bold">تأیید دو مرحله‌ای</h2>
              <p className="text-xs text-muted2 leading-6">کد ۶ رقمی اپ Authenticatorت رو وارد کن.</p>
              <Input dir="ltr" inputMode="numeric" maxLength={6} autoFocus className="text-center text-2xl tracking-[0.5em] num"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
              <Button className="w-full" loading={busy} disabled={code.length !== 6}>تأیید و ورود</Button>
              <button type="button" onClick={() => setMfa(null)} className="text-xs text-muted2 hover:text-cream">بازگشت</button>
            </form>
          )}
        </Glass>
        <p className="text-center text-[10px] text-muted2/60 mt-4">اطلاعاتت فقط بین شما دو نفره 🔒</p>
      </motion.div>
    </div>
  );
}
