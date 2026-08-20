import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, patch, del } from '../lib/api';
import { faDate, Moods } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, TextArea, Select, Tag, PageLoading } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Lock, Pencil, Trash2, Save } from 'lucide-react';

export default function JournalDetail() {
  const { id } = useParams();
  const [e0, setE] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const nav = useNavigate();

  const load = () => get<{ entry: any }>(`/api/journal/${id}`).then((d) => { setE(d.entry); setForm({ title: d.entry.title, content: d.entry.content, mood: d.entry.mood ?? '', location: d.entry.location ?? '', visibility: d.entry.visibility }); })
    .catch(() => { setE(undefined); });
  useEffect(() => { load(); }, [id]);

  if (e0 === null) return <PageLoading />;
  if (e0 === undefined) return <div className="text-center py-20 text-muted2">پیدا نشد 🌫️</div>;

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      await patch(`/api/journal/${id}`, form);
      toast.push('success', 'به‌روز شد ✅'); setEditing(false); load();
    } catch (e) { toastError(toast.push, e); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title={e0.title} back={() => nav('/journal')}
        actions={e0.isMine && (<>
          <Button size="sm" variant="soft" onClick={() => setEditing(!editing)}><Pencil size={14} /> {editing ? 'انصراف' : 'ویرایش'}</Button>
          <Button size="sm" variant="danger" onClick={async () => { if (confirm('این یادداشت حذف بشه؟')) { await del(`/api/journal/${id}`); toast.push('info', 'حذف شد.'); nav('/journal'); } }}><Trash2 size={14} /></Button>
        </>)} />
      <Glass className="p-6">
        <div className="flex items-center gap-2 text-xs text-muted2 mb-4 flex-wrap">
          <span className="num">{faDate(e0.entryDate)}</span>
          {e0.visibility === 'private' && <span className="flex items-center gap-1 text-purple-300"><Lock size={11} /> خصوصی</span>}
          {e0.mood && <span>{Moods[e0.mood]?.emoji} {Moods[e0.mood]?.label}</span>}
          {e0.location && <span>📍 {e0.location}</span>}
        </div>
        {editing ? (
          <form onSubmit={save} className="space-y-3">
            <Field label="عنوان"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="متن"><TextArea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="حال"><Select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}>
                <option value="">—</option>{Object.entries(Moods).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
              </Select></Field>
              <Field label="دید"><Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
                <option value="shared">🫶 مشترک</option><option value="private">🔒 فقط خودم</option>
              </Select></Field>
            </div>
            <Button loading={busy}><Save size={15} /> ذخیره تغییرات</Button>
          </form>
        ) : (
          <p className="leading-8 whitespace-pre-wrap text-[15px]">{e0.content}</p>
        )}
        {!!e0.tags.length && <div className="flex gap-1.5 mt-5 flex-wrap">{e0.tags.map((t: string) => <Tag key={t}>#{t}</Tag>)}</div>}
      </Glass>
    </div>
  );
}
