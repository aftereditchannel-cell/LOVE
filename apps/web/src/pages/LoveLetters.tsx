import React, { useEffect, useState } from 'react';
import { get, post, del } from '../lib/api';
import { faDate, fa, todayKey } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, TextArea, Modal, Empty, PageLoading, Tag } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, Mail, MailOpen, Trash2, Lock } from 'lucide-react';

export default function LoveLetters() {
  const [letters, setLetters] = useState<any[] | null>(null);
  const [modal, setModal] = useState(false);
  const [reading, setReading] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', openAt: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get<{ letters: any[] }>('/api/love-letters').then((d) => setLetters(d.letters)).catch((e) => toastError(toast.push, e));
  useEffect(() => { void load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await post('/api/love-letters', { ...form, openAt: form.openAt || null });
      toast.push('success', form.openAt ? 'نامه مُهروموم شد 💌' : 'نامه ثبت شد 💌');
      setModal(false); setForm({ title: '', content: '', openAt: '' }); load();
    } catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  const openLetter = async (l: any) => {
    if (l.sealed && !l.isMine) { toast.push('info', `این نامه تا ${faDate(l.openAt)} مُهرومومه 🔒`); return; }
    try { const r = await post<any>(`/api/love-letters/${l.id}/open`); setReading(r.letter); load(); }
    catch (e) { toastError(toast.push, e); }
  };

  if (letters === null) return <PageLoading />;
  return (
    <div className="max-w-3xl">
      <PageHeader title="نامه‌های عاشقانه 💌" subtitle="حرف‌هایی که عشقشون موندگاره"
        actions={<Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> نامه‌ی جدید</Button>} />
      {!letters.length ? (
        <Empty emoji="💌" title="هنوز نامه‌ای نیست" hint="یه نامه بنویس و حتی برای یه روز خاص مُهرش کن تا خودش باز بشه."
          action={<Button onClick={() => setModal(true)}>اولین نامه</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {letters.map((l) => (
            <Glass key={l.id} className="p-5 group cursor-pointer hover:bg-white/8 transition-colors" onClick={() => openLetter(l)}>
              <div className="flex items-start justify-between">
                {l.sealed && !l.isMine ? <Lock size={20} className="text-amber-300" /> : l.openedAt || l.isMine ? <MailOpen size={20} className="text-purple-300" /> : <Mail size={20} className="text-rose-300" />}
                {l.isMine && <button onClick={(e) => { e.stopPropagation(); if (confirm('حذف بشه؟')) del(`/api/love-letters/${l.id}`).then(load); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-muted2 hover:text-rose-300"><Trash2 size={14} /></button>}
              </div>
              <div className="font-semibold text-sm mt-3">{l.title}</div>
              <div className="text-[11px] text-muted2 mt-1.5 flex items-center gap-2 flex-wrap">
                <span>{l.isMine ? 'از من' : 'از پارتنرم'}</span>
                {l.openAt && <Tag>{l.sealed ? `🔒 باز می‌شه: ${faDate(l.openAt)}` : `📅 ${faDate(l.openAt)}`}</Tag>}
              </div>
            </Glass>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="نامه‌ی جدید 💌">
        <form onSubmit={save} className="space-y-3">
          <Field label="عنوان"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="برای وقتی دلتنگمی…" /></Field>
          <Field label="متن نامه"><TextArea required rows={7} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="عشقم…" /></Field>
          <Field label="باز شدن در تاریخ (اختیاری)" hint="اگه انتخاب کنی، نامه تا اون روز برای پارتنرت قفل می‌مونه 🔒">
            <Input type="date" dir="ltr" min={todayKey()} value={form.openAt} onChange={(e) => setForm({ ...form, openAt: e.target.value })} />
          </Field>
          <Button className="w-full" loading={busy}>{form.openAt ? 'مُهروموم کن 🔒' : 'ثبت نامه 💌'}</Button>
        </form>
      </Modal>

      <Modal open={!!reading} onClose={() => setReading(null)} title={reading?.title} wide>
        {reading && (
          <div className="bg-gradient-to-b from-rose-500/10 to-purple-500/10 rounded-2xl p-6 border border-rose-400/15">
            <p className="leading-9 whitespace-pre-wrap text-[15px]">{reading.content}</p>
            <div className="text-[11px] text-muted2 mt-5">{reading.isMine ? '✍️ نوشته‌ی خودم' : '💌 از طرف عشقم'}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
