import React, { useEffect, useState } from 'react';
import { get, post, patch, del } from '../lib/api';
import { fa } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, Select, Modal, Empty, PageLoading, Chip } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

const cats: Array<[string, string]> = [['things_i_want', 'چیزهایی که می‌خوام'], ['things_we_want', 'چیزهایی که با هم می‌خوایم'], ['places_we_want', 'جاهایی که می‌خوایم بریم'], ['things_to_do', 'کارهایی که می‌خوایم بکنیم'], ['dreams', 'رویاها']];
const statuses: Array<[string, string, string]> = [['wanted', 'می‌خوایم', 'text-rose-300'], ['planned', 'برنامه‌ریزی‌شده', 'text-amber-300'], ['done', 'انجام‌شد 🎉', 'text-emerald-300']];

export default function Wishlist() {
  const [items, setItems] = useState<any[] | null>(null);
  const [cat, setCat] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ title: '', category: 'things_we_want', price: '', link: '', priority: 'medium', mine: false });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get<{ items: any[] }>('/api/wishlist').then((d) => setItems(d.items)).catch((e) => toastError(toast.push, e));
  useEffect(() => { void load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await post('/api/wishlist', { ...form, price: form.price ? +form.price : null, link: form.link || null });
      toast.push('success', 'به آرزوها اضافه شد ✨'); setModal(false);
      setForm({ title: '', category: 'things_we_want', price: '', link: '', priority: 'medium', mine: false }); load();
    } catch { toastError(toast.push, { message: 'اطلاعات معتبر نیست (لینک را کامل وارد کن).' }); } finally { setBusy(false); }
  };

  if (items === null) return <PageLoading />;
  const shown = cat === 'all' ? items : items.filter((i) => i.category === cat);

  return (
    <div>
      <PageHeader title="جادوی آرزوها 🎁" subtitle="چیزهایی که به هم قولشون رو می‌دید"
        actions={<Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> آرزوی جدید</Button>} />
      <div className="flex gap-2 mb-4 flex-wrap">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>همه</Chip>
        {cats.map(([k, l]) => <Chip key={k} active={cat === k} onClick={() => setCat(k)}>{l}</Chip>)}
      </div>
      {!shown.length ? (
        <Empty emoji="🌠" title="آرزویی اینجا نیست" hint="اولین آرزوتون رو بنویسید تا دستیار ما برای سورپرایز پیشنهاد بده 😉"
          action={<Button onClick={() => setModal(true)}>نوشتن اولین آرزو</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {shown.map((w) => (
            <Glass key={w.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-6">{w.title}</div>
                  <div className="text-[11px] text-muted2 mt-1 flex gap-2 flex-wrap">
                    <span>{cats.find(([k]) => k === w.category)?.[1]}</span>
                    <span className={statuses.find(([k]) => k === w.status)?.[2]}>● {statuses.find(([k]) => k === w.status)?.[1]}</span>
                    {w.price != null && <span className="num">{fa(w.price)} {w.currency}</span>}
                    {w.ownerId && <span>👤 شخصی</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {w.link && <a href={w.link} target="_blank" rel="noreferrer" className="p-2 rounded-full hover:bg-white/10 text-muted2"><ExternalLink size={15} /></a>}
                  <button onClick={async () => { await del(`/api/wishlist/${w.id}`); load(); }} className="p-2 rounded-full text-muted2 hover:text-rose-300 hover:bg-rose-500/10"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                {statuses.map(([k, l]) => (
                  <button key={k} onClick={async () => { await patch(`/api/wishlist/${w.id}`, { status: k }); load(); }}
                    className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${w.status === k ? 'bg-white/20 text-cream' : 'bg-white/5 text-muted2 hover:bg-white/10'}`}>{l}</button>
                ))}
              </div>
            </Glass>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="آرزوی جدید ✨">
        <form onSubmit={save} className="space-y-3">
          <Field label="عنوان"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="دوربین فوری 📷" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="دسته"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{cats.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="قیمت تقریبی"><Input type="number" dir="ltr" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="اختیاری" /></Field>
            <Field label="لینک"><Input dir="ltr" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" /></Field>
            <Field label="اولویت"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">کم</option><option value="medium">متوسط</option><option value="high">زیاد</option>
            </Select></Field>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted2">
            <input type="checkbox" checked={form.mine} onChange={(e) => setForm({ ...form, mine: e.target.checked })} className="accent-pink-400" />
            آرزوی شخصی منه (واسه‌ی من، نه مشترک)
          </label>
          <Button className="w-full" loading={busy}>به لیست اضافه کن ✨</Button>
        </form>
      </Modal>
    </div>
  );
}
