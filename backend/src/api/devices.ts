import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const deviceRouter = Router();

deviceRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM devices WHERE couple_id = $1 ORDER BY created_at DESC',
      [req.user!.coupleId]
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch' }); }
});

deviceRouter.post('/', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    res.json({ success: true, data: req.body });
  } catch (error) { res.status(500).json({ error: 'Failed to create' }); }
});

deviceRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    await db.query('UPDATE devices SET deleted_at = NOW() WHERE id = $1 AND couple_id = $2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete' }); }
});
