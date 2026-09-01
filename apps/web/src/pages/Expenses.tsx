import React, { useEffect, useState } from 'react';
import { get, post, del } from '../lib/api';
import { fa, faDateShort, todayKey } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, Select, Modal, Empty, PageLoading, Stat } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, Trash2, Scale, Wallet } from 'lucide-react';

const cats: Array<[string, string]> = [['food', 'خوراکی 🍕'], ['home', 'خانه 🏠'], ['travel', 'سفر ✈️'], ['fun', 'تفریح 🎡'], ['bills', 'قبوض 🧾'], ['gift', 'هدیه 🎁'], ['general', 'متفرقه']];

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[] | null>(null);
  const [balance, setBalance] = useState<any>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ amount: '', category: 'food', split: 'equal', note: '', date: todayKey() });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => {
    get<{ expenses: any[] }>('/api/expenses').then((d) => setExpenses(d.expenses)).catch((e) => toastError(toast.push, e));
    get('/api/expenses/balance').then(setBalance).catch(() => {});
  };
  useEffect(load, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await post('/api/expenses', { ...form, amount: +form.amount, note: form.note || null });
      toast.push('success', 'ثبت شد 🧾'); setModal(false);
      setForm({ amount: '', category: 'food', split: 'equal', note: '', date: todayKey() }); load();
    } catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  if (expenses === null || !balance) return <PageLoading />;

  return (
    <div>
      <PageHeader title="خرج‌های مشترک 💳" subtitle="بخش اختیاری — تسویه‌ی راحت بدون حرف‌های اضافی"
        actions={<Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> خرج جدید</Button>} />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat icon={<Scale size={19} />} label={balance.balance === 0 ? 'تسویه‌ایم 🤝' : balance.iAmOwed ? 'پارتنرم بدهکاره' : 'من بدهکارم'}
          value={balance.balance === 0 ? '€۰' : `€${fa(Math.abs(balance.balance))}`} accent={balance.balance < 0 ? 'rose' : 'purple'} />
        <Stat icon={<Wallet size={19} />} label="مجموع خرج‌ها" value={`€${fa(balance.totalSpent)}`} />
      </div>

      {!expenses.length ? (
        <Empty emoji="🧾" title="خرجی ثبت نشده" hint="اگه خرج‌های مشترک رو اینجا بنویسید، تسویه همیشه روشنه."
          action={<Button onClick={() => setModal(true)}>اولین خرج</Button>} />
      ) : (
        <div className="space-y-2">
          {expenses.map((x: any) => (
            <Glass key={x.id} className="p-3.5 flex items-center gap-3 group">
              <span className="text-xl">{cats.find(([k]) => k === x.category)?.[1]?.split(' ')[1] ?? '💳'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{x.note || cats.find(([k]) => k === x.category)?.[1]}</div>
                <div className="text-[10px] text-muted2 mt-0.5 num">{faDateShort(x.date)} • {x.split === 'equal' ? '۵۰/۵۰' : x.split === 'full_partner' ? 'روی حساب پارتنرم' : 'روی حساب خودم'}</div>
              </div>
              <div className="text-sm font-bold num text-purple-300">€{fa(x.amount)}</div>
              <button onClick={async () => { await del(`/api/expenses/${x.id}`); load(); }}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-muted2 hover:text-rose-300"><Trash2 size={15} /></button>
            </Glass>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="خرج جدید 🧾">
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="مبلغ (€)"><Input type="number" dir="ltr" min={0.01} step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="تاریخ"><Input type="date" dir="ltr" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="دسته"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{cats.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="تقسیم"><Select value={form.split} onChange={(e) => setForm({ ...form, split: e.target.value })}>
              <option value="equal">👫 نصفه‌نصفه</option>
              <option value="full_partner">💗 کامل روی حساب پارتنرم</option>
              <option value="full_mine">👤 کامل روی حساب خودم</option>
            </Select></Field>
          </div>
          <Field label="یادداشت"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="شام رستوران ایتالیایی" /></Field>
          <Button className="w-full" loading={busy}>ثبت خرج</Button>
        </form>
      </Modal>
    </div>
  );
}
