import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { get, post } from '../lib/api';
import { fa } from '../lib/format';
import { Glass, Button, PageHeader, TextArea, PageLoading } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { HelpCircle, Send, History } from 'lucide-react';

export default function Questions() {
  const [today, setToday] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => {
    get('/api/questions/today').then(setToday).catch(() => {});
    get('/api/questions/history').then((d) => setHistory(d.history)).catch(() => {});
  };
  useEffect(load, []);

  if (today === null || history === null) return <PageLoading />;
  const q = today.question;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q) return;
    setBusy(true);
    try { await post(`/api/questions/${q.id}/answer`, { answer }); toast.push('success', 'جوابت ثبت شد 💌'); setAnswer(''); load(); }
    catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="سؤال امروز ما 💬" subtitle="هر روز یه گفتگوی جدید" />
      {q && (
        <Glass className="p-6 mb-5 text-center relative overflow-hidden">
          <motion.div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/15 blur-[50px] rounded-full" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 7, repeat: Infinity }} />
          <HelpCircle size={26} className="mx-auto text-purple-300 mb-3" />
          <div className="text-lg font-bold leading-9 relative">{q.text}</div>
          <div className="mt-5 relative">
            {today.myAnswer ? (
              <div className="space-y-3 text-right">
                <div className="glass p-3.5">
                  <div className="text-[10px] text-rose-300 mb-1">جواب من 💗</div>
                  <div className="text-sm leading-7">{today.myAnswer}</div>
                </div>
                {today.partnerAnswer ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass p-3.5">
                    <div className="text-[10px] text-purple-300 mb-1">جواب پارتنرم 💜</div>
                    <div className="text-sm leading-7">{today.partnerAnswer}</div>
                  </motion.div>
                ) : (
                  <div className="text-xs text-muted2 py-2">جواب پارتنرت وقتی ثبت بشه، اینجا میاد — جواب اون هم تا تو جواب ندی فاش نمی‌شه 😉</div>
                )}
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <TextArea rows={3} required value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="جوابتو بنویس… (جواب پارتنرت تا تو ننویسی فاش نمی‌شه 🤫)" />
                <Button loading={busy}><Send size={15} /> ثبت جواب</Button>
              </form>
            )}
          </div>
        </Glass>
      )}

      <div className="flex items-center gap-2 text-sm font-semibold mb-3"><History size={16} className="text-rose-300" /> آرشیو سؤال‌ها</div>
      {!history.length ? <div className="text-xs text-muted2 py-4">هنوز تاریخچه‌ای نیست.</div> : (
        <div className="space-y-2.5">
          {history.map((h: any) => (
            <Glass key={h.id} className="p-4">
              <div className="text-sm font-medium mb-2.5">{h.text}</div>
              <div className="space-y-1.5">
                {h.answers.map((a: any, i: number) => (
                  <div key={i} className="text-xs leading-6 text-muted2">
                    <span className={a.userId ? 'text-rose-300' : ''}>•</span> {a.answer}
                  </div>
                ))}
              </div>
            </Glass>
          ))}
        </div>
      )}
    </div>
  );
}
