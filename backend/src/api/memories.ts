import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';
import { verifyPrivateAccess } from '../middleware/coupleIsolation';
export const memoryRouter = Router();

memoryRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    const result = await db.query(
      `SELECT * FROM memories WHERE couple_id = $1 AND deleted_at IS NULL
       AND (privacy = 'SHARED' OR created_by = $2) ORDER BY date DESC`,
      [req.user!.coupleId, req.user!.userId]
    );
    res.json(result.rows.map((m: any) => ({
      id: m.id, title: m.title, description: m.description, date: m.date,
      location: m.location, tags: m.tags, mood: m.mood, privacy: m.privacy,
      createdBy: m.created_by, mediaUrls: m.media_urls, isFavorite: m.is_favorite,
    })));
  } catch (error) { res.status(500).json({ error: 'Failed to get memories' }); }
});

memoryRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, date, location, tags, mood, privacy } = req.body;
    const db = getPool();
    const result = await db.query(
      `INSERT INTO memories (couple_id, title, description, date, location, tags, mood, privacy, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user!.coupleId, title, description || '', date, location || '', JSON.stringify(tags || []),
       mood || '', privacy || 'SHARED', req.user!.userId]
    );
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to create memory' }); }
});

memoryRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    const existing = await db.query('SELECT * FROM memories WHERE id = $1 AND couple_id = $2', [req.params.id, req.user!.coupleId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!verifyPrivateAccess(existing.rows[0].created_by, req.user!.userId, existing.rows[0].privacy)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { title, description, date, location, tags, mood, privacy } = req.body;
    await db.query(
      `UPDATE memories SET title = COALESCE($1, title), description = COALESCE($2, description),
       date = COALESCE($3, date), location = COALESCE($4, location), tags = COALESCE($5, tags),
       mood = COALESCE($6, mood), privacy = COALESCE($7, privacy), updated_at = NOW() WHERE id = $8`,
      [title, description, date, location, tags ? JSON.stringify(tags) : null, mood, privacy, req.params.id]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to update memory' }); }
});

memoryRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    await db.query('UPDATE memories SET deleted_at = NOW() WHERE id = $1 AND couple_id = $2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete memory' }); }
});
