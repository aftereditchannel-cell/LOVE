import React, { useEffect, useState } from 'react';
import { get, patch, post, upload } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { fa, faDate, daysUntil } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, TextArea, Select, PageLoading, Stat } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Camera, Copy, HeartHandshake, Save } from 'lucide-react';
import ReactDOM from 'react-dom';

export default function Profile({ coupleView }: { coupleView?: boolean }) {
  const { me, reload } = useAuth();
  const [couple, setCouple] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    get('/api/couple').then((d) => {
      setCouple(d.couple);
      const mine = d.couple.members.find((m: any) => m.isMe);
      setForm({ displayName: me?.user.displayName ?? '', nickname: mine?.nickname ?? '', birthday: mine?.birthday ?? '', favoriteColor: mine?.favoriteColor ?? '', favoriteThings: mine?.favoriteThings ?? '', theme: me?.user.theme ?? 'system' });
    }).catch(() => {});
  }, [me]);

  if (!couple) return <PageLoading />;
  const partner = couple.members.find((m: any) => !m.isMe);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await patch('/api/profile', { ...form, birthday: form.birthday || null });
      await reload();
      toast.push('success', 'پروفایل ذخیره شد ✅');
    } catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData(); fd.append('file', f);
    try { await upload('/api/profile/avatar', fd); await reload(); toast.push('success', 'عکس پروفایل عوض شد 📸'); }
    catch (err) { toastError(toast.push, err); }
    e.target.value = '';
  };

  const bdayCountdown = (birthday?: string) => {
    if (!birthday) return null;
    const [, mm, dd] = birthday.split('-');
    const now = new Date();
    let cand = `${now.getFullYear()}-${mm}-${dd}`;
    if (daysUntil(cand) < 0) cand = `${now.getFullYear() + 1}-${mm}-${dd}`;
    return daysUntil(cand);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title={coupleView ? 'فضای دونفره ما 💞' : 'پروفایل من 👤'} />

      {/* couple card */}
      <Glass className="p-6 text-center relative overflow-hidden">
        <div className="flex items-center justify-center gap-4">
          {[couple.members.find((m: any) => m.isMe), partner].filter(Boolean).map((m: any, i: number) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-400/30 to-purple-400/30 border-2 border-white/15 overflow-hidden flex items-center justify-center text-3xl">
                {m.avatarUrl ? <img src={m.avatarUrl} className="w-full h-full object-cover" /> : ['🌹', '🌷'][i]}
              </div>
              <div className="text-sm font-medium">{m.displayName}{m.nickname ? ` (${m.nickname})` : ''}</div>
            </div>
          ))}
          {!partner && (
            <div className="flex flex-col items-center gap-2 opacity-60">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-2xl">💌</div>
              <div className="text-xs text-muted2">در انتظار پارتنرت</div>
            </div>
          )}
        </div>
        <div className="mt-4 text-2xl font-black gradient-text num">{fa(couple.daysTogether)} روز</div>
        <div className="text-xs text-muted2 mt-1">که قصه‌ی ما شروع شده ❤️ {couple.startDate && `(${faDate(couple.startDate)})`}</div>
        {!partner && couple.inviteCode && (
          <button onClick={() => { navigator.clipboard?.writeText(couple.inviteCode); toast.push('success', 'کد کپی شد 📋'); }}
            className="mt-4 glass px-4 py-2 text-sm flex items-center gap-2 mx-auto hover:bg-white/10">
            <Copy size={14} /> کد دعوت: <span dir="ltr" className="num text-rose-300 tracking-widest">{couple.inviteCode}</span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-3 mt-5">
          {couple.members.map((m: any) => {
            const cd = bdayCountdown(m.birthday);
            return cd != null ? (
              <Stat key={m.userId} icon={<span className="text-lg">🎂</span>} label={`تولد ${m.nickname || m.displayName}`} value={cd === 0 ? 'امروزه! 🎉' : `${fa(cd)} روز دیگه`} accent={m.isMe ? 'rose' : 'purple'} />
            ) : null;
          })}
        </div>
      </Glass>

      {/* my profile form */}
      <Glass className="p-6">
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400/30 to-purple-400/30 overflow-hidden flex items-center justify-center text-2xl">
              {me?.user.avatarUrl ? <img src={me.user.avatarUrl} className="w-full h-full object-cover" /> : '🌹'}
            </div>
            <label className="text-xs text-purple-300 cursor-pointer flex items-center gap-1.5 hover:text-purple-200">
              <Camera size={14} /> تغییر عکس پروفایل
              <input type="file" accept="image/*" hidden onChange={uploadAvatar} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نام"><Input value={form.displayName ?? ''} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></Field>
            <Field label="اسم کوچیک"><Input value={form.nickname ?? ''} onChange={(e) => setForm({ ...form, nickname: e.target.value })} /></Field>
            <Field label="تاریخ تولد"><Input type="date" dir="ltr" value={form.birthday ?? ''} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></Field>
            <Field label="رنگ موردعلاقه"><Input value={form.favoriteColor ?? ''} onChange={(e) => setForm({ ...form, favoriteColor: e.target.value })} /></Field>
          </div>
          <Field label="چیزهایی که دوست دارم"><TextArea rows={2} value={form.favoriteThings ?? ''} onChange={(e) => setForm({ ...form, favoriteThings: e.target.value })} /></Field>
          <Field label="تم اپ">
            <Select value={form.theme ?? 'system'} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
              <option value="dark">🌙 تیره</option><option value="light">☀️ روشن</option><option value="system">⚙️ سیستم</option>
            </Select>
          </Field>
          <Button loading={busy}><Save size={15} /> ذخیره</Button>
        </form>
      </Glass>

      {/* partner card */}
      {partner && (
        <Glass className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3"><HeartHandshake size={16} className="text-rose-300" /> درباره‌ی {partner.displayName}</div>
          <div className="grid grid-cols-2 gap-2 text-xs leading-6 text-muted2">
            {partner.nickname && <div>اسم کوچیک: <span className="text-cream">{partner.nickname}</span></div>}
            {partner.birthday && <div>تولد: <span className="text-cream num">{faDate(partner.birthday)}</span></div>}
            {partner.favoriteColor && <div>رنگ موردعلاقه: <span className="text-cream">{partner.favoriteColor}</span></div>}
            {partner.loveLanguage && <div>زبان عشق: <span className="text-cream">{partner.loveLanguage.primary}</span></div>}
          </div>
          {partner.favoriteThings && <div className="text-xs text-muted2 mt-2 leading-6">دوست داره: <span className="text-cream">{partner.favoriteThings}</span></div>}
        </Glass>
      )}
    </div>
  );
}
