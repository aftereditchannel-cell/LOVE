import { useEffect, useState } from 'react';
import { get, post, patch, put, del } from '../lib/api';
import { fa, relTime, faDate } from '../lib/format';
import { Glass, Button, PageHeader, Toggle, PageLoading, Empty, Input, Field } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { CloudUpload, History, RotateCcw, ShieldCheck, ShieldAlert, Github, KeyRound, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react';

/** Settings → Cloud backup. The GitHub token is entered here manually and stored ENCRYPTED
 *  on the server (couples.gist_token_enc). It is never shown back, never in exports/backups. */
export default function BackupSettings() {
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);
  const [removingToken, setRemovingToken] = useState(false);
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
    } catch (e) { toastError(toast.push, e, 'اتصال به GitHub برقرار نشد؛ توکن رو چک کن.'); }
    finally { setBusy(false); }
  };

  const restore = async (version: number) => {
    if (!confirm(`نسخه‌ی ${fa(version)} جایگزین داده‌های فعلی بشه؟`)) return;
    setRestoring(version);
    try { await post('/api/backup/restore', { version }); toast.push('success', 'بازیابی انجام شد ✅'); }
    catch (e) { toastError(toast.push, e); }
    finally { setRestoring(null); load(); }
  };

  const saveToken = async () => {
    const t = token.trim();
    if (!t) return toast.push('info', 'اول توکن رو بچسبون.');
    setSavingToken(true);
    try {
      const r = await put<any>('/api/backup/token', { token: t });
      setToken('');
      toast.push('success', `توکن ذخیره شد 🔒 (اکانت گیت‌هاب: ${r.login})`);
      load();
    } catch (e) { toastError(toast.push, e); }
    finally { setSavingToken(false); }
  };

  const removeToken = async () => {
    if (!confirm('توکن ذخیره‌شده حذف بشه؟ (Gist و نسخه‌های قبلی دست نمی‌خورن)')) return;
    setRemovingToken(true);
    try { await del('/api/backup/token'); toast.push('success', 'توکن حذف شد.'); load(); }
    catch (e) { toastError(toast.push, e); }
    finally { setRemovingToken(false); }
  };

  const tokenState = status.tokenSource as 'site' | 'env' | 'none';

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="بکاپ ابری ☁️🔒" subtitle="نسخه‌بندی‌شده، رمزنگاری‌شده، روی GitHub Gist خصوصی" />

      {/* ---- GitHub token (manual entry) ---- */}
      <Glass className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
          <KeyRound size={16} className="text-amber-300" /> توکن گیت‌هاب
          <span className={`text-[10px] px-2 py-0.5 rounded-full mr-1 ${
            tokenState === 'site' ? 'bg-emerald-400/15 text-emerald-300'
            : tokenState === 'env' ? 'bg-sky-400/15 text-sky-300'
            : 'bg-rose-400/15 text-rose-300'}`}>
            {tokenState === 'site' ? `ذخیره‌شده از سایت ${status.tokenHint ?? ''}` : tokenState === 'env' ? 'از env سرور' : 'تنظیم نشده'}
          </span>
        </div>
        <p className="text-[11px] text-muted2 leading-5 mb-4">
          توکن اینجا وارد و ذخیره می‌شه تا بک‌آپ‌های رمزنگاری‌شده به Gist خصوصی خودت بره.
          قبل از ذخیره، اعتبارش با گیت‌هاب چک می‌شه؛ بعدش <b>رمزنگاری‌شده (AES-256-GCM)</b> فقط روی سرور نگه داشته می‌شه و هیچ‌وقت دوباره نمایش داده نمی‌شه، توی بکاپ و خروجی هم نمیاد.
        </p>

        {tokenState === 'site' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-emerald-300 inline-flex items-center gap-1"><ShieldCheck size={14} /> توکن فعاله {status.tokenHint}</span>
            <Button size="sm" variant="soft" onClick={removeToken} loading={removingToken}><Trash2 size={13} /> حذف توکن</Button>
          </div>
        ) : (
          <>
            <Field label="Personal Access Token (Classic)">
              <div className="relative">
                <Input
                  dir="ltr"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="button" onClick={() => setShowToken((v) => !v)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted2 hover:text-white transition">
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button size="sm" onClick={saveToken} loading={savingToken}><ShieldCheck size={14} /> بررسی و ذخیره</Button>
              <a href="https://github.com/settings/tokens/new?scopes=gist&description=couple-os-backup" target="_blank" rel="noreferrer"
                className="text-[11px] text-purple-300 hover:text-purple-200 inline-flex items-center gap-1">
                ساخت توکن با فقط scope: gist <ExternalLink size={11} />
              </a>
            </div>
            <p className="text-[10px] text-muted2 mt-3 leading-5">
              ۱) از لینک بالا وارد گیت‌هاب شو (فقط تیک <b>gist</b> باید خورده باشه) ۲) توکن Classic بساز (Fine-grained به Gist دسترسی نداره)
              ۳) توکن رو اینجا بچسبون و ذخیره کن.
              {tokenState === 'env' && ' در حال حاضر توکنِ env سرور استفاده می‌شه؛ با ذخیره‌ی توکن اینجا، توکن خودت جایگزینش می‌شه.'}
            </p>
          </>
        )}
      </Glass>

      {/* ---- Backup run + auto ---- */}
      <Glass className="p-6">
        <div className="flex items-center gap-3 mb-4">
          {status.configured ? <ShieldCheck size={22} className="text-emerald-300" /> : <ShieldAlert size={22} className="text-amber-300" />}
          <div>
            <div className="text-sm font-semibold">{status.configured ? 'اتصال Gist فعاله' : 'اول توکن رو ذخیره کن'}</div>
            <div className="text-[11px] text-muted2 mt-0.5">
              {status.configured
                ? `رمزنگاری: ${status.encryption} • آخرین بکاپ: ${status.lastJob ? relTime(status.lastJob.started_at) : '—'} (${({ success: 'موفق ✅', failed: 'ناموفق ❌', skipped: 'ردشده ⏭️', running: 'درحال اجرا ⏳' } as any)[status.lastJob?.status] ?? '—'})${status.gistLinked ? ' • Gist متصل است' : ''}`
                : 'بعد از ذخیره‌ی توکن، بکاپ دستی و خودکار فعال می‌شه. توکن هیچ‌وقت به مرورگر برنمی‌گرده.'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={run} loading={busy} disabled={!status.configured}><CloudUpload size={16} /> بکاپ دستی الان</Button>
          <Toggle checked={status.autoBackupEnabled} label="بکاپ خودکار بعد از تغییرات (هر ~۴۵ ثانیه دسته‌بندی می‌شه)"
            onChange={async (v) => { await patch('/api/backup/settings', { autoBackup: v }); toast.push('success', v ? 'بکاپ خودکار روشن شد ✅' : 'خاموش شد.'); load(); }} />
        </div>
      </Glass>

      {/* ---- Versions ---- */}
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

      {/* ---- Job history ---- */}
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

      <div className="text-[10px] text-muted2 leading-5 px-1 flex items-start gap-1.5">
        <Github size={12} className="shrink-0 mt-0.5" />
        <span>
          بکاپ‌ها به Gist خصوصی اکانت خودت می‌رن و فقط با توکن تو قابل‌خوندنن؛ حتی روی Gist هم محتوا رمزنگاری‌شده‌ست (ciphertext).
          توکن هرگز توی کد، گیت، لاگ، بکاپ یا خروجی‌گرفتن قرار نمی‌گیره و فقط رمزنگاری‌شده روی سرور ذخیره می‌شه.
        </span>
      </div>
    </div>
  );
}
