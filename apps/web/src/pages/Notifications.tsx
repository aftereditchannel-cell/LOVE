import { useEffect, useState } from 'react';
import { get, post } from '../lib/api';
import { fa, relTime } from '../lib/format';
import { Glass, Button, PageHeader, PageLoading } from '../ui/components';
import { useToast } from '../ui/toast';
import { Bell, CheckCheck } from 'lucide-react';

const typeEmoji: Record<string, string> = { birthday: '🎂', anniversary: '💍', period: '🩸', pms: '🌸', calendar: '📅', task: '✅', memory: '📸', letter: '💌', question: '❓', mood: '💗', countdown: '⏳', backup: '☁️' };

export default function Notifications() {
  const [data, setData] = useState<any>(null);
  const toast = useToast();
  const load = () => get('/api/notifications').then(setData).catch((e) => toast.push('error', e.message));
  useEffect(() => { load(); post('/api/notifications/read').catch(() => {}); }, []);

  if (!data) return <PageLoading />;
  return (
    <div className="max-w-2xl">
      <PageHeader title="مرکز اعلان‌ها 🔔" subtitle={`${fa(data.reminders.length + data.notifications.length)} مورد`}
        actions={<a href="/settings/notifications"><Button size="sm" variant="soft">تنظیم اعلان‌ها</Button></a>} />

      {!!data.reminders.length && (
        <>
          <div className="text-xs text-muted2 mb-2 mt-1">یادآوری‌های زنده ⚡</div>
          <div className="space-y-2 mb-5">
            {data.reminders.map((r: any) => (
              <Glass key={r.id} className="p-4 flex items-center gap-3 border-r-2 !border-r-purple-400/60">
                <span className="text-2xl">{typeEmoji[r.type] ?? '🔔'}</span>
                <div>
                  <div className="text-sm font-medium">{r.title}</div>
                  {r.body && <div className="text-xs text-muted2 mt-0.5">{r.body}</div>}
                </div>
              </Glass>
            ))}
          </div>
        </>
      )}

      <div className="text-xs text-muted2 mb-2">رویدادها</div>
      {!data.notifications.length ? (
        <Glass className="p-10 text-center text-sm text-muted2">فعلاً اعلانی نیست — همه‌چیز آرومه 🌿</Glass>
      ) : (
        <div className="space-y-2">
          {data.notifications.map((n: any) => (
            <Glass key={n.id} className={`p-4 flex items-center gap-3 ${!n.read ? 'border-r-2 !border-r-rose-400/60' : 'opacity-70'}`}>
              <span className="text-2xl">{typeEmoji[n.type] ?? '🔔'}</span>
              <div className="flex-1">
                <div className="text-sm">{n.title}</div>
                {n.body && <div className="text-xs text-muted2 mt-0.5">{n.body}</div>}
              </div>
              <span className="text-[10px] text-muted2">{relTime(n.createdAt)}</span>
            </Glass>
          ))}
        </div>
      )}
    </div>
  );
}
