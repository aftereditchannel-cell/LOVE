import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';
import { verifyPrivateAccess } from '../middleware/coupleIsolation';

export const journalRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

journalRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const privacy = req.query.privacy as string | undefined;
    let query = 'SELECT * FROM journal_entries WHERE couple_id=$1 AND deleted_at IS NULL';
    const params: any[] = [req.user!.coupleId];
    if (privacy) {
      query += ' AND privacy=$2';
      params.push(privacy);
    } else {
      // Shared + own private
      query += ' AND (privacy=\'SHARED\' OR created_by=$2)';
      params.push(req.user!.userId);
    }
    query += ' ORDER BY date DESC, created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows.map((j: any) => ({
      id: j.id,
      title: j.title,
      content: j.content,
      mood: j.mood,
      date: j.date,
      tags: j.tags || [],
      privacy: j.privacy,
      createdBy: j.created_by,
    })));
  } catch (error) {
    console.error('journal GET', error);
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
});

journalRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, content, mood, date, tags, privacy } = req.body;
    if (!title || !content || !date) return res.status(400).json({ error: 'Title, content, date required' });
    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        title,
        content,
        mood: mood || '',
        date,
        tags: tags || [],
        privacy: privacy || 'PRIVATE',
        createdBy: req.user!.userId,
      });
    }
    const db = getPool();
    const result = await db.query(
      `INSERT INTO journal_entries (couple_id, title, content, mood, date, tags, privacy, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user!.coupleId, title, content, mood || '', date, JSON.stringify(tags || []), privacy || 'PRIVATE', req.user!.userId]
    );
    const j = result.rows[0];
    res.status(201).json({
      id: j.id,
      title: j.title,
      content: j.content,
      mood: j.mood,
      date: j.date,
      tags: j.tags,
      privacy: j.privacy,
      createdBy: j.created_by,
    });
  } catch (error) {
    console.error('journal POST', error);
    res.status(500).json({ error: 'Failed to create' });
  }
});

journalRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true, ...req.body, id: req.params.id });
    const db = getPool();
    const existing = await db.query('SELECT * FROM journal_entries WHERE id=$1 AND couple_id=$2 AND deleted_at IS NULL', [req.params.id, req.user!.coupleId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!verifyPrivateAccess(existing.rows[0].created_by, req.user!.userId, existing.rows[0].privacy)) return res.status(403).json({ error: 'Access denied' });
    const { title, content, mood, date, tags, privacy } = req.body;
    await db.query(
      `UPDATE journal_entries SET title=COALESCE($1,title), content=COALESCE($2,content), mood=COALESCE($3,mood), date=COALESCE($4,date), tags=COALESCE($5,tags), privacy=COALESCE($6,privacy), updated_at=NOW() WHERE id=$7`,
      [title, content, mood, date, tags ? JSON.stringify(tags) : null, privacy, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

journalRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    await db.query('UPDATE journal_entries SET deleted_at = NOW() WHERE id = $1 AND couple_id = $2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
