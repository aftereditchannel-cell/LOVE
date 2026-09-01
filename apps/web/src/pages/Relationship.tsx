import React, { useEffect, useState } from 'react';
import { get, post } from '../lib/api';
import { fa, faDateShort } from '../lib/format';
import { Glass, Button, PageHeader, PageLoading, LineChart, TextArea, Field } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Activity, Info } from 'lucide-react';

const axes: Array<[string, string]> = [
  ['communication', 'ارتباط و حرف‌زدن'], ['trust', 'اعتماد'], ['qualityTime', 'وقت باکیفیت'],
  ['affection', 'محبت و توجه'], ['fun', 'تفریح و خنده'], ['support', 'حمایت'],
];

export default function Relationship() {
  const [data, setData] = useState<any>(null);
  const [vals, setVals] = useState<Record<string, number>>({ communication: 7, trust: 7, qualityTime: 7, affection: 7, fun: 7, support: 7 });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get('/api/relationship/checkins').then(setData).catch(() => {});
  useEffect(() => { void load(); }, []);

  if (!data) return <PageLoading />;
  const series = data.checkins.slice().reverse().map((c: any) => c.average);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await post('/api/relationship/checkins', { ...vals, note: note || null }); toast.push('success', 'چک‌این ثبت شد 💚'); setNote(''); load(); }
    catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="سلامت رابطه 💚" subtitle="خودارزیابی دونفره — بدون قضاوت" />
      <div className="glass p-3.5 mb-4 flex gap-2.5 text-[11px] text-muted2 leading-6">
        <Info size={15} className="shrink-0 mt-0.5 text-sky-300" />
        این بخش فقط یه ابزار خود-بازبینی‌ه و اصلاً تشخیص روان‌شناختی یا پزشکی نیست؛ اگه جایی حس کردید کمک می‌خواید، مشاوره‌ی تخصصی بهترین انتخابه 💚
      </div>

      <Glass className="p-6 mb-4">
        <form onSubmit={submit} className="space-y-4">
          <div className="text-sm font-semibold flex items-center gap-2"><Activity size={16} className="text-emerald-300" /> این هفته رابطه‌مون چطور بود؟</div>
          {axes.map(([k, label]) => (
            <div key={k}>
              <div className="flex justify-between text-xs text-muted2 mb-1.5"><span>{label}</span><span className="num text-cream">{fa(vals[k])}/۱۰</span></div>
              <input dir="ltr" type="range" min={1} max={10} value={vals[k]} onChange={(e) => setVals((v) => ({ ...v, [k]: +e.target.value }))} className="w-full accent-emerald-400 h-1.5 cursor-pointer" />
            </div>
          ))}
          <Field label="یادداشت (اختیاری)"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="این هفته چی خوب بود؟" /></Field>
          <Button className="w-full" loading={busy}>ثبت چک‌این هفته</Button>
        </form>
      </Glass>

      <Glass className="p-5">
        <div className="text-sm font-semibold mb-3">روند میانگین ما</div>
        <LineChart points={series} color="#4ade80" />
      </Glass>

      {!!data.checkins.length && (
        <Glass className="p-5 mt-4">
          <div className="text-sm font-semibold mb-3">آخرین چک‌این‌ها</div>
          <div className="space-y-2">
            {data.checkins.slice(0, 6).map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-white/5 last:border-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.authorId === data.me ? 'bg-rose-500/15 text-rose-300' : 'bg-purple-500/15 text-purple-300'}`}>{c.authorId === data.me ? 'من' : 'پارتنرم'}</span>
                <span className="text-sm num text-emerald-300 font-bold">{fa(c.average)}/۱۰</span>
                <span className="text-[10px] text-muted2 mr-auto num">{faDateShort(c.createdAt)}</span>
              </div>
            ))}
          </div>
        </Glass>
      )}
    </div>
  );
}
