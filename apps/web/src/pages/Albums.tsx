import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post, del } from '../lib/api';
import { fa } from '../lib/format';
import { Glass, Button, PageHeader, Field, Input, Modal, Empty, PageLoading } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, FolderOpen, Trash2 } from 'lucide-react';

export default function Albums() {
  const [albums, setAlbums] = useState<any[] | null>(null);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => get<{ albums: any[] }>('/api/albums').then((d) => setAlbums(d.albums)).catch((e) => toastError(toast.push, e));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await post('/api/albums', { title }); toast.push('success', 'آلبوم ساخته شد 🗂️'); setModal(false); setTitle(''); load(); }
    catch (e2) { toastError(toast.push, e2); } finally { setBusy(false); }
  };

  if (albums === null) return <PageLoading />;
  return (
    <div>
      <PageHeader title="آلبوم‌ها 🗂️" subtitle="عکس‌ها رو دسته‌بندی کنید"
        actions={<Button size="sm" onClick={() => setModal(true)}><Plus size={15} /> آلبوم جدید</Button>} />
      {!albums.length ? (
        <Empty emoji="🗂️" title="آلبومی نداری" hint="مثلاً «سفرهای ما» یا «قرارهای قهوه» بساز."
          action={<Button onClick={() => setModal(true)}>ساخت اولین آلبوم</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {albums.map((a) => (
            <Glass key={a.id} className="overflow-hidden group">
              <Link to={`/photos?album=${a.id}`}>
                <div className="aspect-[16/9] bg-gradient-to-br from-purple-500/15 to-rose-500/15 flex items-center justify-center overflow-hidden">
                  {a.coverUrl ? <img src={a.coverUrl} className="w-full h-full object-cover" /> : <FolderOpen size={34} className="text-purple-300" />}
                </div>
              </Link>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-[11px] text-muted2 mt-0.5">{fa(a.count)} عکس</div>
                </div>
                <button onClick={async () => { if (confirm(`آلبوم «${a.title}» حذف بشه؟ (عکس‌ها حذف نمی‌شن)`)) { await del(`/api/albums/${a.id}`); load(); } }}
                  className="p-2 rounded-full text-muted2 hover:text-rose-300 hover:bg-rose-500/10"><Trash2 size={16} /></button>
              </div>
            </Glass>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="آلبوم جدید 🗂️">
        <form onSubmit={create} className="space-y-3">
          <Field label="نام آلبوم"><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="سفرهای ما ✈️" /></Field>
          <Button className="w-full" loading={busy}>بساز</Button>
        </form>
      </Modal>
    </div>
  );
}
