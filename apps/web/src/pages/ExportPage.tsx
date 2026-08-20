import { useState } from 'react';
import { Button, Glass, PageHeader } from '../ui/components';
import { useToast } from '../ui/toast';
import { FileDown, ShieldCheck } from 'lucide-react';

export default function ExportPage() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const doExport = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/export', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('خروجی‌گیری ناموفق بود.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `couple-os-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.push('success', 'خروجی دانلود شد 📦');
    } catch (e: any) { toast.push('error', e.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="max-w-2xl">
      <PageHeader title="خروجی کامل داده‌ها 📦" subtitle="دیتای تو، مال تو — هر وقت خواستی ببرش" />
      <Glass className="p-6 space-y-4">
        <div className="flex items-start gap-3 text-xs text-muted2 leading-7">
          <ShieldCheck size={16} className="text-emerald-300 shrink-0 mt-1" />
          <p>
            این فایل شامل همه‌ی داده‌های توه: پروفایل، حال‌ها، دفتر (با متن رمزگشایی‌شده)، خاطرات، نامه‌ها،
            تقویم، کارها، آرزوها، خرج‌ها و… . رمزها و توکن‌ها هیچ‌وقت داخل خروجی نمیان.
            فایل رو جای امن نگه دار.
          </p>
        </div>
        <Button onClick={doExport} loading={busy}><FileDown size={16} /> دانلود خروجی JSON</Button>
      </Glass>
    </div>
  );
}
