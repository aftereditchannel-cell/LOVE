import React, { useEffect, useState } from 'react';
import { get, post } from '../lib/api';
import { faDateShort } from '../lib/format';
import { Glass, Button, PageHeader, TextArea, Field, PageLoading, Chip } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Sparkles, HeartHandshake } from 'lucide-react';

export default function Compliments() {
  const [tab, setTab] = useState<'compliment' | 'gratitude'>('compliment');
  const [items, setItems] = useState<any[] | null>(null);
  const [me, setMe] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get<{ items: any[]; me: string }>(`/api/compliments?type=${tab}`).then((d) => { setItems(d.items); setMe(d.me); }).catch(() => {});
  useEffect(() => { void load(); }, [tab]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await post('/api/compliments', { type: tab, text });
      toast.push('success', tab === 'compliment' ? 'تعریفت ثبت شد 😊' : 'قدردانیت ثبت شد 🌷');
      setText(''); load();
    } catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  if (items === null) return <PageLoading />;
  return (
    <div className="max-w-2xl">
      <PageHeader title="قدردانی و تعریف 🌷" subtitle="خوبی‌ها رو بگیم که تکرار بشن" />
      <div className="flex gap-2 mb-4">
        <Chip active={tab === 'compliment'} onClick={() => setTab('compliment')}>😊 تعریف از پارتنرم</Chip>
        <Chip active={tab === 'gratitude'} onClick={() => setTab('gratitude')}>🙏 چیزهایی که بابتشون ممنونم</Chip>
      </div>

      <Glass className="p-5 mb-4">
        <form onSubmit={submit} className="space-y-3">
          <Field label={tab === 'compliment' ? 'امروز یه چیز خوب درباره‌ی پارتنرت بنویس:' : 'امروز بابت چی ازش ممنونی؟'}>
            <TextArea required rows={2} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={tab === 'compliment' ? 'مثلاً: حوصله‌ش وقتی بهم گوش می‌ده بی‌نظیره…' : 'مثلاً: ممنون که دیروز کار خونه رو خودت انجام دادی…'} />
          </Field>
          <Button loading={busy}><Sparkles size={15} /> ثبت کن</Button>
        </form>
      </Glass>

      {!items.length ? (
        <div className="glass p-8 text-center text-sm text-muted2">آرشیو هنوز خالیه — اولین مورد رو تو بنویس {tab === 'compliment' ? '😊' : '🌷'}</div>
      ) : (
        <div className="space-y-2">
          {items.map((c: any) => (
            <Glass key={c.id} className="p-4 flex items-start gap-3">
              <span className={c.authorId === me ? 'text-rose-300' : 'text-purple-300'}><HeartHandshake size={18} /></span>
              <div className="flex-1">
                <div className="text-sm leading-7">{c.text}</div>
                <div className="text-[10px] text-muted2 mt-1">{c.authorId === me ? 'از من' : 'از پارتنرم'} • {faDateShort(c.createdAt)}</div>
              </div>
            </Glass>
          ))}
        </div>
      )}
    </div>
  );
}
