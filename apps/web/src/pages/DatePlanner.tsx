import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { get, post } from '../lib/api';
import { fa, todayKey } from '../lib/format';
import { Glass, Button, PageHeader, Chip, Modal, Field, Input } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Dices, Sparkles, CalendarPlus } from 'lucide-react';
import React from 'react';

const catLabels: Record<string, string> = { movie: '🎬 شب فیلم', dinner: '🍽️ شام', walk: '🚶 قدم‌زدن', gaming: '🎮 بازی', home: '🏠 قرار خانگی', trip: '🚗 سفر', photo: '📸 عکاسی' };

export default function DatePlanner() {
  const [cat, setCat] = useState('');
  const [idea, setIdea] = useState<{ idea: string; fromWishlist: string | null } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [date, setDate] = useState(todayKey());
  const toast = useToast();

  const roll = async (c = cat) => {
    setSpinning(true);
    setIdea(null);
    try {
      // fun suspense: tiny reveals
      for (let i = 0; i < 3; i++) {
        const d = await get<any>(`/api/date-planner/random${c ? `?category=${c}` : ''}`);
        setIdea(d);
        await new Promise((r) => setTimeout(r, 260));
      }
    } catch (e) { toastError(toast.push, e); }
    finally { setSpinning(false); }
  };

  const saveAsEvent = async () => {
    try {
      await post('/api/calendar/events', { title: `قرار: ${idea!.idea}`, date, kind: 'date', color: 'rose' });
      toast.push('success', 'توی تقویم ثبت شد 📅💑');
      setSaveModal(false);
    } catch (e) { toastError(toast.push, e); }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="امشب چیکار کنیم؟ 🎲" subtitle="قرار‌ساز جادویی دونفره" />
      <Glass className="p-6 text-center relative overflow-hidden min-h-[300px] flex flex-col items-center justify-center">
        <motion.div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 to-purple-500/8" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 5, repeat: Infinity }} />
        <div className="relative w-full">
          <div className="flex gap-2 justify-center flex-wrap mb-6">
            <Chip active={!cat} onClick={() => setCat('')}>🎲 شانسی</Chip>
            {Object.entries(catLabels).map(([k, l]) => <Chip key={k} active={cat === k} onClick={() => setCat(k)}>{l}</Chip>)}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={idea?.idea ?? 'empty'} initial={{ opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="min-h-[100px] flex flex-col items-center justify-center gap-3">
              {idea ? (<>
                <div className="text-4xl">💫</div>
                <div className="text-xl font-bold leading-9">{idea.idea}</div>
                {idea.fromWishlist && <div className="text-xs text-purple-300">✨ از آرزوهاتون هم این دلمون می‌خواد: «{idea.fromWishlist}»</div>}
              </>) : (
                <div className="text-muted2 text-sm">دکمه رو بزن تا جادو کارشو بکنه ✨</div>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-2 justify-center mt-6">
            <Button size="lg" onClick={() => roll()} loading={spinning}><Dices size={18} /> یه قرار جدید!</Button>
            {idea && <Button size="lg" variant="soft" onClick={() => setSaveModal(true)}><CalendarPlus size={17} /> ثبت توی تقویم</Button>}
          </div>
        </div>
      </Glass>
      <Glass className="p-4 mt-4 flex items-center gap-2.5 text-xs text-muted2 leading-6">
        <Sparkles size={15} className="text-rose-300 shrink-0" />
        <span>دستیار دونفره هم یه عالمه ایده‌ی شخصی‌سازی‌شده بر اساس حال پارتنرت داره — <a href="/ai" className="text-rose-300">ببینیش</a></span>
      </Glass>

      <Modal open={saveModal} onClose={() => setSaveModal(false)} title="ثبت توی تقویم 📅">
        <div className="space-y-3">
          <Field label="عنوان"><Input defaultValue={`قرار: ${idea?.idea}`} readOnly /></Field>
          <Field label="تاریخ قرار"><Input type="date" dir="ltr" min={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Button className="w-full" onClick={saveAsEvent}>ثبت کن 💑</Button>
        </div>
      </Modal>
    </div>
  );
}
