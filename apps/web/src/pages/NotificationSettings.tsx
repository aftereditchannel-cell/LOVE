import { useEffect, useState } from 'react';
import { get, patch } from '../lib/api';
import { Glass, PageHeader, Toggle, PageLoading } from '../ui/components';
import { useToast } from '../ui/toast';

const items: Array<[string, string, string]> = [
  ['notif_birthday', '🎂 تولدها', 'یادآوری تولد پارتنرت'],
  ['notif_anniversary', '💍 سالگردها', 'نزدیک‌شدن سالگرد'],
  ['notif_calendar', '📅 رویدادهای تقویم', 'قرارها و برنامه‌های نزدیک'],
  ['notif_task', '✅ کارها', 'یادآوری کارهای مشترک'],
  ['notif_memory', '📸 خاطره‌ی جدید', 'وقتی پارتنرت خاطره ثبت می‌کنه'],
  ['notif_letter', '💌 نامه‌ها', 'وقتی نامه‌ی مُهرشده باز می‌شه'],
  ['notif_question', '❓ سؤال روز', 'سؤال تازه‌ی هر روز'],
  ['notif_mood', '💗 چک‌این حال', 'یادآوری ثبت حال روزانه'],
  ['notif_period', '🩸 چرخه‌ی ماهانه', 'خصوصی — فقط برای خودت'],
  ['notif_pms', '🌸 یادآوری PMS', '«احتمالاً روزهای سخت نزدیکه؛ بیشتر حواسم بهت باشه ❤️»'],
];

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const toast = useToast();
  useEffect(() => { get<{ prefs: Record<string, boolean> }>('/api/notifications/prefs').then((d) => setPrefs(d.prefs)).catch(() => {}); }, []);
  if (!prefs) return <PageLoading />;
  return (
    <div className="max-w-2xl">
      <PageHeader title="تنظیمات اعلان‌ها 🔔" subtitle="فقط چیزهایی که برات مهمن" />
      <Glass className="p-6 space-y-1">
        {items.map(([key, label, desc]) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div>
              <div className="text-sm">{label}</div>
              <div className="text-[11px] text-muted2 mt-0.5">{desc}</div>
            </div>
            <Toggle checked={!!prefs[key]} onChange={async (v) => {
              setPrefs((p) => ({ ...p!, [key]: v }));
              await patch('/api/settings', { [key]: v } as any);
              toast.push('success', 'ذخیره شد ✅');
            }} />
          </div>
        ))}
      </Glass>
    </div>
  );
}
