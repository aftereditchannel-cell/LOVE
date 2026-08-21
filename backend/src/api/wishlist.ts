import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';
import { verifyPrivateAccess } from '../middleware/coupleIsolation';

export const wishlistRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

wishlistRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const result = await db.query(
      `SELECT * FROM wishlists WHERE couple_id = $1 AND deleted_at IS NULL AND (privacy='SHARED' OR created_by=$2) ORDER BY created_at DESC`,
      [req.user!.coupleId, req.user!.userId]
    );
    res.json(result.rows.map((w: any) => ({
      id: w.id,
      title: w.title,
      description: w.description,
      category: w.category,
      privacy: w.privacy,
      isCompleted: w.is_completed,
      createdBy: w.created_by,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

wishlistRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, category, privacy } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        title,
        description: description || '',
        category: category || '',
        privacy: privacy || 'SHARED',
        isCompleted: false,
        createdBy: req.user!.userId,
      });
    }
    const db = getPool();
    const result = await db.query(
      `INSERT INTO wishlists (couple_id, title, description, category, privacy, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user!.coupleId, title, description || '', category || '', privacy || 'SHARED', req.user!.userId]
    );
    const w = result.rows[0];
    res.status(201).json({
      id: w.id,
      title: w.title,
      description: w.description,
      category: w.category,
      privacy: w.privacy,
      isCompleted: w.is_completed,
      createdBy: w.created_by,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

wishlistRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true, ...req.body, id: req.params.id });
    const db = getPool();
    const existing = await db.query('SELECT * FROM wishlists WHERE id=$1 AND couple_id=$2', [req.params.id, req.user!.coupleId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!verifyPrivateAccess(existing.rows[0].created_by, req.user!.userId, existing.rows[0].privacy)) return res.status(403).json({ error: 'Access denied' });
    const { title, description, category, privacy, isCompleted } = req.body;
    await db.query(
      `UPDATE wishlists SET title=COALESCE($1,title), description=COALESCE($2,description), category=COALESCE($3,category), privacy=COALESCE($4,privacy), is_completed=COALESCE($5,is_completed), updated_at=NOW() WHERE id=$6`,
      [title, description, category, privacy, isCompleted, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

wishlistRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    await db.query('UPDATE wishlists SET deleted_at=NOW() WHERE id=$1 AND couple_id=$2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
