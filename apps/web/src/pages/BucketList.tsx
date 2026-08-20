import React, { useEffect, useState } from 'react';
import { get, post, patch, del } from '../lib/api';
import { fa } from '../lib/format';
import { Glass, Button, PageHeader, Empty, PageLoading, Modal, Field, Input } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, Check, Trash2, Trophy } from 'lucide-react';

export default function BucketList() {
  const [data, setData] = useState<any>(null);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get('/api/bucket-list').then(setData).catch((e) => toastError(toast.push, e));
  useEffect(() => { void load(); }, []);

  if (!data) return <PageLoading />;
  const { progress } = data;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await post('/api/bucket-list', { title }); toast.push('success', 'قول دادیم! 🏔️'); setModal(false); setTitle(''); load(); }
    catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="باکت‌لیست ما 🏔️" subtitle="کارهایی که باید با هم انجام بدیم"
        actions={<Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> مورد جدید</Button>} />

      <Glass className="p-5 mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-semibold flex items-center gap-2"><Trophy size={16} className="text-amber-300" /> پیشرفت ما</span>
          <span className="text-sm num text-purple-300">{fa(progress.done)} / {fa(progress.total)}</span>
        </div>
        <div className="h-3 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-l from-rose-400 to-purple-400 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[10px] text-muted2 mt-1.5">{fa(pct)}٪ از رویاهامون رو زندگی کردیم</div>
      </Glass>

      {!data.items.length ? (
        <Empty emoji="🏔️" title="لیستتون خالیه" hint="مثلاً: کمپ زیر ستاره‌ها، کنسرت، سفر خارجی…" action={<Button onClick={() => setModal(true)}>اولین قول</Button>} />
      ) : (
        <div className="space-y-2">
          {data.items.map((b: any) => (
            <Glass key={b.id} className={`p-3.5 flex items-center gap-3 group ${b.done ? 'opacity-55' : ''}`}>
              <button onClick={async () => { await patch(`/api/bucket-list/${b.id}`, { done: !b.done }); load(); }}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${b.done ? 'bg-amber-400/90 border-amber-300' : 'border-white/25 hover:border-rose-400'}`}>
                {b.done && <Check size={13} className="text-black" />}
              </button>
              <span className={`flex-1 text-sm ${b.done ? 'line-through' : ''}`}>{b.title}</span>
              <button onClick={async () => { await del(`/api/bucket-list/${b.id}`); load(); }}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-muted2 hover:text-rose-300"><Trash2 size={15} /></button>
            </Glass>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="قول جدید با هم 🏔️">
        <form onSubmit={add} className="space-y-3">
          <Field label="چه کاری رو می‌خواید با هم انجام بدید؟"><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً کمپ زیر ستاره‌های صحرا ⛺" /></Field>
          <Button className="w-full" loading={busy}>به لیست اضافه کن</Button>
        </form>
      </Modal>
    </div>
  );
}
