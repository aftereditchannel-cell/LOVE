import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { get } from '../lib/api';
import { Glass, PageHeader, PageLoading, Button } from '../ui/components';
import { useToast } from '../ui/toast';
import { Sparkles, HeartHandshake, CalendarHeart, Gift, Tent, MessagesSquare, Mail, BookOpen, RefreshCw, ShieldQuestion } from 'lucide-react';

const icons: Record<string, any> = { care: HeartHandshake, date: CalendarHeart, gift: Gift, weekend: Tent, talk: MessagesSquare };

export default function AI() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    get('/api/ai/suggestions').then(setData).catch((e) => toast.push('error', e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading && !data) return <PageLoading />;
  return (
    <div className="max-w-2xl">
      <PageHeader title="دستیار دونفره ✨" subtitle="ایده‌های شخصی، ساخته‌شده در همین اپ — داده‌ات جایی نمی‌ره"
        actions={<Button size="sm" variant="soft" onClick={load} loading={loading}><RefreshCw size={14} /> تازه‌سازی</Button>} />

      <div className="glass p-3.5 mb-4 flex gap-2.5 text-[11px] text-muted2 leading-6">
        <ShieldQuestion size={15} className="shrink-0 mt-0.5 text-emerald-300" />
        این دستیار فقط یه تولیدکننده‌ی ایده‌ست (روی سرور خودت، بدون سرویس خارجی) و به هیچ‌وجه جای روان‌شناس یا پزشک نیست. {data?.note}
      </div>

      <div className="space-y-4">
        {(data?.sections ?? []).map((s: any, i: number) => {
          const Icon = icons[s.kind] ?? Sparkles;
          return (
            <motion.div key={s.kind} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Glass className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Icon size={17} className="text-rose-300" /> {s.title}
                </div>
                <ul className="space-y-2">
                  {s.ideas.map((idea: string, j: number) => (
                    <li key={j} className="text-sm leading-7 text-muted2 flex gap-2">
                      <span className="text-rose-300">✦</span> <span>{idea}</span>
                    </li>
                  ))}
                </ul>
              </Glass>
            </motion.div>
          );
        })}

        {data?.letterDraft && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Glass className="p-5 border-r-2 !border-r-rose-400">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3"><Mail size={17} className="text-rose-300" /> پیش‌نویس نامه‌ی عاشقانه 💌</div>
              <p className="text-sm leading-8 whitespace-pre-wrap text-muted2">{data.letterDraft}</p>
              <a href="/love-letters" className="text-xs text-rose-300 mt-3 inline-block">همینو توی نامه‌ها بنویس ←</a>
            </Glass>
          </motion.div>
        )}
        {data?.storyDraft && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Glass className="p-5 border-r-2 !border-r-purple-400">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3"><BookOpen size={17} className="text-purple-300" /> خاطرات → داستان 📖</div>
              <p className="text-sm leading-8 whitespace-pre-wrap text-muted2">{data.storyDraft}</p>
              <a href="/story" className="text-xs text-purple-300 mt-3 inline-block">به «داستان ما» اضافه‌ش کن ←</a>
            </Glass>
          </motion.div>
        )}
      </div>
    </div>
  );
}
