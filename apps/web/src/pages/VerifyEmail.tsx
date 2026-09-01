import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { post } from '../lib/api';
import { Brand } from '../layout/AppShell';
import { Glass, Button, PageLoading } from '../ui/components';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'loading' | 'ok' | 'bad'>('loading');
  useEffect(() => {
    const token = params.get('token');
    if (!token) { setState('bad'); return; }
    post('/api/auth/verify-email', { token }).then(() => setState('ok')).catch(() => setState('bad'));
  }, [params]);
  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <Glass className="p-8 text-center max-w-sm w-full space-y-4">
        <div className="flex justify-center"><Brand /></div>
        {state === 'loading' && <PageLoading />}
        {state === 'ok' && (<>
          <CheckCircle2 size={44} className="mx-auto text-emerald-300" />
          <h1 className="font-bold">ایمیلت تأیید شد ✅</h1>
          <Link to="/dashboard"><Button className="w-full">برو به دنیای ما 💕</Button></Link>
        </>)}
        {state === 'bad' && (<>
          <XCircle size={44} className="mx-auto text-rose-400" />
          <h1 className="font-bold">لینک معتبر نیست</h1>
          <p className="text-xs text-muted2">لینک منقضی شده یا استفاده شده؛ از تنظیمات دوباره درخواست بده.</p>
          <Link to="/login" className="text-rose-300 text-sm">بازگشت</Link>
        </>)}
      </Glass>
    </div>
  );
}
