import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, patch, del, upload } from '../lib/api';
import { faDate, fa } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, TextArea, Tag, PageLoading } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Camera, Pencil, Save, Trash2, MapPin, X } from 'lucide-react';

export default function MemoryDetail() {
  const { id } = useParams();
  const [m, setM] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const nav = useNavigate();

  const load = () => get<{ memory: any }>(`/api/memories/${id}`).then((d) => { setM(d.memory); setForm({ title: d.memory.title, location: d.memory.location ?? '', description: d.memory.description ?? '', date: d.memory.date }); })
    .catch(() => setM(undefined));
  useEffect(() => { load(); }, [id]);

  if (m === null) return <PageLoading />;
  if (m === undefined) return <div className="text-center py-20 text-muted2">پیدا نشد 🌫️</div>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await patch(`/api/memories/${id}`, form); toast.push('success', 'به‌روز شد ✅'); setEditing(false); load(); }
    catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  const addMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append('file', f);
      try { await upload(`/api/memories/${id}/media`, fd); } catch (e) { toastError(toast.push, e, 'آپلود ناموفق بود.'); }
    }
    toast.push('success', 'مدیا اضافه شد 📸'); load();
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title={m.title} back={() => nav('/memories')}
        actions={<>
          <Button size="sm" variant="soft" onClick={() => setEditing(!editing)}><Pencil size={14} /> {editing ? 'انصراف' : 'ویرایش'}</Button>
          <Button size="sm" variant="danger" onClick={async () => { if (confirm('این خاطره حذف بشه؟')) { await del(`/api/memories/${id}`); nav('/memories'); } }}><Trash2 size={14} /></Button>
        </>} />

      {/* media gallery */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {m.media.map((md: any) => (
          <div key={md.id} className="relative glass overflow-hidden group aspect-square">
            {md.type === 'image' ? <img src={md.url} className="w-full h-full object-cover" /> :
             md.type === 'video' ? <video src={md.url} controls className="w-full h-full object-cover" /> :
             <div className="w-full h-full flex items-center justify-center p-3"><audio src={md.url} controls className="w-full" /></div>}
            <button onClick={async () => { await del(`/api/memories/${id}/media/${md.id}`); load(); }}
              className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"><X size={13} /></button>
          </div>
        ))}
        <button onClick={() => fileRef.current?.click()}
          className="glass aspect-square flex flex-col items-center justify-center gap-2 text-muted2 hover:text-cream hover:bg-white/8 transition-colors border-dashed">
          <Camera size={22} /><span className="text-xs">افزودن عکس/ویدیو</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" multiple hidden onChange={(e) => { addMedia(e.target.files); e.target.value = ''; }} />
      </div>

      <Glass className="p-6">
        <div className="flex items-center gap-3 text-xs text-muted2 mb-4 flex-wrap">
          <span className="num">{faDate(m.date)}</span>
          {m.location && <span className="flex items-center gap-1"><MapPin size={12} /> {m.location}</span>}
        </div>
        {editing ? (
          <form onSubmit={save} className="space-y-3">
            <Field label="عنوان"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="تاریخ"><Input type="date" dir="ltr" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="مکان"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            </div>
            <Field label="شرح"><TextArea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Button loading={busy}><Save size={15} /> ذخیره</Button>
          </form>
        ) : (
          <p className="leading-8 whitespace-pre-wrap">{m.description || <span className="text-muted2 text-sm">توضیحی نوشته نشده…</span>}</p>
        )}
        {!!m.tags?.length && <div className="flex gap-1.5 mt-5 flex-wrap">{m.tags.map((t: string) => <Tag key={t}>#{t}</Tag>)}</div>}
      </Glass>
    </div>
  );
}
