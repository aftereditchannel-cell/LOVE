import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get, post, patch, del } from '../lib/api';
import { faDateShort } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, Select, Modal, Empty, PageLoading, Chip } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, Trash2, Check } from 'lucide-react';

const cats: Array<[string, string]> = [['general', 'عمومی'], ['shopping', 'خرید'], ['house', 'خانه'], ['planning', 'برنامه‌ریزی'], ['travel', 'سفر'], ['bills', 'قبوض'], ['projects', 'پروژه‌ها']];
const priorities: Array<[string, string, string]> = [['low', 'کم', 'text-emerald-300'], ['medium', 'متوسط', 'text-amber-300'], ['high', 'زیاد', 'text-rose-300']];

export default function Tasks() {
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<any[] | null>(null);
  const [modal, setModal] = useState(params.get('new') === '1');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', category: 'general', assignee: 'both', priority: 'medium', dueDate: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get<{ tasks: any[] }>('/api/tasks').then((d) => setTasks(d.tasks)).catch((e) => toastError(toast.push, e));
  useEffect(() => { void load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await post('/api/tasks', { ...form, dueDate: form.dueDate || null }); toast.push('success', 'کار اضافه شد ✅'); setModal(false); setForm({ title: '', category: 'general', assignee: 'both', priority: 'medium', dueDate: '' }); setParams({}); load(); }
    catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  const toggle = async (t: any) => { await patch(`/api/tasks/${t.id}`, { done: !t.done }); load(); };

  if (tasks === null) return <PageLoading />;
  const shown = tasks.filter((t) => filter === 'all' ? true : filter === 'open' ? !t.done : t.done);
  const assignLabel: Record<string, string> = { me: '👤 من', partner: '💗 پارتنرم', both: '👫 هردومون' };

  return (
    <div>
      <PageHeader title="کارهای مشترک ✅" subtitle="تقسیم کار، بدون جنگ 😄"
        actions={<Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> کار جدید</Button>} />
      <div className="flex gap-2 mb-4">
        {[['all', 'همه'], ['open', 'باز'], ['done', 'انجام‌شده']].map(([k, l]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}
      </div>
      {!shown.length ? (
        <Empty emoji="✅" title={filter === 'done' ? 'هنوز کاری انجام نشده — شروع کنید! 💪' : 'کاری باز نیست'} hint="کارهای دونفره رو اینجا مدیریت کنید."
          action={<Button onClick={() => setModal(true)}>افزودن کار</Button>} />
      ) : (
        <div className="space-y-2">
          {shown.map((t) => (
            <Glass key={t.id} className={`p-3.5 flex items-center gap-3 group ${t.done ? 'opacity-55' : ''}`}>
              <button onClick={() => toggle(t)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${t.done ? 'bg-emerald-500/80 border-emerald-400' : 'border-white/25 hover:border-rose-400'}`}>
                {t.done && <Check size={13} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${t.done ? 'line-through' : ''}`}>{t.title}</div>
                <div className="text-[10px] text-muted2 mt-0.5 flex gap-2 flex-wrap">
                  <span>{assignLabel[t.assignee]}</span>
                  <span className={priorities.find(([k]) => k === t.priority)?.[2]}>● {priorities.find(([k]) => k === t.priority)?.[1]}</span>
                  <span>{cats.find(([k]) => k === t.category)?.[1]}</span>
                  {t.dueDate && <span className="num">⏰ {faDateShort(t.dueDate)}</span>}
                </div>
              </div>
              <button onClick={async () => { await del(`/api/tasks/${t.id}`); load(); }}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-muted2 hover:text-rose-300 hover:bg-rose-500/10 transition-opacity"><Trash2 size={15} /></button>
            </Glass>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => { setModal(false); setParams({}); }} title="کار جدید ✅">
        <form onSubmit={save} className="space-y-3">
          <Field label="عنوان"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="خرید هفتگی" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="دسته"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{cats.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="واگذار به"><Select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
              <option value="both">👫 هردومون</option><option value="me">👤 من</option><option value="partner">💗 پارتنرم</option>
            </Select></Field>
            <Field label="اولویت"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="موعد"><Input type="date" dir="ltr" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          </div>
          <Button className="w-full" loading={busy}>اضافه کن</Button>
        </form>
      </Modal>
    </div>
  );
}
