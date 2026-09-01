import React, { useEffect, useState } from 'react';
import { get, put } from '../lib/api';
import { Glass, Button, PageHeader, TextArea, Input, Field, PageLoading, Modal } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { BookOpen, Pencil, Save } from 'lucide-react';

export default function Story() {
  const [chapters, setChapters] = useState<any[] | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get<{ chapters: any[] }>('/api/story').then((d) => setChapters(d.chapters)).catch((e) => toastError(toast.push, e));
  useEffect(() => { void load(); }, []);

  if (chapters === null) return <PageLoading />;

  const save = async () => {
    setBusy(true);
    try { await put(`/api/story/${editing.key}`, form); toast.push('success', 'فصل به‌روز شد 📖'); setEditing(null); load(); }
    catch (e) { toastError(toast.push, e); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="داستان ما 📖" subtitle="کتاب دیجیتال قصه‌ی دونفره‌مون" />
      <div className="space-y-4">
        {chapters.map((c, i) => (
          <Glass key={c.key} className="p-6 relative overflow-hidden group">
            <div className="absolute top-4 left-4 text-6xl font-black text-white/4 num select-none">{String(i + 1).padStart(2, '0')}</div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-rose-300" />
                <h2 className="font-bold">{c.title}</h2>
                <button onClick={() => { setEditing(c); setForm({ title: c.title, content: c.content }); }}
                  className="mr-auto p-2 rounded-full text-muted2 opacity-0 group-hover:opacity-100 hover:text-cream hover:bg-white/10 transition-all"><Pencil size={14} /></button>
              </div>
              {c.content ? (
                <p className="text-sm leading-8 text-muted2 whitespace-pre-wrap">{c.content}</p>
              ) : (
                <button onClick={() => { setEditing(c); setForm({ title: c.title, content: '' }); }}
                  className="text-xs text-purple-300 hover:text-purple-200">این فصل هنوز خالیه — بنویسیدش ✍️</button>
              )}
              {!!c.memoryIds.length && <div className="text-[10px] text-muted2 mt-3">🔗 به {c.memoryIds.length} خاطره پیوند شده</div>}
            </div>
          </Glass>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`فصل: ${editing?.title}`} wide>
        <div className="space-y-3">
          <Field label="عنوان فصل"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="متن داستان"><TextArea rows={9} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="همه‌چیز از اون روز شروع شد که…" /></Field>
          <Button className="w-full" loading={busy} onClick={save}><Save size={15} /> ذخیره فصل</Button>
        </div>
      </Modal>
    </div>
  );
}
