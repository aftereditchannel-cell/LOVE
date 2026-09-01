import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { get, del, patch, upload } from '../lib/api';
import { faDateShort } from '../lib/format';
import { Glass, Button, PageHeader, Empty, PageLoading, Chip, Modal, Input, Field } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { Plus, Star, Trash2, X, UploadCloud } from 'lucide-react';

export default function Photos() {
  const [params, setParams] = useSearchParams();
  const [photos, setPhotos] = useState<any[] | null>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'fav'>('all');
  const [albumId, setAlbumId] = useState('');
  const [viewer, setViewer] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const load = () => {
    const qs = new URLSearchParams();
    if (filter === 'fav') qs.set('favorite', '1');
    if (albumId) qs.set('albumId', albumId);
    get<{ photos: any[] }>(`/api/photos?${qs}`).then((d) => setPhotos(d.photos)).catch((e) => toastError(toast.push, e));
    get<{ albums: any[] }>('/api/albums').then((d) => setAlbums(d.albums)).catch(() => {});
  };
  useEffect(load, [filter, albumId]);
  useEffect(() => { if (params.get('new') === '1') fileRef.current?.click(); }, [params]);

  const doUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append('file', f);
      if (albumId) fd.append('albumId', albumId);
      try { await upload('/api/photos', fd); } catch (e) { toastError(toast.push, e, 'آپلود ناموفق بود.'); }
    }
    toast.push('success', 'آپلود شد 📸');
    setUploading(false); setParams({}); load();
  };

  return (
    <div>
      <PageHeader title="گنجینه‌ی عکس‌ها 🖼️" subtitle={`آلبوم‌ها رو <b /> اینجا نگه دار`}
        actions={<>
          <Link to="/albums"><Button size="sm" variant="soft">آلبوم‌ها</Button></Link>
          <Button size="sm" onClick={() => fileRef.current?.click()} loading={uploading}><UploadCloud size={15} /> آپلود</Button>
        </>} />
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { doUpload(e.target.files); e.target.value = ''; }} />

      <div className="flex gap-2 mb-4 flex-wrap">
        <Chip active={!albumId && filter === 'all'} onClick={() => { setAlbumId(''); setFilter('all'); }}>همه</Chip>
        <Chip active={filter === 'fav'} onClick={() => setFilter(filter === 'fav' ? 'all' : 'fav')}>⭐ محبوب‌ها</Chip>
        {albums.map((a) => <Chip key={a.id} active={albumId === a.id} onClick={() => setAlbumId(albumId === a.id ? '' : a.id)}>{a.title} ({a.count})</Chip>)}
      </div>

      {photos === null ? <PageLoading /> : !photos.length ? (
        <Empty emoji="🖼️" title="هنوز عکسی اینجا نیست" hint="عکس‌های قشنگ‌تون رو آپلود کنید و آلبوم بسازید."
          action={<Button onClick={() => fileRef.current?.click()}><Plus size={15} /> آپلود اولین عکس</Button>} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative glass overflow-hidden group aspect-square cursor-pointer" onClick={() => setViewer(p)}>
              {p.url.match(/\.(mp4|webm|mov)$/)
                ? <video src={p.url} className="w-full h-full object-cover" muted />
                : <img src={p.url} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" loading="lazy" />}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white/90">{p.caption || faDateShort(p.takenAt)}</span>
                {!!p.favorite && <Star size={13} className="text-amber-300 fill-amber-300" />}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!viewer} onClose={() => setViewer(null)} title={viewer?.caption || 'عکس 💞'} wide>
        {viewer && (
          <div className="space-y-3">
            {viewer.url.match(/\.(mp4|webm|mov)$/) ? <video src={viewer.url} controls className="w-full rounded-xl max-h-[55vh]" /> : <img src={viewer.url} className="w-full rounded-xl max-h-[55vh] object-contain bg-black/30" />}
            <div className="flex gap-2">
              <Button size="sm" variant="soft" onClick={async () => { await patch(`/api/photos/${viewer.id}`, { favorite: !viewer.favorite }); setViewer({ ...viewer, favorite: !viewer.favorite }); load(); }}>
                <Star size={14} className={viewer.favorite ? 'fill-amber-300 text-amber-300' : ''} /> {viewer.favorite ? 'حذف از محبوب' : 'محبوب'}
              </Button>
              <Button size="sm" variant="danger" onClick={async () => { await del(`/api/photos/${viewer.id}`); toast.push('info', 'حذف شد.'); setViewer(null); load(); }}><Trash2 size={14} /> حذف</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
