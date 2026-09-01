import React, { useEffect, useMemo, useState } from 'react';
import { get, post, patch, del } from '../lib/api';
import { fa, faDateFull, todayKey } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, TextArea, Select, Modal, PageLoading, Chip } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

const kinds = [['event', 'رویداد'], ['date', 'قرار'], ['birthday', 'تولد'], ['anniversary', 'سالگرد'], ['trip', 'سفر'], ['doctor', 'دکتر']] as const;
const colors = [['rose', '#f472b6'], ['purple', '#a78bfa'], ['amber', '#fbbf24'], ['green', '#4ade80'], ['sky', '#38bdf8']] as const;

const faWeekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']; // شنبه تا جمعه

export default function Calendar() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [events, setEvents] = useState<any[] | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ title: '', date: todayKey(), time: '', kind: 'event', color: 'rose', location: '', description: '', reminderMinutes: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const load = () => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const from = key(new Date(y, m, -7)), to = key(new Date(y, m + 1, 7));
    get<{ events: any[] }>(`/api/calendar/events?from=${from}&to=${to}`).then((d) => setEvents(d.events)).catch((e) => toastError(toast.push, e));
  };
  useEffect(load, [cursor]);

  const cells = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const days: Array<{ date: string | null; inMonth: boolean }> = [];
    const lead = (first.getDay() + 1) % 7; // شنبه=0
    for (let i = 0; i < lead; i++) days.push({ date: null, inMonth: false });
    const count = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= count; d++) days.push({ date: key(new Date(y, m, d)), inMonth: true });
    while (days.length % 7) days.push({ date: null, inMonth: false });
    return days;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const e of events ?? []) (map[e.date] ??= []).push(e);
    return map;
  }, [events]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { ...form, time: form.time || null, reminderMinutes: form.reminderMinutes ? +form.reminderMinutes : null, location: form.location || null, description: form.description || null };
      if (form.id) await patch(`/api/calendar/events/${form.id}`, payload);
      else await post('/api/calendar/events', payload);
      toast.push('success', 'رویداد ذخیره شد 📅');
      setModal(false); setForm({ title: '', date: todayKey(), time: '', kind: 'event', color: 'rose' });
      load();
    } catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  const monthName = cursor.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' });

  return (
    <div>
      <PageHeader title="تقویم دونفره 📅" subtitle="قرارها و روزهای مهم"
        actions={<Button size="sm" onClick={() => { setForm({ title: '', date: todayKey(), time: '', kind: 'event', color: 'rose' }); setModal(true); }}><Plus size={15} /> رویداد</Button>} />

      <Glass className="p-3 mb-4 flex items-center justify-between">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-white/10"><ChevronRight size={17} /></button>
        <div className="font-bold">{monthName}</div>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-white/10"><ChevronLeft size={17} /></button>
      </Glass>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted2 mb-1">
        {faWeekdays.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      {events === null ? <PageLoading /> : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            const evts = c.date ? byDate[c.date] ?? [] : [];
            const isToday = c.date === todayKey();
            return (
              <button key={i} disabled={!c.date}
                onClick={() => c.date && (setForm({ title: '', date: c.date, time: '', kind: 'event', color: 'rose' }), setModal(true))}
                className={`aspect-square rounded-xl p-1 flex flex-col items-center text-xs transition-all relative
                  ${!c.inMonth ? 'opacity-0 pointer-events-none' : 'hover:bg-white/10 glass !rounded-xl !p-1'}
                  ${isToday ? 'ring-1 ring-rose-400/70' : ''}`}>
                <span className={`num ${isToday ? 'text-rose-300 font-bold' : ''}`}>{c.date ? fa(+c.date.slice(8)) : ''}</span>
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {evts.slice(0, 3).map((e) => <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: (colors.find(([k]) => k === e.color)?.[1] as string) ?? '#f472b6' }} />)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* month list */}
      <Glass className="p-5 mt-4">
        <div className="text-sm font-semibold mb-3">رویدادهای این ماه</div>
        {(events ?? []).filter((e) => e.date.startsWith(key(cursor).slice(0, 7))).length === 0 && <div className="text-xs text-muted2 py-3">رویدادی این ماه نیست — یکی بساز 💑</div>}
        <div className="space-y-1.5">
          {(events ?? []).filter((e) => e.date.startsWith(key(cursor).slice(0, 7))).map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 group">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: (colors.find(([k]) => k === ev.color)?.[1] as string) ?? '#f472b6' }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{ev.title}</div>
                {ev.location && <div className="text-[10px] text-muted2">📍 {ev.location}</div>}
              </div>
              <span className="text-[11px] text-muted2 num">{ev.date}{ev.time ? ` • ${ev.time}` : ''}</span>
              <div className="hidden group-hover:flex gap-1">
                <button onClick={() => { setForm({ ...ev, reminderMinutes: ev.reminderMinutes ?? '' }); setModal(true); }} className="p-1.5 rounded-full hover:bg-white/10 text-muted2">✏️</button>
                <button onClick={async () => { await del(`/api/calendar/events/${ev.id}`); load(); }} className="p-1.5 rounded-full hover:bg-rose-500/15 text-muted2 hover:text-rose-300"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </Glass>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'ویرایش رویداد ✏️' : 'رویداد جدید 📅'}>
        <form onSubmit={save} className="space-y-3">
          <Field label="عنوان"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="قرار شام 🌹" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاریخ"><Input type="date" dir="ltr" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="ساعت"><Input type="time" dir="ltr" value={form.time ?? ''} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field>
            <Field label="نوع"><Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="رنگ"><Select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>{colors.map(([k]) => <option key={k} value={k}>{k}</option>)}</Select></Field>
          </div>
          <Field label="مکان"><Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="توضیح"><TextArea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="یادآوری (دقیقه قبل)"><Input type="number" dir="ltr" min={0} value={form.reminderMinutes ?? ''} onChange={(e) => setForm({ ...form, reminderMinutes: e.target.value })} placeholder="مثلاً ۶۰" /></Field>
          <Button className="w-full" loading={busy}>ذخیره</Button>
        </form>
      </Modal>
    </div>
  );
}
