import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const countdownRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

countdownRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM countdowns WHERE couple_id = $1 ORDER BY target_date ASC',
      [req.user!.coupleId]
    );
    res.json(result.rows.map((c: any) => ({
      id: c.id,
      title: c.title,
      targetDate: c.target_date,
      emoji: c.emoji,
      createdBy: c.created_by,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

countdownRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, targetDate, emoji } = req.body;
    if (!title || !targetDate) return res.status(400).json({ error: 'Title and targetDate required' });
    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        title,
        targetDate,
        emoji: emoji || '❤️',
        createdBy: req.user!.userId,
      });
    }
    const db = getPool();
    const result = await db.query(
      `INSERT INTO countdowns (couple_id, title, target_date, emoji, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user!.coupleId, title, targetDate, emoji || '❤️', req.user!.userId]
    );
    const c = result.rows[0];
    res.status(201).json({
      id: c.id,
      title: c.title,
      targetDate: c.target_date,
      emoji: c.emoji,
      createdBy: c.created_by,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

countdownRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    // countdowns table has no deleted_at, do hard delete but verify couple
    await db.query('DELETE FROM countdowns WHERE id = $1 AND couple_id = $2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
