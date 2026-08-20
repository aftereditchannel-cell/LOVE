import { useEffect, useState } from 'react';
import { get, post, patch } from '../lib/api';
import { fa, relTime, faDate } from '../lib/format';
import { Glass, Button, PageHeader, Toggle, PageLoading, Empty } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { CloudUpload, History, RotateCcw, ShieldCheck, ShieldAlert, Github } from 'lucide-react';

export default function BackupSettings() {
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const toast = useToast();

  const load = () => get('/api/backup/status').then(setStatus).catch((e) => toast.push('error', e.message));
  useEffect(() => { void load(); }, []);

  if (!status) return <PageLoading />;

  const run = async () => {
    setBusy(true);
    try {
      const r = await post<any>('/api/backup/run');
      if (r.status === 'success') toast.push('success', `بکاپ نسخه‌ی ${fa(r.version)} رمزنگاری و ارسال شد ☁️🔒`);
      else toast.push('info', r.reason || 'بکاپ انجام نشد.');
      load();
    } catch (e) { toastError(toast.push, e, 'اتصال به GitHub برقرار نشد. توکن سرور رو چک کن.'); }
    finally { setBusy(false); }
  };

  const restore = async (version: number) => {
    if (!confirm(`نسخه‌ی ${fa(version)} جایگزین داده‌های فعلی بشه؟`)) return;
    setRestoring(version);
    try { await post('/api/backup/restore', { version }); toast.push('success', 'بازیابی انجام شد ✅'); }
    catch (e) { toastError(toast.push, e); }
    finally { setRestoring(null); load(); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="بکاپ ابری ☁️🔒" subtitle="نسخه‌بندی‌شده، رمزنگاری‌شده، روی GitHub Gist خصوصی" />

      <Glass className="p-6">
        <div className="flex items-center gap-3 mb-4">
          {status.configured ? <ShieldCheck size={22} className="text-emerald-300" /> : <ShieldAlert size={22} className="text-amber-300" />}
          <div>
            <div className="text-sm font-semibold">{status.configured ? 'اتصال Gist فعاله' : 'توکن گیت‌هاب تنظیم نشده'}</div>
            <div className="text-[11px] text-muted2 mt-0.5">
              {status.configured
                ? `رمزنگاری: ${status.encryption} • آخرین بکاپ: ${status.lastJob ? relTime(status.lastJob.started_at) : '—'} (${({ success: 'موفق ✅', failed: 'ناموفق ❌', skipped: 'ردشده ⏭️' } as any)[status.lastJob?.status] ?? '—'})`
                : 'برای فعال‌سازی، متغیر COUPLE_OS_GITHUB_TOKEN رو فقط روی سرور بذار (scope: gist). توکن هیچ‌وقت به مرورگر نمی‌رسه.'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={run} loading={busy} disabled={!status.configured}><CloudUpload size={16} /> بکاپ دستی الان</Button>
          <Toggle checked={status.autoBackupEnabled} label="بکاپ خودکار بعد از تغییرات (هر ~۴۵ ثانیه دسته‌بندی می‌شه)"
            onChange={async (v) => { await patch('/api/backup/settings', { autoBackup: v }); toast.push('success', v ? 'بکاپ خودکار روشن شد ✅' : 'خاموش شد.'); load(); }} />
        </div>
      </Glass>

      <Glass className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4"><History size={16} className="text-purple-300" /> نسخه‌های بکاپ</div>
        {!status.versions.length ? (
          <Empty emoji="☁️" title="هنوز بکاپی گرفته نشده" hint="اولین بکاپ رمزنگاری‌شده رو بگیر تا خیالت راحت بشه." action={<Button size="sm" onClick={run} loading={busy} disabled={!status.configured}>گرفتن اولین بکاپ</Button>} />
        ) : (
          <div className="space-y-2">
            {status.versions.map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <span className="text-xs num text-purple-300 font-bold w-12">v{fa(v.version)}</span>
                <div className="flex-1">
                  <div className="text-xs num">{faDate(v.created_at)}</div>
                  <div className="text-[10px] text-muted2 num">{v.size_bytes ? `${fa(Math.round(v.size_bytes / 1024))}KB` : ''} • sha: {v.sha?.slice(0, 10)}…</div>
                </div>
                <Button size="sm" variant="soft" loading={restoring === v.version} onClick={() => restore(v.version)}><RotateCcw size={13} /> بازیابی</Button>
              </div>
            ))}
          </div>
        )}
      </Glass>

      {!!status.jobs?.length && (
        <Glass className="p-6">
          <div className="text-sm font-semibold mb-3">تاریخچه‌ی اجراها</div>
          <div className="space-y-1.5">
            {status.jobs.map((j: any) => (
              <div key={j.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/5 last:border-0">
                <span>{({ success: '✅', failed: '❌', skipped: '⏭️', running: '⏳', pending: '⏳' } as any)[j.status]}</span>
                <span className="text-muted2">{j.trigger_type === 'manual' ? 'دستی' : 'خودکار'}</span>
                <span className="text-muted2 mr-auto">{relTime(j.started_at)}</span>
              </div>
            ))}
          </div>
        </Glass>
      )}
    </div>
  );
}
