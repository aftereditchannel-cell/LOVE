import { useEffect, useMemo, useState } from 'react';
import { get } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { Moods as MoodMap, fa, faDateShort } from '../lib/format';
import { Glass, PageHeader, PageLoading, Chip } from '../ui/components';
import { LineChart } from '../ui/components';

const metricOpts = [
  { key: 'energy', label: 'انرژی ⚡' },
  { key: 'stress', label: 'استرس 🌩️' },
  { key: 'sleep', label: 'خواب 😴' },
  { key: 'love_level', label: 'عشق ❤️' },
];

export default function MoodHistory() {
  const { me } = useAuth();
  const [range, setRange] = useState(30);
  const [metric, setMetric] = useState('love_level');
  const [data, setData] = useState<any>(null);

  useEffect(() => { setData(null); get(`/api/moods/summary?days=${range}`).then(setData).catch(() => {}); }, [range]);

  const series = useMemo(() => {
    if (!data) return { mine: [], partner: [], days: [] };
    const byDay: Record<string, { mine?: any; partner?: any }> = {};
    for (const e of data.entries) {
      byDay[e.date] ??= {};
      if (e.user_id === data.me) byDay[e.date].mine = e; else byDay[e.date].partner = e;
    }
    const days = Object.keys(byDay).sort();
    return {
      days,
      mine: days.map((d) => Number(byDay[d].mine?.[metric] ?? 0)),
      partner: days.map((d) => Number(byDay[d].partner?.[metric] ?? 0)),
    };
  }, [data, metric]);

  if (!data) return <PageLoading />;
  return (
    <div>
      <PageHeader title="تاریخچه‌ی حال‌وسوز 📈" subtitle="روند حال شما دو نفر در کنار هم" />
      <div className="flex gap-2 mb-4 flex-wrap">
        {[7, 14, 30, 90].map((d) => <Chip key={d} active={range === d} onClick={() => setRange(d)}>{fa(d)} روز</Chip>)}
        <span className="mx-1 border-l border-white/10" />
        {metricOpts.map((m) => <Chip key={m.key} active={metric === m.key} onClick={() => setMetric(m.key)}>{m.label}</Chip>)}
      </div>
      <Glass className="p-5">
        <div className="flex gap-4 text-[11px] text-muted2 mb-3">
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-rose-400" /> من</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-purple-400" /> پارتنرم</span>
        </div>
        <LineChart points={series.mine} color="#f472b6" label="من" />
        <div className="my-3 border-t border-white/5" />
        <LineChart points={series.partner} color="#a78bfa" label="پارتنرم" />
        <div className="flex justify-between text-[10px] text-muted2 mt-2 num">
          <span>{series.days[0] ? faDateShort(series.days[0]) : ''}</span>
          <span>{series.days.at(-1) ? faDateShort(series.days.at(-1)!) : ''}</span>
        </div>
      </Glass>

      <Glass className="p-5 mt-4">
        <div className="text-sm font-semibold mb-3">آخرین ثبت‌ها</div>
        <div className="space-y-1.5">
          {data.entries.slice().reverse().slice(-12).reverse().map((e: any, i: number) => {
            const m = MoodMap[e.mood];
            const mine = e.user_id === data.me;
            return (
              <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-white/5 last:border-0">
                <span className="text-xl">{m?.emoji}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${mine ? 'bg-rose-500/15 text-rose-300' : 'bg-purple-500/15 text-purple-300'}`}>{mine ? 'من' : 'پارتنرم'}</span>
                <span className="text-xs text-muted2">{m?.label}</span>
                <span className="text-[10px] text-muted2 mr-auto num">{faDateShort(e.date)}</span>
              </div>
            );
          })}
          {!data.entries.length && <div className="text-xs text-muted2 py-4 text-center">هنوز داده‌ای نیست — از امروز ثبت کنید 🌱</div>}
        </div>
      </Glass>
    </div>
  );
}
