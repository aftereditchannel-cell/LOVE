import React, { useEffect, useState } from 'react';
import { get, post, del } from '../lib/api';
import { fa, faDate, todayKey } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, Select, Modal, Empty, PageLoading } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, Trash2 } from 'lucide-react';

const presets = ['💍', '🎂', '✈️', '💌', '🌹', '🎄', '🎉', '❤️'];

export default function Countdowns() {
  const [items, setItems] = useState<any[] | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', emoji: '❤️', targetDate: '', repeat: 'none' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get<{ countdowns: any[] }>('/api/countdowns').then((d) => setItems(d.countdowns)).catch((e) => toastError(toast.push, e));
  useEffect(() => { void load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await post('/api/countdowns', form); toast.push('success', 'شمارش معکوس ساخته شد ⏳'); setModal(false); setForm({ title: '', emoji: '❤️', targetDate: '', repeat: 'none' }); load(); }
    catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  if (items === null) return <PageLoading />;
  return (
    <div>
      <PageHeader title="شمارش معکوس ⏳" subtitle="روزهایی که دلمون براشون می‌تپه"
        actions={<Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> جدید</Button>} />
      {!items.length ? (
        <Empty emoji="⏳" title="شمارشی فعال نیست" hint="با ساخت یک شمارش معکوس، هیجانش رو زنده نگه دارید."
          action={<Button onClick={() => setModal(true)}>اولین شمارش</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((c) => (
            <Glass key={c.id} className="p-6 text-center relative overflow-hidden">
              <div className="text-4xl mb-2">{c.emoji}</div>
              <div className={`text-5xl font-black num ${c.daysLeft <= 7 ? 'text-rose-300' : 'text-purple-300'}`}>{fa(Math.max(0, c.daysLeft))}</div>
              <div className="text-xs text-muted2 mt-1">{c.daysLeft === 0 ? 'همین امروزه! 🎉' : c.daysLeft < 0 ? 'گذشت 🌙' : `روز تا ${c.title}`}</div>
              <div className="text-[10px] text-muted2 mt-1.5">{faDate(c.effectiveDate)}{c.repeat === 'yearly' ? ' • سالانه' : ''}</div>
              <button onClick={async () => { await del(`/api/countdowns/${c.id}`); load(); }}
                className="absolute top-3 left-3 p-1.5 rounded-full text-muted2 hover:text-rose-300 hover:bg-rose-500/10"><Trash2 size={14} /></button>
            </Glass>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="شمارش معکوس جدید ⏳">
        <form onSubmit={save} className="space-y-3">
          <Field label="عنوان"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="سالگردمون ❤️" /></Field>
          <Field label="ایموجی">
            <div className="flex gap-1.5 flex-wrap">
              {presets.map((p) => <button type="button" key={p} onClick={() => setForm({ ...form, emoji: p })} className={`text-2xl p-1.5 rounded-xl transition-all ${form.emoji === p ? 'bg-white/15 scale-110' : 'hover:bg-white/10'}`}>{p}</button>)}
            </div>
          </Field>
          <Field label="تاریخ مقصد"><Input type="date" dir="ltr" required min={todayKey()} value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></Field>
          <Field label="تکرار"><Select value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })}>
            <option value="none">یک‌بار</option><option value="yearly">هر سال (مثل تولد و سالگرد)</option>
          </Select></Field>
          <Button className="w-full" loading={busy}>بساز ⏳</Button>
        </form>
      </Modal>
    </div>
  );
}
