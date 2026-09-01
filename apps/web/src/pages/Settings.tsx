import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PageHeader, Glass } from '../ui/components';
import { UserRound, HeartHandshake, Shield, Lock, CloudUpload, Bell, HardDrive, Download, Sparkles, Palette, LogOut, Trash2 } from 'lucide-react';
import { useToast } from '../ui/toast';

const items = [
  { to: '/profile', icon: UserRound, label: 'پروفایل من', desc: 'نام، تولد، عکس و سلیقه‌ها' },
  { to: '/couple', icon: HeartHandshake, label: 'فضای دونفره', desc: 'اطلاعات ما و کد دعوت' },
  { to: '/settings/security', icon: Lock, label: 'امنیت', desc: 'رمز، تأیید دو مرحله‌ای، قفل اپ، نشست‌ها' },
  { to: '/settings/privacy', icon: Shield, label: 'حریم خصوصی', desc: 'رمزنگاری، دستگاه‌ها، دیتا و حذف حساب' },
  { to: '/settings/notifications', icon: Bell, label: 'اعلان‌ها', desc: 'هر چیزی رو که می‌خوای روشن/خاموش کن' },
  { to: '/settings/backup', icon: CloudUpload, label: 'بکاپ (GitHub Gist)', desc: 'بکاپ رمزنگاری‌شده و نسخه‌ها' },
  { to: '/settings/storage', icon: HardDrive, label: 'فضای ذخیره‌سازی', desc: 'وضعیت آپلودها و نصب اپ (PWA)' },
  { to: '/ai', icon: Sparkles, label: 'دستیار دونفره', desc: 'ایده‌های شخصی برای هر روز' },
  { to: '/export', icon: Download, label: 'خروجی کامل داده‌ها', desc: 'دانلود همه‌ی اطلاعاتت (JSON)' },
];

export default function SettingsHub() {
  const { logout } = useAuth();
  const toast = useToast();
  return (
    <div className="max-w-2xl">
      <PageHeader title="تنظیمات ⚙️" subtitle="همه‌چیز، زیر کنترل خودت" />
      <div className="space-y-2">
        {items.map((i) => (
          <Link key={i.to} to={i.to}>
            <Glass className="p-4 flex items-center gap-3.5 hover:bg-white/8 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/15 to-purple-500/15 flex items-center justify-center text-rose-300 shrink-0"><i.icon size={18} /></span>
              <div className="flex-1">
                <div className="text-sm font-medium">{i.label}</div>
                <div className="text-[11px] text-muted2 mt-0.5">{i.desc}</div>
              </div>
              <span className="text-muted2">‹</span>
            </Glass>
          </Link>
        ))}
        <button onClick={async () => { await logout(); toast.push('info', 'بدرود! زود برگرد ❤️'); location.href = '/'; }}
          className="w-full glass p-4 flex items-center gap-3.5 text-rose-300 hover:bg-rose-500/10 transition-colors">
          <span className="w-10 h-10 rounded-xl bg-rose-500/12 flex items-center justify-center shrink-0"><LogOut size={18} /></span>
          <span className="text-sm">خروج از حساب</span>
        </button>
      </div>
    </div>
  );
}
