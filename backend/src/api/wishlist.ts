import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const wishlistRouter = Router();

wishlistRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM wishlists WHERE couple_id = $1 ORDER BY created_at DESC',
      [req.user!.coupleId]
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch' }); }
});

wishlistRouter.post('/', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    res.json({ success: true, data: req.body });
  } catch (error) { res.status(500).json({ error: 'Failed to create' }); }
});
