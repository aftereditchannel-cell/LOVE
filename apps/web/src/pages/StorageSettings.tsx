import { useEffect, useState } from 'react';
import { get } from '../lib/api';
import { fa } from '../lib/format';
import { Glass, Button, PageHeader, Stat, PageLoading } from '../ui/components';
import { HardDrive, Download, Smartphone, Database, Images } from 'lucide-react';

export default function StorageSettings() {
  const [status, setStatus] = useState<any>(null);
  const [installEvt, setInstallEvt] = useState<any>(null);
  useEffect(() => {
    get('/api/backup/status').then(setStatus).catch(() => {});
    const h = (e: any) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  if (!status) return <PageLoading />;
  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="فضای ذخیره‌سازی 💾" subtitle="فایل‌ها روی Object Storage، فقط متادیتا توی دیتابیس" />
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<Database size={19} />} label="دیتابیس" value="SQLite (dev)" accent="purple" />
        <Stat icon={<HardDrive size={19} />} label="حافظه‌ی فایل" value={status.storage === 's3' ? 'S3 متصل ✅' : 'دیسک محلی (dev)'} />
      </div>
      <Glass className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3"><Images size={16} className="text-rose-300" /> درباره‌ی ذخیره‌ی فایل‌ها</div>
        <ul className="text-xs text-muted2 leading-7 space-y-1">
          <li>• عکس/ویدیو/ویس‌ها توی دیتابیس ذخیره نمی‌شن؛ فقط آدرس و متادیتاشون اونجاست.</li>
          <li>• برای Production با تنظیم STORAGE_ENDPOINT/BUCKET/KEYS به S3 یا Supabase Storage وصل می‌شی.</li>
          <li>• فایل‌ها فقط با احراز هویت و فقط برای اعضای همون فضای دونفره سرو می‌شن.</li>
        </ul>
      </Glass>
      <Glass className="p-6">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3"><Smartphone size={16} className="text-purple-300" /> نصب اپ (PWA)</div>
        <p className="text-xs text-muted2 leading-6 mb-3">Couple OS رو مثل یه اپ واقعی روی گوشی یا دسکتاپ نصب کن — آفلاین هم کار می‌کنه.</p>
        {installEvt ? (
          <Button size="sm" onClick={async () => { await installEvt.prompt(); setInstallEvt(null); }}><Download size={15} /> نصب روی این دستگاه</Button>
        ) : (
          <div className="text-[11px] text-muted2">اگه دکمه‌ی نصب دیده نمی‌شه: از منوی مرورگر «Add to Home Screen / Install app» رو انتخاب کن.</div>
        )}
      </Glass>
    </div>
  );
}
