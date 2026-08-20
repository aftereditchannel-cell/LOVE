import React, { useEffect, useState } from 'react';
import { get, post, patch, del } from '../lib/api';
import { fa, faDate, daysUntil, todayKey } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, TextArea, Modal, Toggle, Empty, PageLoading, Chip } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Droplets, Flower2, Egg, CalendarHeart, Plus, Trash2, LockKeyhole } from 'lucide-react';

export default function Period() {
  const [settings, setSettings] = useState<any>(null);
  const [cycles, setCycles] = useState<any[] | null>(null);
  const [pred, setPred] = useState<any>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ startDate: todayKey(), endDate: '', cycleLength: '28', notes: '' });
  const [symModal, setSymModal] = useState<string | null>(null);
  const [sym, setSym] = useState({ date: todayKey(), pain: 0, energy: 5, mood: '', cravings: '', sleep: 5, headache: false, bloating: false, skin: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => {
    get('/api/period/settings').then(setSettings).catch(() => {});
    get('/api/period/cycles').then((d) => setCycles(d.cycles)).catch(() => {});
    get('/api/period/prediction').then((d) => setPred(d.prediction)).catch(() => {});
  };
  useEffect(load, []);

  if (settings === null || cycles === null) return <PageLoading />;

  if (!settings.enabled) {
    return (
      <div>
        <PageHeader title="سلامت چرخه 🌸" subtitle="خصوصی، اختیاری و رمزنگاری‌شده" />
        <Empty emoji="🌷" title="این بخش برای پیگیری چرخه‌ی ماهانه و PMS است"
          hint="کاملاً اختیاری و فقط برای خودته؛ داده‌ها رمزنگاری می‌شن و حتی پارتنرت به جزئیاتش دسترسی نداره (فقط یادآوری‌هایی که خودت بخوای به اشتراک گذاشته می‌شن). این ابزار جای پزشک نیست."
          action={<Button onClick={async () => { await patch('/api/period/settings', { enabled: true }); load(); toast.push('success', 'فعال شد 🌸'); }}>فعال‌سازی پیگیری چرخه</Button>} />
      </div>
    );
  }

  const addCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await post('/api/period/cycles', { startDate: form.startDate, endDate: form.endDate || null, cycleLength: +form.cycleLength || 28, notes: form.notes || null });
      toast.push('success', 'چرخه ثبت شد 🌸');
      setModal(false); setForm({ startDate: todayKey(), endDate: '', cycleLength: '28', notes: '' }); load();
    } catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  const addSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await post(`/api/period/cycles/${symModal}/symptoms`, { ...sym, date: sym.date });
      toast.push('success', 'علائم ثبت شد ✅');
      setSymModal(null); load();
    } catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  const phaseCards = pred ? [
    { icon: Flower2, label: 'PMS', range: `${faDate(pred.pmsStart)} تا ${faDate(pred.pmsEnd)}`, color: 'text-purple-300' },
    { icon: Egg, label: 'تخمک‌گذاری (تقریبی)', range: faDate(pred.ovulation), color: 'text-amber-300' },
    { icon: Droplets, label: 'پریود بعدی (تقریبی)', range: `${faDate(pred.nextStart)} • ${fa(pred.daysUntilNext)} روز دیگه`, color: 'text-rose-300' },
  ] : [];

  return (
    <div>
      <PageHeader title="سلامت چرخه 🌸" subtitle="فقط برای خودت — رمزنگاری‌شده و خصوصی"
        actions={<Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> چرخه‌ی جدید</Button>} />

      <div className="glass p-3.5 mb-4 flex items-start gap-2.5 text-[11px] text-muted2 leading-6">
        <LockKeyhole size={15} className="text-emerald-300 shrink-0 mt-0.5" />
        یادداشت‌ها با رمزنگاری AES-256 ذخیره می‌شن. این پیش‌بینی‌ها صرفاً یادآوری تقریبی‌ان و تشخیص پزشکی نیستن؛ در صورت نیاز حتماً با پزشک مشورت کن.
      </div>

      {pred && (
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          {phaseCards.map((c) => (
            <Glass key={c.label} className="p-4">
              <c.icon size={20} className={c.color} />
              <div className="text-xs text-muted2 mt-2">{c.label}</div>
              <div className="text-sm font-medium mt-1 leading-6">{c.range}</div>
            </Glass>
          ))}
        </div>
      )}

      {!cycles.length ? (
        <Empty emoji="🌙" title="هنوز چرخه‌ای ثبت نشده" hint="با ثبت اولین چرخه، پیش‌بینی تقریبی برات ساخته می‌شه."
          action={<Button onClick={() => setModal(true)}>ثبت اولین چرخه</Button>} />
      ) : (
        <div className="space-y-2.5">
          {cycles.map((c: any) => (
            <Glass key={c.id} className="p-4 flex flex-wrap items-center gap-3">
              <Droplets size={18} className="text-rose-300" />
              <div className="flex-1 min-w-[160px]">
                <div className="text-sm font-medium">{faDate(c.startDate)} {c.endDate ? `→ ${faDate(c.endDate)}` : '(در جریان)'}</div>
                <div className="text-[11px] text-muted2 mt-0.5">چرخه‌ی {fa(c.cycleLength)} روزه {c.notes ? '• 📝 یادداشت داره' : ''}</div>
              </div>
              <Button size="sm" variant="soft" onClick={() => setSymModal(c.id)}>ثبت علائم</Button>
              <button onClick={async () => { await del(`/api/period/cycles/${c.id}`); load(); }} className="p-2 rounded-full hover:bg-rose-500/15 text-muted2 hover:text-rose-300"><Trash2 size={16} /></button>
            </Glass>
          ))}
        </div>
      )}

      {/* prefs */}
      <Glass className="p-5 mt-4 space-y-3">
        <div className="text-sm font-semibold mb-1 flex items-center gap-2"><CalendarHeart size={16} className="text-rose-300" /> یادآوری‌های شخصی</div>
        <Toggle checked={settings.notifPeriod} label="یادآوری نزدیک‌شدن پریود" onChange={async (v) => { await patch('/api/period/settings', { notifPeriod: v }); load(); }} />
        <Toggle checked={settings.notifPms} label="«احتمالاً روزهای سخت نزدیکه؛ بیشتر حواسم بهت باشه ❤️»" onChange={async (v) => { await patch('/api/period/settings', { notifPms: v }); load(); }} />
      </Glass>

      <Modal open={modal} onClose={() => setModal(false)} title="ثبت چرخه‌ی جدید 🩸">
        <form onSubmit={addCycle} className="space-y-3">
          <Field label="تاریخ شروع"><Input type="date" dir="ltr" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="تاریخ پایان (اختیاری)"><Input type="date" dir="ltr" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          <Field label="طول چرخه (روز)"><Input type="number" dir="ltr" min={15} max={60} value={form.cycleLength} onChange={(e) => setForm({ ...form, cycleLength: e.target.value })} /></Field>
          <Field label="یادداشت (رمزنگاری‌شده)"><TextArea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="چیزی که می‌خوای یادت بمونه…" /></Field>
          <Button className="w-full" loading={busy}>ثبت</Button>
        </form>
      </Modal>

      <Modal open={!!symModal} onClose={() => setSymModal(null)} title="ثبت علائم امروز 🌡️">
        <form onSubmit={addSymptom} className="space-y-3">
          <Field label="تاریخ"><Input type="date" dir="ltr" required value={sym.date} onChange={(e) => setSym({ ...sym, date: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={`درد ${fa(sym.pain)}/۱۰`}><Input dir="ltr" type="range" min={0} max={10} value={sym.pain} onChange={(e) => setSym({ ...sym, pain: +e.target.value })} className="accent-pink-400" /></Field>
            <Field label={`انرژی ${fa(sym.energy)}/۱۰`}><Input dir="ltr" type="range" min={1} max={10} value={sym.energy} onChange={(e) => setSym({ ...sym, energy: +e.target.value })} className="accent-purple-400" /></Field>
            <Field label={`خواب ${fa(sym.sleep)}/۱۰`}><Input dir="ltr" type="range" min={1} max={10} value={sym.sleep} onChange={(e) => setSym({ ...sym, sleep: +e.target.value })} className="accent-sky-400" /></Field>
          </div>
          <Field label="حال‌وهوا"><Input value={sym.mood} onChange={(e) => setSym({ ...sym, mood: e.target.value })} placeholder="مثلاً بی‌قرار، آروم…" /></Field>
          <Field label="اشتهای عجیب‌وغریب"><Input value={sym.cravings} onChange={(e) => setSym({ ...sym, cravings: e.target.value })} placeholder="شکلات؟ 🍫" /></Field>
          <div className="flex gap-4 pt-1">
            <Toggle checked={sym.headache} label="سردرد" onChange={(v) => setSym({ ...sym, headache: v })} />
            <Toggle checked={sym.bloating} label="نفخ" onChange={(v) => setSym({ ...sym, bloating: v })} />
          </div>
          <Field label="وضع پوست"><Input value={sym.skin} onChange={(e) => setSym({ ...sym, skin: e.target.value })} /></Field>
          <Field label="یادداشت"><TextArea rows={2} value={sym.notes} onChange={(e) => setSym({ ...sym, notes: e.target.value })} /></Field>
          <Button className="w-full" loading={busy}>ثبت علائم</Button>
        </form>
      </Modal>
    </div>
  );
}
