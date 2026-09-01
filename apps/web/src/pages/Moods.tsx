import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { get, post, ApiError } from '../lib/api';
import { enqueue } from '../offline/outbox';
import { Moods as MoodMap, SupportWishes, fa } from '../lib/format';
import { Glass, Button, PageHeader, TextArea, Field } from '../ui/components';
import { useToast } from '../ui/toast';
import { LineChart } from '../ui/components';

const sliders: Array<{ key: string; label: string }> = [
  { key: 'energy', label: 'انرژی ⚡' },
  { key: 'stress', label: 'استرس 🌩️ (۱۰ = زیاد)' },
  { key: 'sleep', label: 'کیفیت خواب 😴' },
  { key: 'loveLevel', label: 'عشق امروزم ❤️' },
  { key: 'socialBattery', label: 'باتری اجتماعی 🔋' },
];

export default function Moods() {
  const [params] = useSearchParams();
  const [mood, setMood] = useState(params.get('mood') ?? '');
  const [vals, setVals] = useState<Record<string, number>>({ energy: 5, stress: 5, sleep: 5, loveLevel: 5, socialBattery: 5 });
  const [supportWish, setSupportWish] = useState('');
  const [note, setNote] = useState('');
  const [today, setToday] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const nav = useNavigate();

  useEffect(() => {
    get('/api/moods/today').then((d) => {
      setToday(d);
      if (d.mine) {
        setMood(d.mine.mood);
        setVals({ energy: d.mine.energy, stress: d.mine.stress, sleep: d.mine.sleep, loveLevel: d.mine.loveLevel, socialBattery: d.mine.socialBattery });
        setSupportWish(d.mine.supportWish ?? '');
        setNote(d.mine.note ?? '');
      }
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!mood) { toast.push('error', 'اول حل امروزت رو انتخاب کن.'); return; }
    const body = { mood, ...vals, supportWish: supportWish || null, note: note || null };
    setBusy(true);
    if (!navigator.onLine) {
      enqueue({ path: '/api/moods', method: 'POST', body });
      toast.push('info', 'آفلاینی — ذخیره شد و بعداً همگام می‌شه 💾');
      setBusy(false);
      return;
    }
    try {
      await post('/api/moods', body);
      toast.push('success', 'ذخیره شد ❤️');
      nav('/dashboard');
    } catch (e) {
      if (e instanceof ApiError && !e.status) { enqueue({ path: '/api/moods', method: 'POST', body }); toast.push('info', 'در صف همگام‌سازی ذخیره شد.'); }
      else toast.push('error', (e as Error).message || 'اتصال به سرور برقرار نشد؛ دوباره تلاش کن.');
    } finally { setBusy(false); }
  };

  const partnerMood = today?.partner ? MoodMap[today.partner.mood] : null;

  return (
    <div>
      <PageHeader title="حال امروزت 💗" subtitle="چک‌این روزانه — فقط یک دقیقه" />
      <Glass className="p-6 space-y-6">
        <section>
          <div className="text-sm font-medium mb-3">امروز چه حالی داری؟</div>
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
            {Object.entries(MoodMap).map(([k, m]) => (
              <motion.button key={k} whileTap={{ scale: 0.9 }} onClick={() => setMood(k)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all ${mood === k ? 'bg-gradient-to-b from-rose-500/25 to-purple-500/20 ring-1 ring-rose-400/50' : 'hover:bg-white/8'}`}>
                <span className="text-2xl">{m.emoji}</span><span className="text-[10px] text-muted2">{m.label}</span>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {sliders.map((s) => (
            <div key={s.key}>
              <div className="flex justify-between text-xs text-muted2 mb-1.5">
                <span>{s.label}</span><span className="num text-cream">{fa(vals[s.key])}/۱۰</span>
              </div>
              <input type="range" min={1} max={10} value={vals[s.key]} onChange={(e) => setVals((v) => ({ ...v, [s.key]: +e.target.value }))}
                className="w-full accent-pink-400 h-1.5 cursor-pointer" dir="ltr" />
            </div>
          ))}
        </section>

        <section>
          <div className="text-sm font-medium mb-3">امروز چطور می‌تونم کنارت باشم؟</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SupportWishes).map(([k, label]) => (
              <button key={k} onClick={() => setSupportWish(supportWish === k ? '' : k)}
                className={`px-3.5 py-2 rounded-full text-xs border transition-all ${supportWish === k ? 'bg-gradient-to-l from-rose-500/30 to-purple-500/25 border-rose-400/50' : 'bg-white/5 border-white/10 text-muted2 hover:text-cream'}`}>
                {label}
              </button>
            ))}
          </div>
        </section>

        <Field label="یادداشت کوتاه (اختیاری)">
          <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="امروز چی توی دلمونه؟" />
        </Field>

        <Button className="w-full" size="lg" loading={busy} onClick={save}>ثبت حال امروزم ❤️</Button>
      </Glass>

      {partnerMood && (
        <Glass className="p-5 mt-4 flex items-center gap-4">
          <span className="text-3xl">{partnerMood.emoji}</span>
          <div>
            <div className="text-sm">پارتنرت امروز «{partnerMood.label}» ثبت کرده {today.partner.supportWish ? `— ${SupportWishes[today.partner.supportWish]}` : ''}</div>
            <Link to="/mood-history" className="text-xs text-purple-300">مشاهده‌ی نمودار حال دونفره →</Link>
          </div>
        </Glass>
      )}
    </div>
  );
}
