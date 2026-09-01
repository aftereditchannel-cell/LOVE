import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { get } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { fa, faDateFull, Moods, SupportWishes, daysUntil } from '../lib/format';
import { Glass, Stat, Skeleton, Chip } from '../ui/components';
import { Camera, BookOpen, Images, ChevronLeft, HelpCircle, Clock, CalendarDays, MessageCircle, Heart } from 'lucide-react';

export default function Dashboard() {
  const { me } = useAuth();
  const [d, setD] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => { get('/api/dashboard').then(setD).catch(() => {}); }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'نیمه‌شبت قشنگه';
    if (h < 12) return 'صبحت بخیر';
    if (h < 17) return 'روزت بخیر';
    if (h < 20) return 'عصرت بخیر';
    return 'شبت بخیر';
  }, []);

  if (!d) return <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-44" /><Skeleton className="h-24" /></div>;

  const myMood = d.moods?.mine ? Moods[d.moods.mine.mood] : null;
  const partnerMood = d.moods?.partner ? Moods[d.moods.partner.mood] : null;

  return (
    <div className="space-y-4">
      {/* greeting hero */}
      <Glass className="p-6 relative overflow-hidden">
        <motion.div className="absolute -top-10 -left-10 w-40 h-40 bg-rose-500/15 blur-[60px] rounded-full" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 6, repeat: Infinity }} />
        <div className="relative">
          <div className="text-xs text-muted2">{faDateFull(new Date())}</div>
          <h1 className="text-2xl font-bold mt-1">{greeting}، <span className="gradient-text">{me?.profile?.nickname || me?.user.displayName}</span> 🌸</h1>
          <p className="text-sm text-muted2 mt-1">امروز حالت چطوره؟</p>

          {/* mood pick */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {Object.entries(Moods).map(([k, m]) => (
              <motion.button key={k} whileTap={{ scale: 0.88 }} onClick={() => nav('/moods?mood=' + k)}
                className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-2xl transition-all hover:bg-white/10 ${myMood?.emoji === m.emoji ? 'bg-white/12 ring-1 ring-rose-400/40' : ''}`}>
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] text-muted2">{m.label}</span>
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="glass p-3.5 flex items-center gap-3">
              {myMood ? <>
                <span className="text-3xl">{myMood.emoji}</span>
                <div><div className="text-sm font-medium">حال من: {myMood.label}</div>
                  {d.moods.mine.energy && <div className="text-[10px] text-muted2 mt-0.5">انرژی {fa(d.moods.mine.energy)}/۱۰</div>}</div>
              </> : <Link to="/moods" className="text-sm text-rose-300">حال امروزت رو ثبت کن →</Link>}
            </div>
            <div className="glass p-3.5 flex items-center gap-3">
              {partnerMood ? <>
                <span className="text-3xl">{partnerMood.emoji}</span>
                <div><div className="text-sm font-medium">حال {d.partner?.display_name || 'پارتنرم'}: {partnerMood.label}</div>
                  {d.moods.partner.supportWish && <div className="text-[10px] text-purple-300 mt-0.5">{SupportWishes[d.moods.partner.supportWish]}</div>}</div>
              </> : <div className="text-sm text-muted2">{d.partner ? 'پارتنرت هنوز ثبت نکرده 🌱' : 'منتظر پیوستن پارتنرت 💌'}</div>}
            </div>
          </div>
        </div>
      </Glass>

      {/* days together + countdown */}
      <div className="grid grid-cols-2 gap-3">
        <Glass className="p-5 text-center">
          <div className="text-4xl font-black gradient-text num">{d.couple.daysTogether != null ? fa(d.couple.daysTogether) : '—'}</div>
          <div className="text-xs text-muted2 mt-1.5">روزه کنار همیم ❤️</div>
        </Glass>
        <Glass className="p-5 text-center cursor-pointer hover:bg-white/8 transition-colors" onClick={() => nav('/countdowns')}>
          {d.nextCountdown ? (<>
            <div className="text-2xl">{d.nextCountdown.emoji}</div>
            <div className="text-3xl font-black text-purple-300 num mt-1">{fa(d.nextCountdown.daysLeft)}</div>
            <div className="text-xs text-muted2 mt-1">روز تا {d.nextCountdown.title}</div>
          </>) : (<>
            <Clock size={26} className="mx-auto text-purple-300" />
            <div className="text-xs text-muted2 mt-2">یک شمارش معکوس بساز ⏳</div>
          </>)}
        </Glass>
      </div>

      {/* question of the day */}
      {d.question && (
        <Link to="/questions">
          <Glass className="p-5 hover:bg-white/8 transition-colors">
            <div className="flex items-center gap-2 text-xs text-purple-300 mb-2"><HelpCircle size={14} /> سؤال امروز ما</div>
            <div className="font-medium leading-7">{d.question.text}</div>
            <div className="text-[11px] text-muted2 mt-2.5">
              {d.question.answered ? (d.question.partnerAnswered ? 'جواب هردوتون آماده‌ست — مقایسه کنید 👀' : 'جوابتو دادی؛ منتظر پارتنرت باش 💌') : 'هنوز جواب ندادی — بنویس ✍️'}
            </div>
          </Glass>
        </Link>
      )}

      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/memories"><Stat icon={<Camera size={19} />} label="خاطره" value={fa(d.stats.memories)} /></Link>
        <Link to="/photos"><Stat icon={<Images size={19} />} label="عکس" value={fa(d.stats.photos)} accent="purple" /></Link>
        <Link to="/journal"><Stat icon={<BookOpen size={19} />} label="یادداشت" value={fa(d.stats.journal)} /></Link>
      </div>

      {/* upcoming + quick links */}
      <div className="grid md:grid-cols-2 gap-3">
        <Glass className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold flex items-center gap-2"><CalendarDays size={16} className="text-rose-300" /> رویدادهای پیشِ‌رو</div>
            <Link to="/calendar" className="text-[11px] text-muted2 hover:text-cream flex items-center">همه <ChevronLeft size={13} /></Link>
          </div>
          {d.upcomingEvents.length ? d.upcomingEvents.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
              <span>{e.title}</span><span className="text-xs text-muted2 num">{e.date}{e.time ? ` • ${e.time}` : ''}</span>
            </div>
          )) : <div className="text-xs text-muted2 py-3">چیزی نزدیک نیست؛ یک قرار بسازید 💑</div>}
        </Glass>
        <Glass className="p-5">
          <div className="text-sm font-semibold flex items-center gap-2 mb-3"><Heart size={16} className="text-purple-300" /> میان‌برها</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/chat', label: `چت ${d.unreadMessages ? `(${fa(d.unreadMessages)})` : ''}`, icon: MessageCircle },
              { to: '/ai', label: 'دستیار دونفره', icon: HelpCircle },
              { to: '/period', label: 'سلامت چرخه', icon: Heart },
              { to: '/date-planner', label: 'امشب چیکار کنیم؟', icon: Clock },
            ].map((l) => (
              <Link key={l.to} to={l.to}>
                <motion.div whileTap={{ scale: 0.97 }} className="glass p-3 text-center text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5">
                  <l.icon size={14} className="text-rose-300" /> {l.label}
                </motion.div>
              </Link>
            ))}
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <Chip onClick={() => nav('/questions')}>سؤال روز 💬</Chip>
            <Chip onClick={() => nav('/compliments')}>قدردانی 🌷</Chip>
            <Chip onClick={() => nav('/story')}>داستان ما 📖</Chip>
          </div>
        </Glass>
      </div>
    </div>
  );
}
