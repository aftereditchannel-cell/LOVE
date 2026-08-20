import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { get, post, patch, del, upload } from '../lib/api';
import { faTime, relTime } from '../lib/format';
import { Button, Input, PageLoading, cn } from '../ui/components';
import { useToast, toastError } from '../ui/toast';
import { SendHorizonal, ImagePlus, Pin, Reply, Smile, Pencil, Trash2, CheckCheck } from 'lucide-react';

const emojis = ['❤️', '😂', '😍', '🥺', '👍', '🔥', '😘', '🎉'];

export default function Chat() {
  const [messages, setMessages] = useState<any[] | null>(null);
  const [state, setState] = useState<any>({});
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editMsg, setEditMsg] = useState<any>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(0);
  const toast = useToast();
  const stick = useRef(true);

  const load = async (initial = false) => {
    try {
      const d = await get<any>('/api/chat/messages');
      setMessages((prev) => {
        const changed = JSON.stringify(prev?.map((m: any) => m.id)) !== JSON.stringify(d.messages.map((m: any) => m.id))
          || JSON.stringify(prev) !== JSON.stringify(d.messages);
        return initial || changed ? d.messages : prev;
      });
      setState(d.state);
    } catch { /* keep quiet on poll */ }
  };

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (stick.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { post('/api/chat/read').catch(() => {}); }, [messages?.length]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText('');
    try {
      if (editMsg) { await patch(`/api/chat/messages/${editMsg.id}`, { content }); setEditMsg(null); }
      else await post('/api/chat/messages', { content, replyToId: replyTo?.id ?? null });
      setReplyTo(null);
      stick.current = true;
      load();
    } catch (e2) { toastError(toast.push, e2); }
  };

  const onType = (v: string) => {
    setText(v);
    if (Date.now() - typingRef.current > 2000) { typingRef.current = Date.now(); post('/api/chat/typing').catch(() => {}); }
  };

  const sendFile = async (f?: File) => {
    if (!f) return;
    const fd = new FormData(); fd.append('file', f); fd.append('content', text.trim());
    setText('');
    try { await upload('/api/chat/messages/with-file', fd); stick.current = true; load(); }
    catch (e) { toastError(toast.push, e, 'ارسال فایل ناموفق بود.'); }
  };

  if (messages === null) return <PageLoading />;

  return (
    <div className="flex flex-col h-[calc(100dvh-13.5rem)] lg:h-[calc(100dvh-5rem)] max-w-2xl mx-auto">
      {/* header */}
      <div className="glass p-3.5 mb-2 flex items-center justify-between">
        <div className="font-semibold text-sm">چت دونفره 💬</div>
        <div className="text-[11px] text-muted2 flex items-center gap-1.5">
          {state.partnerTyping
            ? <span className="text-rose-300 animate-pulseSoft">داره می‌نویسه… ✍️</span>
            : state.partnerOnline
              ? <><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> آنلاین</>
              : 'آفلاین'}
        </div>
      </div>

      {/* pinned */}
      {messages.some((m) => m.pinned) && (
        <div className="glass px-3.5 py-2 mb-2 text-xs flex items-center gap-2 border-r-2 !border-r-rose-400">
          <Pin size={13} className="text-rose-300" />
          <span className="line-clamp-1">{messages.find((m) => m.pinned)?.content}</span>
        </div>
      )}

      {/* messages */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1 py-2" onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}>
        {!messages.length && <div className="text-center text-muted2 text-sm py-16">اولین پیام رو بفرست 💌</div>}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showDay = !prev || prev.createdAt.slice(0, 10) !== m.createdAt.slice(0, 10);
          const partnerRead = state.partnerLastReadAt && m.createdAt <= state.partnerLastReadAt;
          return (
            <React.Fragment key={m.id}>
              {showDay && <div className="text-center text-[10px] text-muted2 my-3 num">{m.createdAt.slice(0, 10)}</div>}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={cn('flex group', m.isMine ? 'justify-start flex-row-reverse' : 'justify-start')}>
                <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2.5 relative',
                  m.isMine ? 'bg-gradient-to-l from-rose-500/30 to-purple-500/25 border border-rose-400/20 rounded-tl-md' : 'glass rounded-tr-md')}>
                  {m.replyToId && <div className="text-[10px] text-muted2 border-r-2 border-purple-400/50 pr-2 mb-1.5">↩️ پاسخ به پیام</div>}
                  {m.attachments?.map((a: any) => (
                    a.mime.startsWith('image/') ? <img key={a.id} src={a.url} className="rounded-xl mb-1.5 max-h-56" /> :
                    a.mime.startsWith('video/') ? <video key={a.id} src={a.url} controls className="rounded-xl mb-1.5 max-h-56" /> :
                    <audio key={a.id} src={a.url} controls className="mb-1.5 w-full" />
                  ))}
                  {m.content && <div className="text-sm leading-7 whitespace-pre-wrap break-words">{m.content}</div>}
                  <div className="flex items-center gap-2 mt-1 justify-end">
                    {!!m.editedAt && <span className="text-[9px] text-muted2/70">ویرایش‌شده</span>}
                    {m.isMine && <CheckCheck size={12} className={partnerRead ? 'text-sky-300' : 'text-muted2/60'} />}
                    <span className="text-[9px] text-muted2/80 num">{faTime(m.createdAt)}</span>
                  </div>
                  {!!m.reactions.length && (
                    <div className="absolute -bottom-3 right-3 flex gap-0.5">
                      {[...new Set(m.reactions.map((r: any) => r.emoji))].map((em: any) => (
                        <span key={em} className="text-[11px] glass px-1.5 py-0.5 !rounded-full">{em}</span>
                      ))}
                    </div>
                  )}
                  {/* hover actions */}
                  <div className={cn('absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5', m.isMine ? '-left-24' : '-right-24')}>
                    <button onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20"><Smile size={13} /></button>
                    <button onClick={() => setReplyTo(m)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20"><Reply size={13} /></button>
                    <button onClick={async () => { await post(`/api/chat/messages/${m.id}/pin`); load(); }} className={cn('p-1.5 rounded-full hover:bg-white/20', m.pinned ? 'bg-rose-500/30' : 'bg-white/10')}><Pin size={13} /></button>
                    {m.isMine && <>
                      <button onClick={() => { setEditMsg(m); setText(m.content); }} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20"><Pencil size={13} /></button>
                      <button onClick={async () => { await del(`/api/chat/messages/${m.id}`); load(); }} className="p-1.5 rounded-full bg-white/10 hover:bg-rose-500/30"><Trash2 size={13} /></button>
                    </>}
                  </div>
                  {pickerFor === m.id && (
                    <div className="absolute z-10 top-8 glass-strong p-2 flex gap-1" style={{ insetInlineStart: 0 }}>
                      {emojis.map((em) => (
                        <button key={em} onClick={async () => { await post(`/api/chat/messages/${m.id}/reactions`, { emoji: em }); setPickerFor(null); load(); }}
                          className="hover:scale-125 transition-transform text-base">{em}</button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      {(replyTo || editMsg) && (
        <div className="glass px-3.5 py-2 mb-2 text-xs flex items-center justify-between">
          <span className="text-muted2">{editMsg ? '✏️ ویرایش پیام' : `↩️ پاسخ به: ${replyTo.content?.slice(0, 46)}…`}</span>
          <button onClick={() => { setReplyTo(null); setEditMsg(null); setText(''); }} className="text-rose-300">✕</button>
        </div>
      )}
      <form onSubmit={send} className="glass p-2 flex items-center gap-1.5">
        <button type="button" onClick={() => fileRef.current?.click()} className="p-2.5 rounded-full hover:bg-white/10 text-muted2"><ImagePlus size={19} /></button>
        <input ref={fileRef} type="file" hidden accept="image/*,video/*,audio/*" onChange={(e) => { sendFile(e.target.files?.[0]); e.target.value = ''; }} />
        <Input value={text} onChange={(e) => onType(e.target.value)} placeholder="یه چیز قشنگ بنویس… 💭" className="!bg-transparent !border-0 flex-1" />
        <Button type="submit" className="!rounded-full !p-3" disabled={!text.trim()}><SendHorizonal size={17} /></Button>
      </form>
    </div>
  );
}
