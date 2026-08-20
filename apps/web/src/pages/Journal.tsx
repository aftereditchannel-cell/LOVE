import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { get, post } from '../lib/api';
import { faDateShort, Moods } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, TextArea, Select, Modal, Empty, PageLoading, Chip } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, Lock, BookOpen } from 'lucide-react';

export default function Journal() {
  const [params, setParams] = useSearchParams();
  const [entries, setEntries] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(params.get('new') === '1');
  const [form, setForm] = useState({ title: '', content: '', mood: '', location: '', tags: '', visibility: 'shared', entryDate: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const nav = useNavigate();

  const load = (query = '') => get<{ entries: any[] }>(`/api/journal${query ? `?q=${encodeURIComponent(query)}` : ''}`)
    .then((d) => setEntries(d.entries)).catch((e) => toastError(toast.push, e));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = async () => null;
      const rr = await post<{ entry: any }>('/api/journal', { ...form, tags: form.tags.split('،').flatMap((t) => t.split(',')).map((t) => t.trim()).filter(Boolean), entryDate: form.entryDate || undefined });
      toast.push('success', 'ذخیره شد ❤️');
      setModal(false);
      nav(`/journal/${rr.entry.id}`);
    } catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="دفتر خاطرات 📓" subtitle="لحظه‌ها و حرف‌های نگفته"
        actions={<Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> یادداشت جدید</Button>} />
      <div className="flex gap-2 mb-4">
        <Input placeholder="جستجو در عنوان‌ها…" value={q} onChange={(e) => { setQ(e.target.value); load(e.target.value); }} />
      </div>
      {entries === null ? <PageLoading /> : !entries.length ? (
        <Empty emoji="📓" title="دفترتون هنوز خالیه" hint="اولین یادداشت مشترک‌تون رو بنویسید — برای آینده، برای خودتون ❤️"
          action={<Button onClick={() => setModal(true)}>شروع اولین یادداشت</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {entries.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/journal/${e.id}`}>
                <Glass className="p-5 h-full hover:bg-white/8 transition-colors">
                  <div className="flex items-center gap-2 text-[10px] text-muted2 mb-2">
                    <span className="num">{faDateShort(e.entryDate)}</span>
                    {e.visibility === 'private' && <span className="flex items-center gap-1 text-purple-300"><Lock size={10} /> خصوصی</span>}
                    {e.mood && <span>{Moods[e.mood]?.emoji}</span>}
                    <span className="mr-auto">{e.isMine ? '✍️ من' : '✍️ پارتنرم'}</span>
                  </div>
                  <div className="font-semibold mb-1.5">{e.title}</div>
                  <p className="text-xs text-muted2 leading-6 line-clamp-3">{e.content}</p>
                </Glass>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setParams({}); }} title="یادداشت جدید ✍️">
        <form onSubmit={save} className="space-y-3">
          <Field label="عنوان"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً عصر بارونی" /></Field>
          <Field label="متن"><TextArea required rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="بنویس…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="حال">
              <Select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}>
                <option value="">—</option>
                {Object.entries(Moods).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
              </Select>
            </Field>
            <Field label="تاریخ"><Input type="date" dir="ltr" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} /></Field>
            <Field label="مکان (اختیاری)"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="دید">
              <Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
                <option value="shared">🫶 مشترک</option>
                <option value="private">🔒 فقط خودم</option>
              </Select>
            </Field>
          </div>
          <Field label="برچسب‌ها (با ویرگول)"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="سفر، شب قشنگ" /></Field>
          <Button className="w-full" loading={busy}>ذخیره در دفتر 📖</Button>
        </form>
      </Modal>
    </div>
  );
}
