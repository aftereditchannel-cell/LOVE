import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { post } from '../lib/api';
import { Brand } from '../layout/AppShell';
import { Button, Input, Field, Glass } from '../ui/components';
import { MailCheck } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await post('/api/auth/forgot-password', { email }); setSent(true); }
    catch { setSent(true); } // uniform response — no enumeration
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Glass className="p-7">
          <div className="flex justify-center mb-6"><Brand /></div>
          {sent ? (
            <div className="text-center space-y-3">
              <MailCheck size={40} className="mx-auto text-emerald-300" />
              <h2 className="font-bold">لینک بازنشانی ارسال شد 📬</h2>
              <p className="text-sm text-muted2 leading-7">اگر این ایمیل در سیستم ثبت باشه، لینک بازنشانی براش ارسال می‌شه. (در حالت dev لینک توی لاگ سرور چاپ می‌شه)</p>
              <Link to="/login" className="text-rose-300 text-sm">بازگشت به ورود</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h1 className="text-center font-bold text-lg mb-1">بازیابی رمز 🔑</h1>
              <Field label="ایمیل حساب">
                <Input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@love.com" />
              </Field>
              <Button className="w-full" loading={busy}>ارسال لینک</Button>
              <div className="text-center text-xs"><Link to="/login" className="text-muted2 hover:text-cream">بازگشت به ورود</Link></div>
            </form>
          )}
        </Glass>
      </motion.div>
    </div>
  );
}
