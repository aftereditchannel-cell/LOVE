import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const bucketListRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

bucketListRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM bucket_items WHERE couple_id = $1 AND deleted_at IS NULL ORDER BY is_completed ASC, created_at DESC',
      [req.user!.coupleId]
    );
    res.json(result.rows.map((b: any) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      isCompleted: b.is_completed,
      completedDate: b.completed_date,
      photoUrl: b.photo_url,
      createdBy: b.created_by,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

bucketListRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        title,
        description: description || '',
        isCompleted: false,
        createdBy: req.user!.userId,
      });
    }
    const db = getPool();
    const result = await db.query(
      `INSERT INTO bucket_items (couple_id, title, description, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user!.coupleId, title, description || '', req.user!.userId]
    );
    const b = result.rows[0];
    res.status(201).json({
      id: b.id,
      title: b.title,
      description: b.description,
      isCompleted: b.is_completed,
      completedDate: b.completed_date,
      photoUrl: b.photo_url,
      createdBy: b.created_by,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

bucketListRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true, ...req.body, id: req.params.id });
    const db = getPool();
    const { title, description, isCompleted, completedDate, photoUrl } = req.body;
    await db.query(
      `UPDATE bucket_items SET title=COALESCE($1,title), description=COALESCE($2,description), is_completed=COALESCE($3,is_completed), completed_date=COALESCE($4,completed_date), photo_url=COALESCE($5,photo_url), updated_at=NOW() WHERE id=$6 AND couple_id=$7`,
      [title, description, isCompleted, completedDate, photoUrl, req.params.id, req.user!.coupleId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

bucketListRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    await db.query('UPDATE bucket_items SET deleted_at=NOW() WHERE id=$1 AND couple_id=$2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
