import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get, del, post } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { relTime } from '../lib/format';
import { Glass, Button, PageHeader, Stat, PageLoading } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { LockKeyhole, CloudUpload, MonitorSmartphone, FileDown, Trash2, AlertTriangle, DatabaseBackup } from 'lucide-react';

export default function PrivacySettings() {
  const { logout } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const nav = useNavigate();
  const toast = useToast();

  useEffect(() => { get('/api/backup/status').then(setStatus).catch(() => {}); }, []);
  if (!status) return <PageLoading />;

  const confirmText = (what: string) => prompt(`برای تأیید، عبارت DELETE رو بنویس:\n(${what})`) === 'DELETE';

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="حریم خصوصی 🛡️" subtitle="شفافیت کامل درباره‌ی داده‌هات" />

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<LockKeyhole size={19} />} label="رمزنگاری داده‌های حساس" value="AES-256-GCM ✅" />
        <Stat icon={<CloudUpload size={19} />} label="بکاپ Gist" value={status.configured ? (status.gistLinked ? 'متصل ✅' : 'آماده ✅') : 'تنظیم نشده ⚙️'} accent="purple" />
        <Stat icon={<MonitorSmartphone size={19} />} label="آخرین بکاپ" value={status.lastJob ? relTime(status.lastJob.started_at) : '—'} />
        <Stat icon={<DatabaseBackup size={19} />} label="نسخه‌های بکاپ" value={status.versions.length} accent="purple" />
      </div>

      <Glass className="p-6">
        <div className="text-sm font-semibold mb-2">چی‌ها رمزنگاری می‌شن؟</div>
        <ul className="text-xs text-muted2 leading-7 space-y-1">
          <li>• محتوای دفتر خاطرات، پیام‌های چت، نامه‌های عاشقانه و یادداشت‌های چرخه — با کلید سرور رمز می‌شن.</li>
          <li>• بکاپ GitHub Gist قبل از ارسال رمزنگاری می‌شه؛ روی Gist فقط متن رمزشده می‌ره.</li>
          <li>• رمز عبور با bcrypt، پین قفل و توکن‌ها به‌صورت هش ذخیره می‌شن.</li>
          <li>• کلید رمزنگاری هیچ‌وقت وارد Gist، دیتابیس بکاپ یا مرورگر نمی‌شه.</li>
        </ul>
      </Glass>

      <Glass className="p-6 space-y-3">
        <div className="text-sm font-semibold">دیتای من</div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/export"><Button size="sm" variant="soft"><FileDown size={14} /> خروجی همه‌ی داده‌ها (JSON)</Button></Link>
          <Link to="/settings/backup"><Button size="sm" variant="soft"><CloudUpload size={14} /> مدیریت بکاپ</Button></Link>
          <Link to="/settings/security"><Button size="sm" variant="soft"><MonitorSmartphone size={14} /> نشست‌ها و دستگاه‌ها</Button></Link>
        </div>
      </Glass>

      {/* danger zone */}
      <Glass className="p-6 border border-rose-500/25">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3 text-rose-300"><AlertTriangle size={16} /> منطقه‌ی خطر</div>
        <div className="space-y-3">
          <DeleteCouple confirmText={confirmText} onDone={() => { toast.push('info', 'فضای دونفره پاک شد.'); nav('/onboarding'); }} />
          <DeleteAccount confirmText={confirmText} onDone={async () => { await logout(); nav('/'); }} />
        </div>
      </Glass>
    </div>
  );
}

function DeleteCouple({ confirmText, onDone }: any) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="text-sm">حذف فضای دونفره</div>
        <div className="text-[11px] text-muted2 mt-0.5">همه‌ی خاطرات، چت و داده‌های مشترک برای همیشه پاک می‌شه.</div>
      </div>
      <Button size="sm" variant="danger" loading={busy} onClick={async () => {
        if (!confirmText('حذف فضای دونفره')) return;
        setBusy(true);
        try { await del('/api/settings/couple').catch(() => post('/api/settings/couple', { confirm: 'DELETE' } as any)); } catch { /* uses DELETE w/o body */ }
        try { await post('/api/settings/couple', { confirm: 'DELETE' }, ); } catch {}
        try { const res = await fetch('/api/settings/couple', { method: 'DELETE', headers: { 'content-type': 'application/json', 'x-csrf-token': (document.cookie.match(/co_csrf=([^;]*)/) || [])[1] ?? '' }, body: JSON.stringify({ confirm: 'DELETE' }) }); if (!res.ok) throw new Error(); onDone(); }
        catch { toast.push('error', 'حذف انجام نشد؛ دوباره تلاش کن.'); }
        finally { setBusy(false); }
      }}><Trash2 size={14} /> حذف</Button>
    </div>
  );
}

function DeleteAccount({ confirmText, onDone }: any) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="text-sm">حذف حساب کاربری</div>
        <div className="text-[11px] text-muted2 mt-0.5">حساب تو ناشناس و غیرفعال می‌شه؛ داده‌های مشترک باقی می‌مونه مگر فضا رو هم حذف کنی.</div>
      </div>
      <Button size="sm" variant="danger" loading={busy} onClick={async () => {
        if (!confirmText('حذف حساب')) return;
        const password = prompt('رمز عبورت رو وارد کن:');
        if (!password) return;
        setBusy(true);
        try {
          const res = await fetch('/api/settings/account', { method: 'DELETE', headers: { 'content-type': 'application/json', 'x-csrf-token': (document.cookie.match(/co_csrf=([^;]*)/) || [])[1] ?? '' }, body: JSON.stringify({ password }) });
          if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error?.message || 'ناموفق'); }
          toast.push('info', 'حساب حذف شد. 💔'); onDone();
        } catch (e: any) { toast.push('error', e.message); }
        finally { setBusy(false); }
      }}><Trash2 size={14} /> حذف</Button>
    </div>
  );
}
