import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const syncRouter = Router();

syncRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    res.json({ message: 'Sync endpoint' });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch' }); }
});

syncRouter.post('/', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    res.json({ success: true, data: req.body });
  } catch (error) { res.status(500).json({ error: 'Failed to create' }); }
});
