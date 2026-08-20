import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { get, put } from '../lib/api';
import { LangLabels } from '../lib/format';
import { Glass, Button, PageHeader, PageLoading, Empty } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Heart, MessageSquareHeart, Clock4, HandHeart, Gift, Handshake } from 'lucide-react';

const langs: Array<{ key: string; icon: any; desc: string }> = [
  { key: 'words', icon: MessageSquareHeart, desc: 'جمله‌های تأییدکننده و محبت‌آمیز' },
  { key: 'time', icon: Clock4, desc: 'وقت‌گذراندن باکیفیت و بدون حواس‌پرتی' },
  { key: 'service', icon: HandHeart, desc: 'کمک کردن و سبک‌کردن بار کارها' },
  { key: 'gifts', icon: Gift, desc: 'هدیه‌های کوچیک و فکرشده' },
  { key: 'touch', icon: Handshake, desc: 'تماس فیزیکی، بغل و دست‌دادن' },
];

export default function LoveLanguage() {
  const [data, setData] = useState<any>(null);
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get('/api/love-language').then((d) => { setData(d); setPrimary(d.mine?.primary ?? ''); setSecondary(d.mine?.secondary ?? ''); }).catch(() => {});
  useEffect(() => { void load(); }, []);

  if (!data) return <PageLoading />;

  const save = async () => {
    if (!primary) { toast.push('error', 'زبان اصلیت رو انتخاب کن.'); return; }
    setBusy(true);
    try { await put('/api/love-language', { primary, secondary: secondary || null }); toast.push('success', 'زبان عشقت ثبت شد 💗'); load(); }
    catch (e) { toastError(toast.push, e); } finally { setBusy(false); }
  };

  const tipFor = (k: string) => ({
    words: 'امروز یه جمله‌ی قشنگ و مشخص درباره‌ش بگو؛ مثلاً «واقعاً بهت افتخار می‌کنم چون…»',
    time: '۳۰ دقیقه‌ی بدون موبایل، فقط شما دو نفر — همین امشب برنامه‌ریزی کن.',
    service: 'یکی از کارهای روزمره‌ش رو امروز تو انجام بده، بدون اینکه بگه.',
    gifts: 'یه چیز کوچیک ولی با معنی براش بگیر؛ پیامش مهمه نه قیمتش.',
    touch: 'یک بغل ۲۰ ثانیه‌ای! تحقیق می‌گه معجزه می‌کنه 🤗',
  } as Record<string, string>)[k];

  return (
    <div className="max-w-2xl">
      <PageHeader title="زبان عشق من 💗" subtitle="بگو چطور عشق رو بهتر حس می‌کنی" />
      <Glass className="p-6">
        <div className="text-sm font-medium mb-4">زبان اصلی عشقم کدومه؟</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {langs.map((l) => (
            <motion.button key={l.key} whileTap={{ scale: 0.96 }} onClick={() => setPrimary(l.key)}
              className={`p-4 rounded-2xl border text-center transition-all ${primary === l.key ? 'bg-gradient-to-b from-rose-500/25 to-purple-500/20 border-rose-400/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
              <l.icon size={22} className={`mx-auto mb-2 ${primary === l.key ? 'text-rose-300' : 'text-muted2'}`} />
              <div className="text-xs font-medium">{LangLabels[l.key]}</div>
              <div className="text-[10px] text-muted2 mt-1 leading-5">{l.desc}</div>
            </motion.button>
          ))}
        </div>
        <div className="text-sm font-medium mt-6 mb-3">زبان دومم (اختیاری)</div>
        <div className="flex gap-2 flex-wrap">
          {langs.filter((l) => l.key !== primary).map((l) => (
            <button key={l.key} onClick={() => setSecondary(secondary === l.key ? '' : l.key)}
              className={`px-3.5 py-2 rounded-full text-xs border transition-all ${secondary === l.key ? 'bg-purple-500/25 border-purple-400/50' : 'bg-white/5 border-white/10 text-muted2'}`}>
              {LangLabels[l.key]}
            </button>
          ))}
        </div>
        <Button className="w-full mt-6" loading={busy} onClick={save}>ثبت زبان عشقم 💗</Button>
      </Glass>

      {data.partner ? (
        <Glass className="p-5 mt-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2"><Heart size={16} className="text-rose-300" /> زبان عشق پارتنرم</div>
          <div className="text-sm">«{LangLabels[data.partner.primary]}»{data.partner.secondary ? ` + «${LangLabels[data.partner.secondary]}»` : ''}</div>
          <div className="text-xs text-purple-300 mt-2.5 leading-6">💡 {tipFor(data.partner.primary)}</div>
        </Glass>
      ) : (
        <div className="mt-4"><Empty emoji="💌" title="پارتنرت هنوز انتخاب نکرده" hint="وقتی زبان عشقش رو مشخص کنه، سیستم بهت پیشنهادهای دقیق‌تر می‌ده." /></div>
      )}
    </div>
  );
}
