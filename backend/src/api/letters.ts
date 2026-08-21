import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const letterRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

letterRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM love_letters WHERE couple_id = $1 ORDER BY created_at DESC',
      [req.user!.coupleId]
    );
    res.json(result.rows.map((l: any) => ({
      id: l.id,
      title: l.title,
      content: l.content,
      openOnDate: l.open_on_date,
      isOpened: l.is_opened,
      createdBy: l.created_by,
      recipientId: l.recipient_id,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch letters' });
  }
});

letterRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, content, openOnDate } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        title,
        content,
        openOnDate: openOnDate || '',
        isOpened: false,
        createdBy: req.user!.userId,
        recipientId: req.user!.coupleId,
      });
    }
    const db = getPool();
    // Determine recipient - the other person
    const users = await db.query('SELECT * FROM users WHERE couple_id=$1 AND id != $2', [req.user!.coupleId, req.user!.userId]);
    const recipientId = users.rows[0]?.id || req.user!.userId;
    const result = await db.query(
      `INSERT INTO love_letters (couple_id, title, content, open_on_date, created_by, recipient_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user!.coupleId, title, content, openOnDate || '', req.user!.userId, recipientId]
    );
    const l = result.rows[0];
    res.status(201).json({
      id: l.id,
      title: l.title,
      content: l.content,
      openOnDate: l.open_on_date,
      isOpened: l.is_opened,
      createdBy: l.created_by,
      recipientId: l.recipient_id,
    });
  } catch (error) {
    console.error('letters POST', error);
    res.status(500).json({ error: 'Failed to create letter' });
  }
});

letterRouter.put('/:id/open', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    await db.query('UPDATE love_letters SET is_opened=TRUE WHERE id=$1 AND couple_id=$2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to open' });
  }
});

letterRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    await db.query('DELETE FROM love_letters WHERE id=$1 AND couple_id=$2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Surprises share same table concept but separate router maybe - we handle via letters
