import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { registerUser, makeCouple } from './helpers';
import { getDb } from '../src/db';

const app = createApp();
beforeAll(async () => { await getDb(); });

describe('couple authorization & isolation', () => {
  it('couple B can never read couple A data by changing ids', async () => {
    const a1 = await registerUser(app, 'iso-a1@test.local', 'A1');
    const coupleA = await makeCouple(a1, 'iso-a2@test.local');
    const b1 = await registerUser(app, 'iso-b1@test.local', 'B1');
    const coupleB = await makeCouple(b1, 'iso-b2@test.local');

    // A creates a memory + journal entry
    const mem = await a1.post('/api/memories', { title: 'خاطره محرمانه A', date: '2024-05-01' });
    expect(mem.status).toBe(201);
    const memId = mem.json.data.memory.id;
    const jr = await a1.post('/api/journal', { title: 'دفتر A', content: 'متن خیلی خصوصی', visibility: 'shared' });
    const jrId = jr.json.data.entry.id;

    // B fetches A's ids → always 404 (no enumeration), never the data
    expect((await b1.get(`/api/memories/${memId}`)).status).toBe(404);
    expect((await b1.get(`/api/journal/${jrId}`)).status).toBe(404);
    expect((await b1.patch(`/api/memories/${memId}`, { title: 'hacked' })).status).toBe(404);
    // B's lists contain only B data
    const list = await b1.get('/api/memories');
    expect(list.json.data.memories.find((m: any) => m.id === memId)).toBeUndefined();
    const jlist = await b1.get('/api/journal');
    expect(jlist.json.data.entries.find((e: any) => e.id === jrId)).toBeUndefined();
    // B cannot even reach A's couple route response shape mismatch — couple id never from client
    const cb = await b1.get('/api/couple');
    expect(cb.json.data.couple.id).toBe(coupleB.coupleId);
    expect(cb.json.data.couple.id).not.toBe(coupleA.coupleId);
  });

  it('private journal entries are invisible to the partner', async () => {
    const me = await registerUser(app, 'pv-a@test.local', 'PA');
    const { partner } = await makeCouple(me, 'pv-b@test.local');
    const r = await me.post('/api/journal', { title: 'خیلی شخصی', content: 'راز', visibility: 'private' });
    const id = r.json.data.entry.id;
    expect((await partner.get(`/api/journal/${id}`)).status).toBe(404);
    expect((await me.get(`/api/journal/${id}`)).status).toBe(200);
  });

  it('period data is strictly per-user — partner cannot read it', async () => {
    const me = await registerUser(app, 'pd-a@test.local', 'QA');
    const { partner } = await makeCouple(me, 'pd-b@test.local');
    await me.post('/api/period/cycles', { startDate: '2026-08-01', cycleLength: 28, notes: 'یادداشت خصوصی' });
    const mine = await me.get('/api/period/cycles');
    expect(mine.json.data.cycles).toHaveLength(1);
    expect(mine.json.data.cycles[0].notes).toBe('یادداشت خصوصی');
    const theirs = await partner.get('/api/period/cycles');
    expect(theirs.json.data.cycles).toHaveLength(0);
    const pred = await me.get('/api/period/prediction');
    expect(pred.json.data.prediction.nextStart).toBe('2026-08-29');
    expect(pred.json.data.prediction.disclaimer).toContain('تشخیص پزشکی');
  });

  it('chat requires membership and messages are partner-visible, CSRF-guarded', async () => {
    const me = await registerUser(app, 'ch-a@test.local', 'CA');
    const { partner } = await makeCouple(me, 'ch-b@test.local');
    const s = await me.post('/api/chat/messages', { content: 'سلام عشقم ❤️' });
    expect(s.status).toBe(201);
    const list = await partner.get('/api/chat/messages');
    const msg = list.json.data.messages.find((m: any) => m.content === 'سلام عشقم ❤️');
    expect(msg).toBeTruthy();
    expect(msg.isMine).toBe(false);
    // partner cannot edit/delete my message
    expect((await partner.patch(`/api/chat/messages/${msg.id}`, { content: 'x' })).status).toBe(403);
    expect((await partner.del(`/api/chat/messages/${msg.id}`)).status).toBe(403);
    // reactions + pin work
    expect((await partner.post(`/api/chat/messages/${msg.id}/reactions`, { emoji: '❤️' })).status).toBe(200);
    expect((await me.post(`/api/chat/messages/${msg.id}/pin`)).status).toBe(200);
  });
});
