import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { post } from '../lib/api';
import { Brand } from '../layout/AppShell';
import { Button, Input, Field, Glass } from '../ui/components';
import { useToast, toastError } from '../ui/toast';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const toast = useToast();
  const token = params.get('token') ?? '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.push('error', 'رمزها یکی نیستن.'); return; }
    setBusy(true);
    try {
      await post('/api/auth/reset-password', { token, password });
      toast.push('success', 'رمز جدید تنظیم شد؛ وارد شو ❤️');
      nav('/login', { replace: true });
    } catch (err) { toastError(toast.push, err); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm">
        <Glass className="p-7">
          <div className="flex justify-center mb-6"><Brand /></div>
          <form onSubmit={submit} className="space-y-4">
            <h1 className="text-center font-bold text-lg mb-1">رمز جدید 🔒</h1>
            <Field label="رمز جدید" hint="حداقل ۸ کاراکتر">
              <Input type="password" dir="ltr" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="تکرار رمز">
              <Input type="password" dir="ltr" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            <Button className="w-full" loading={busy} disabled={!token}>تنظیم رمز</Button>
            {!token && <div className="text-xs text-rose-400 text-center">توکن در لینک پیدا نشد؛ دوباره درخواست بده.</div>}
            <div className="text-center text-xs"><Link to="/forgot-password" className="text-muted2 hover:text-cream">درخواست لینک جدید</Link></div>
          </form>
        </Glass>
      </motion.div>
    </div>
  );
}
