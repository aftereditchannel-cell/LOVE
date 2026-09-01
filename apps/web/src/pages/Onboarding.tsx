import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { post } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../layout/AppShell';
import { Button, Input, Field, Glass } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { HeartHandshake, UserRound, UsersRound, CalendarHeart, KeyRound } from 'lucide-react';
import { fa } from '../lib/format';

type PartnerForm = { name: string; nickname: string; birthday: string; favoriteColor: string; favoriteThings: string };
const emptyPartner: PartnerForm = { name: '', nickname: '', birthday: '', favoriteColor: '', favoriteThings: '' };

export default function Onboarding() {
  const { me, reload, loading } = useAuth();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [step, setStep] = useState(0);
  const [meP, setMeP] = useState<PartnerForm>({ ...emptyPartner, name: me?.user.displayName ?? '' });
  const [partner, setPartner] = useState<PartnerForm>(emptyPartner);
  const [startDate, setStartDate] = useState('');
  const [title, setTitle] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createResult, setCreateResult] = useState<{ id: string } | null>(null);
  const { logout } = useAuth();
  const nav = useNavigate();
  const toast = useToast();

  if (!loading && me?.couple) return <Navigate to="/dashboard" replace />;

  const fieldFor = (set: React.Dispatch<React.SetStateAction<PartnerForm>>) => (k: keyof PartnerForm) => (e: any) =>
    set((p) => ({ ...p, [k]: e.target.value }));

  const meSet = fieldFor(setMeP);
  const partnerSet = fieldFor(setPartner);

  const steps = [
    {
      title: 'درباره‌ی تو 💫', icon: UserRound,
      valid: meP.name.trim().length > 0,
      content: (
        <div className="space-y-3">
          <Field label="نام"><Input value={meP.name} onChange={meSet('name')} placeholder="نام تو" /></Field>
          <Field label="اسم کوچیکت"><Input value={meP.nickname} onChange={meSet('nickname')} placeholder="مثلاً نیلی" /></Field>
          <Field label="تاریخ تولد"><Input type="date" dir="ltr" value={meP.birthday} onChange={meSet('birthday')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="رنگ موردعلاقه"><Input value={meP.favoriteColor} onChange={meSet('favoriteColor')} placeholder="صورتی؟" /></Field>
            <Field label="چیزهایی که دوست داری"><Input value={meP.favoriteThings} onChange={meSet('favoriteThings')} placeholder="قهوه، کتاب…" /></Field>
          </div>
        </div>
      ),
    },
    {
      title: 'درباره‌ی پارتنرت 💗', icon: UsersRound,
      valid: partner.name.trim().length > 0,
      content: (
        <div className="space-y-3">
          <Field label="نام پارتنرت"><Input value={partner.name} onChange={partnerSet('name')} placeholder="نام اون‌طرف قصه" /></Field>
          <Field label="اسم کوچیکش"><Input value={partner.nickname} onChange={partnerSet('nickname')} placeholder="مثلاً آرمی" /></Field>
          <Field label="تاریخ تولدش"><Input type="date" dir="ltr" value={partner.birthday} onChange={partnerSet('birthday')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="رنگ موردعلاقه‌ش"><Input value={partner.favoriteColor} onChange={partnerSet('favoriteColor')} /></Field>
            <Field label="چیزهایی که دوست داره"><Input value={partner.favoriteThings} onChange={partnerSet('favoriteThings')} /></Field>
          </div>
          <p className="text-[11px] text-muted2 leading-6">وقتی با کد دعوت وارد بشه، این اطلاعات خودکار توی پروفایلش می‌شینه ✨</p>
        </div>
      ),
    },
    {
      title: 'آغاز قصه‌تون 📖', icon: CalendarHeart,
      valid: !!startDate,
      content: (
        <div className="space-y-3">
          <Field label="تاریخ شروع رابطه"><Input type="date" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="اسم دنیای دونفره‌تون (اختیاری)"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${meP.nickname || meP.name || 'ما'} و ${partner.nickname || partner.name || 'تو'}`} /></Field>
        </div>
      ),
    },
  ];

  const [busy, setBusy] = useState(false);
  const next = async () => {
    if (!steps[step].valid) { toast.push('error', 'لطفاً فیلدهای لازم رو پر کن.'); return; }
    if (step < steps.length - 1) { setStep(step + 1); return; }
    setBusy(true);
    try {
      const r = await post<{ coupleId: string }>('/api/couple', {
        title,
        startDate,
        me: { ...meP, birthday: meP.birthday || null },
        partner: { ...partner, birthday: partner.birthday || null },
      });
      const inv = await post<{ code: string }>('/api/couple/invite');
      setInviteCode(inv.code);
      setCreateResult({ id: r.coupleId });
      await reload();
      toast.push('success', 'دنیای دونفره‌تون ساخته شد ❤️');
    } catch (e) { toastError(toast.push, e); }
    finally { setBusy(false); }
  };

  const join = async () => {
    setBusy(true);
    try {
      await post('/api/couple/join', { code: inviteCode.trim().toUpperCase() });
      await reload();
      toast.push('success', 'به دنیای دونفره ملحق شدی 💞');
      nav('/dashboard', { replace: true });
    } catch (e) { toastError(toast.push, e, 'کد دعوت معتبر نیست.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Glass className="p-7">
          <div className="flex justify-center mb-5"><Brand /></div>

          {mode === 'choose' && (
            <div className="space-y-4 text-center">
              <HeartHandshake size={40} className="mx-auto text-rose-300" />
              <h1 className="font-bold text-lg">فضای دونفره‌ت رو بساز</h1>
              <p className="text-sm text-muted2 leading-7">یا از اول با هم شروع کنید، یا اگه پارتنرت ساخته، با کد دعوت ملحق شو.</p>
              <Button className="w-full" onClick={() => setMode('create')}>ما از اول می‌سازیم ✨</Button>
              <Button variant="soft" className="w-full" onClick={() => setMode('join')}>کد دعوت دارم 🔑</Button>
              <button onClick={logout} className="text-xs text-muted2 hover:text-cream">خروج از حساب</button>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-4">
              <h1 className="font-bold text-center">پیوستن با کد دعوت 🔑</h1>
              <Field label="کد دعوت پارتنرت">
                <Input dir="ltr" className="text-center text-xl tracking-[0.4em] num" maxLength={8} value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="A1B2C3D4" />
              </Field>
              <div className="flex gap-2">
                <Button variant="soft" className="flex-1" onClick={() => setMode('choose')}>قبلی</Button>
                <Button className="flex-1" loading={busy} disabled={inviteCode.trim().length < 4} onClick={join}>ملحق شو 💞</Button>
              </div>
            </div>
          )}

          {mode === 'create' && !createResult && (
            <div>
              <div className="flex justify-center gap-2 mb-5">
                {steps.map((s, i) => (
                  <div key={s.title} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-10 bg-gradient-to-l from-rose-400 to-purple-400' : 'w-6 bg-white/15'}`} />
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.25 }}>
                  <div className="flex items-center gap-2 mb-4">
                    {React.createElement(steps[step].icon, { size: 20, className: 'text-rose-300' })}
                    <h2 className="font-bold">{steps[step].title}</h2>
                    <span className="text-[10px] text-muted2 mr-auto num">{fa(step + 1)}/{fa(3)}</span>
                  </div>
                  {steps[step].content}
                </motion.div>
              </AnimatePresence>
              <div className="flex gap-2 mt-6">
                <Button variant="soft" className="flex-1" onClick={() => (step === 0 ? setMode('choose') : setStep(step - 1))}>قبلی</Button>
                <Button className="flex-1" loading={busy} onClick={next}>{step === steps.length - 1 ? 'بساز دنیامون رو ❤️' : 'بعدی'}</Button>
              </div>
            </div>
          )}

          {mode === 'create' && createResult && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <h2 className="font-bold text-lg">دنیای دونفره‌تون آماده‌ست!</h2>
              <p className="text-sm text-muted2 leading-7">
                {fa(Math.max(1, Math.round((Date.now() - new Date(startDate + 'T00:00:00').getTime()) / 86400000) + 1))} روزه کنار همین ❤️
              </p>
              <div className="glass p-4">
                <div className="text-xs text-muted2 mb-1">کد دعوت برای {partner.nickname || partner.name}:</div>
                <div dir="ltr" className="text-2xl font-bold tracking-[0.35em] num text-rose-300 select-all">{inviteCode}</div>
                <p className="text-[10px] text-muted2 mt-2 flex items-center justify-center gap-1"><KeyRound size={11} /> این کد رو براش بفرست تا ملحق بشه</p>
              </div>
              <Button className="w-full" onClick={() => nav('/dashboard', { replace: true })}>بریم توی دنیامون 💫</Button>
            </motion.div>
          )}
        </Glass>
      </motion.div>
    </div>
  );
}
