import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { post } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../layout/AppShell';
import { Button, Input, Field, Glass } from '../ui/components';
import { useToast, toastError } from '../ui/toast';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { reload } = useAuth();
  const nav = useNavigate();
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await post('/api/auth/register', { displayName, email, password });
      await reload();
      toast.push('success', 'خوش اومدی! حالا فضای دونفره‌ت رو بساز 🧡');
      nav('/onboarding', { replace: true });
    } catch (err) { toastError(toast.push, err); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Glass className="p-7">
          <div className="flex justify-center mb-6"><Brand /></div>
          <form onSubmit={submit} className="space-y-4">
            <h1 className="text-center font-bold text-lg mb-1">ساخت فضای دونفره ✨</h1>
            <Field label="نام تو">
              <Input required placeholder="مثلاً نیلوفر" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
            <Field label="ایمیل">
              <Input type="email" dir="ltr" required autoComplete="email" placeholder="you@love.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="رمز عبور" hint="حداقل ۸ کاراکتر">
              <Input type="password" dir="ltr" required minLength={8} autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button className="w-full" loading={busy}>بسازیم 💕</Button>
            <div className="text-center text-xs">
              <Link to="/login" className="text-muted2 hover:text-rose-300">قبلاً فضامون رو ساختیم — ورود</Link>
            </div>
          </form>
        </Glass>
      </motion.div>
    </div>
  );
}
