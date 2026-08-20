import React, { useEffect, useState } from 'react';
import { get, post, del } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { fa, relTime } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, Toggle, PageLoading } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { KeyRound, ShieldCheck, Lock, Smartphone, MonitorSmartphone, Trash2 } from 'lucide-react';

export default function SecuritySettings() {
  const { me, reload, setLocked } = useAuth();
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const loadSessions = () => get<{ sessions: any[] }>('/api/auth/sessions').then((d) => setSessions(d.sessions)).catch(() => {});
  useEffect(() => { void loadSessions(); }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await post('/api/profile/change-password', pw); toast.push('success', 'رمز عوض شد و بقیه‌ی نشست‌ها بسته شدن 🔐'); setPw({ currentPassword: '', newPassword: '' }); }
    catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  const startTotp = async () => { const d = await post<any>('/api/auth/2fa/setup'); setTotpSetup(d); };
  const enableTotp = async () => {
    try { await post('/api/auth/2fa/enable', { code: totpCode }); toast.push('success', 'تأیید دو مرحله‌ای فعال شد 🛡️'); setTotpSetup(null); setTotpCode(''); await reload(); }
    catch (e) { toastError(toast.push, e); }
  };

  const setLockPin = async () => {
    try { await post('/api/settings/lock', { pin }); toast.push('success', 'قفل اپ فعال شد 🔒'); setPin(''); await reload(); }
    catch (e) { toastError(toast.push, e); }
  };
  const removeLock = async () => {
    try { await del('/api/settings/lock'); } catch { /* requires pin body via POST semantics */ }
  };

  if (!me) return <PageLoading />;
  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="امنیت 🔐" subtitle="دنیای دونفره‌تون، فقط مال خودتون" />

      {/* password */}
      <Glass className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4"><KeyRound size={16} className="text-amber-300" /> تغییر رمز عبور</div>
        <form onSubmit={changePassword} className="space-y-3">
          <Field label="رمز فعلی"><Input type="password" dir="ltr" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <Field label="رمز جدید" hint="حداقل ۸ کاراکتر"><Input type="password" dir="ltr" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          <Button size="sm" loading={busy}>تغییر رمز</Button>
        </form>
      </Glass>

      {/* 2FA */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-emerald-300" /> تأیید دو مرحله‌ای (2FA)</div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full ${me.user.totpEnabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/8 text-muted2'}`}>{me.user.totpEnabled ? 'فعال ✅' : 'غیرفعال'}</span>
        </div>
        {!me.user.totpEnabled && !totpSetup && (
          <div className="space-y-3">
            <p className="text-xs text-muted2 leading-6">با فعال‌سازی، ورود فقط با کد موقت اپ‌هایی مثل Google Authenticator ممکن می‌شه.</p>
            <Button size="sm" variant="soft" onClick={startTotp}>شروع فعال‌سازی</Button>
          </div>
        )}
        {totpSetup && (
          <div className="space-y-3">
            <p className="text-xs text-muted2 leading-6">این کلید رو توی اپ Authenticator دستی وارد کن (یا otpauth URL رو کپی کن):</p>
            <code dir="ltr" className="block glass p-3 text-center text-sm num text-amber-200 select-all break-all">{totpSetup.secret}</code>
            <Field label="کد ۶ رقمی اپ"><Input dir="ltr" inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} className="text-center text-xl tracking-[0.4em] num" /></Field>
            <Button size="sm" onClick={enableTotp} disabled={totpCode.length !== 6}>فعال‌سازی</Button>
          </div>
        )}
        {me.user.totpEnabled && (
          <DisableTotp onDone={reload} />
        )}
      </Glass>

      {/* app lock */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Lock size={16} className="text-purple-300" /> قفل اپ (PIN)</div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full ${me.user.lockEnabled ? 'bg-purple-500/15 text-purple-300' : 'bg-white/8 text-muted2'}`}>{me.user.lockEnabled ? 'فعال 🔒' : 'غیرفعال'}</span>
        </div>
        {!me.user.lockEnabled ? (
          <div className="flex gap-2 items-end">
            <Field label="پین ۴ تا ۸ رقمی" hint="فقط هش‌ش روی سرور ذخیره می‌شه؛ خودِ پین هیچ‌جا نیست.">
              <Input dir="ltr" inputMode="numeric" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="num tracking-[0.3em]" placeholder="••••" />
            </Field>
            <Button size="sm" onClick={setLockPin} disabled={pin.length < 4}>فعال‌سازی</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="soft" onClick={() => setLocked(true)}>قفل فوری الان 🔒</Button>
          </div>
        )}
      </Glass>

      {/* sessions */}
      <Glass className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4"><MonitorSmartphone size={16} className="text-sky-300" /> نشست‌های فعال</div>
        {sessions === null ? <PageLoading /> : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <Smartphone size={17} className="text-muted2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate">{s.deviceName || s.userAgent?.slice(0, 60) || 'دستگاه ناشناس'}{s.current && <span className="text-emerald-300"> (همین دستگاه)</span>}</div>
                  <div className="text-[10px] text-muted2 mt-0.5">{s.ip || '—'} • آخرین فعالیت: {relTime(s.lastUsedAt)}</div>
                </div>
                {!s.current && (
                  <button onClick={async () => { await del(`/api/auth/sessions/${s.id}`); toast.push('info', 'نشست بسته شد.'); loadSessions(); }}
                    className="p-1.5 rounded-full text-muted2 hover:text-rose-300 hover:bg-rose-500/10"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </Glass>
    </div>
  );
}

function DisableTotp({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const toast = useToast();
  return (
    <div className="flex gap-2 items-end">
      <Field label="برای غیرفعال‌سازی رمزت رو وارد کن"><Input type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Button size="sm" variant="danger" disabled={!password} onClick={async () => {
        try { await post('/api/auth/2fa/disable', { password }); toast.push('info', '2FA غیرفعال شد.'); onDone(); }
        catch (e: any) { toast.push('error', e.message); }
      }}>غیرفعال کن</Button>
    </div>
  );
}
