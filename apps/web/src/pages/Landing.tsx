import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Heart, Lock, MessageCircle, Camera, CalendarDays, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../layout/AppShell';
import { Button } from '../ui/components';

const features = [
  { icon: Camera, t: 'خاطرات و گالری', d: 'هر لحظه‌تون رو با عکس و ویدیو زنده نگه دار' },
  { icon: Heart, t: 'حال‌وسوز دونفره', d: 'هر روز حالتون رو بگید، باهم نمودار ببینید' },
  { icon: CalendarDays, t: 'تقویم مشترک', d: 'قرارها، تولدها و سالگردها جلوی چشمتون' },
  { icon: MessageCircle, t: 'چت خصوصی', d: 'فقط شما دو نفر؛ رمزنگاری‌شده و امن' },
  { icon: Lock, t: 'حریم خصوصی واقعی', d: 'قفل اپ، بکاپ رمزنگاری‌شده، خروج کامل داده‌ها' },
  { icon: Sparkles, t: 'دستیار دونفره', d: 'ایده‌ی قرار، هدیه و سورپرایز برای هر روز' },
];

export default function Landing() {
  const { me, loading } = useAuth();
  if (!loading && me) return <Navigate to={me.couple ? '/dashboard' : '/onboarding'} replace />;
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-5 md:px-10 py-5">
        <Brand />
        <div className="flex gap-2">
          <Link to="/login"><Button variant="ghost">ورود</Button></Link>
          <Link to="/register"><Button size="sm">شروع کنیم 💕</Button></Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 relative overflow-hidden">
        <motion.div className="absolute w-[420px] h-[420px] rounded-full bg-rose-500/10 blur-[100px] -top-24 -left-24" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 9, repeat: Infinity }} />
        <motion.div className="absolute w-[380px] h-[380px] rounded-full bg-purple-500/10 blur-[100px] bottom-0 -right-24" animate={{ scale: [1.1, 1, 1.1] }} transition={{ duration: 11, repeat: Infinity }} />

        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}
          className="mb-6 animate-floaty">
          <img src="/assets/brand/logo.svg" alt="" width={86} height={86} className="drop-shadow-[0_0_36px_rgba(244,114,182,0.55)]" />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-black leading-tight">
          دنیای <span className="gradient-text">کوچیک دوتایی</span> ما
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="text-muted2 text-base md:text-lg mt-5 max-w-md leading-8">
          همه‌ی خاطرات، احساسات، برنامه‌ها و لحظه‌های ما در یک جای خصوصی. ❤️
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 mt-9">
          <Link to="/login"><Button size="lg" className="gap-2">ورود به دنیای ما <ChevronLeft size={18} /></Button></Link>
          <Link to="/register"><Button size="lg" variant="soft">ساخت فضای دونفره ✨</Button></Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-16 max-w-3xl w-full">
          {features.map((f, i) => (
            <motion.div key={f.t} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.08 }}
              className="glass p-4 text-right hover:bg-white/8 transition-colors">
              <f.icon size={20} className="text-rose-300 mb-2.5" />
              <div className="text-sm font-semibold mb-1">{f.t}</div>
              <div className="text-[11px] text-muted2 leading-5">{f.d}</div>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <footer className="text-center text-[11px] text-muted2/70 pb-6">
        Couple OS ❤️ — فضای خصوصی دو نفر؛ داده‌های شما رمزنگاری‌شده و فقط مال خودتونه.
      </footer>
    </div>
  );
}
