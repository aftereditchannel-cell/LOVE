import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { get, post } from '../lib/api';
import { faDate, faDateShort, fa } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, TextArea, Select, Modal, Empty, PageLoading, Chip, Tag } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, LayoutGrid, ListOrdered, Image as ImageIcon, MapPin } from 'lucide-react';

const milestones = [
  ['first_date', 'اولین قرار'], ['first_trip', 'اولین سفر'], ['first_gift', 'اولین هدیه'],
  ['first_kiss', 'اولین بوسه'], ['met_day', 'روز آشنایی'], ['birthday', 'تولد'], ['anniversary', 'سالگرد'], ['other', 'دیگر'],
] as const;

type ViewMode = 'grid' | 'timeline' | 'polaroid';

export default function Memories() {
  const [params, setParams] = useSearchParams();
  const [memories, setMemories] = useState<any[] | null>(null);
  const [view, setView] = useState<ViewMode>('polaroid');
  const [modal, setModal] = useState(params.get('new') === '1');
  const [form, setForm] = useState({ title: '', date: '', location: '', description: '', milestone: '', tags: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const nav = useNavigate();

  const load = () => get<{ memories: any[] }>('/api/memories').then((d) => setMemories(d.memories)).catch((e) => toastError(toast.push, e));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await post<{ memory: any }>('/api/memories', {
        ...form,
        milestone: form.milestone || null,
        tags: form.tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
      });
      toast.push('success', 'خاطره ثبت شد ❤️');
      setModal(false);
      nav(`/memories/${r.memory.id}`);
    } catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  const views: Array<[ViewMode, React.ReactNode]> = [['polaroid', <ImageIcon size={15} />], ['grid', <LayoutGrid size={15} />], ['timeline', <ListOrdered size={15} />]];

  return (
    <div>
      <PageHeader title="خاطرات ما 📸" subtitle="هر لحظه‌ای که ساختیم، اینجا زنده‌ست"
        actions={<>
          <div className="glass p-1 flex gap-0.5">{views.map(([m, ic]) => <button key={m} onClick={() => setView(m)} className={`p-1.5 rounded-lg transition-colors ${view === m ? 'bg-rose-500/25 text-rose-300' : 'text-muted2'}`}>{ic}</button>)}</div>
          <Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> خاطره‌ی جدید</Button>
        </>} />

      {memories === null ? <PageLoading /> : !memories.length ? (
        <Empty emoji="📷" title="هنوز خاطره‌ای ثبت نکردید" hint="اولین لحظه‌تون رو اینجا ثبت کنید ❤️"
          action={<Button onClick={() => setModal(true)}>ثبت اولین خاطره</Button>} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {memories.map((m, i) => <MemoryCard key={m.id} m={m} i={i} />)}
        </div>
      ) : view === 'timeline' ? (
        <div className="relative pr-6 space-y-4 before:absolute before:right-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-rose-400/50 before:to-purple-400/40">
          {memories.slice().sort((a, b) => b.date.localeCompare(a.date)).map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
              <span className="absolute -right-[1.35rem] top-4 w-3 h-3 rounded-full bg-gradient-to-l from-rose-400 to-purple-400 shadow-glow" />
              <Link to={`/memories/${m.id}`}>
                <Glass className="p-4 hover:bg-white/8 transition-colors">
                  <div className="text-[10px] text-muted2 num mb-1">{faDate(m.date)}</div>
                  <div className="font-medium text-sm">{m.title}</div>
                  {m.location && <div className="text-[11px] text-muted2 flex items-center gap-1 mt-1"><MapPin size={11} /> {m.location}</div>}
                </Glass>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {memories.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 18, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: (i % 2 ? 1.6 : -1.6) }} whileHover={{ rotate: 0, scale: 1.03 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/memories/${m.id}`}>
                <div className="bg-white text-zinc-800 rounded-md p-2.5 pb-4 shadow-card">
                  <div className="aspect-square rounded-sm bg-gradient-to-br from-rose-200 via-purple-100 to-indigo-200 overflow-hidden flex items-center justify-center">
                    {m.media[0]?.url && m.media[0].type === 'image'
                      ? <img src={m.media[0].url} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
                      : <span className="text-5xl">{['🌹', '💞', '📸', '🌄', '🎡', '☕'][i % 6]}</span>}
                  </div>
                  <div className="pt-2.5 px-1 text-xs font-medium truncate">{m.title}</div>
                  <div className="px-1 text-[10px] text-zinc-500 num">{faDateShort(m.date)}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setParams({}); }} title="خاطره‌ی جدید 📸">
        <form onSubmit={save} className="space-y-3">
          <Field label="عنوان"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً اولین بار که…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاریخ"><Input type="date" dir="ltr" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="مایل‌استون">
              <Select value={form.milestone} onChange={(e) => setForm({ ...form, milestone: e.target.value })}>
                <option value="">—</option>
                {milestones.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="مکان"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="شرح"><TextArea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="برچسب‌ها"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="سفر، کوه" /></Field>
          <Button className="w-full" loading={busy}>ثبت خاطره ❤️</Button>
        </form>
      </Modal>
    </div>
  );
}

function MemoryCard({ m, i }: { m: any; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
      <Link to={`/memories/${m.id}`}>
        <Glass className="overflow-hidden hover:bg-white/8 transition-colors">
          <div className="aspect-[4/3] bg-gradient-to-br from-rose-500/15 to-purple-500/15 flex items-center justify-center overflow-hidden">
            {m.media[0]?.url && m.media[0].type === 'image' ? <img src={m.media[0].url} className="w-full h-full object-cover" loading="lazy" /> : <span className="text-4xl">💞</span>}
          </div>
          <div className="p-3">
            <div className="text-sm font-medium truncate">{m.title}</div>
            <div className="text-[10px] text-muted2 num mt-0.5">{faDateShort(m.date)}</div>
          </div>
        </Glass>
      </Link>
    </motion.div>
  );
}
