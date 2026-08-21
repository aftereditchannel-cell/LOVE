import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const taskRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

taskRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM tasks WHERE couple_id = $1 AND deleted_at IS NULL ORDER BY CASE status WHEN \'TODO\' THEN 0 WHEN \'IN_PROGRESS\' THEN 1 ELSE 2 END, created_at DESC',
      [req.user!.coupleId]
    );
    res.json(result.rows.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      dueDate: t.due_date,
      priority: t.priority,
      assignedTo: t.assigned_to,
      status: t.status,
      createdBy: t.created_by,
    })));
  } catch (error) {
    console.error('tasks GET', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

taskRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, dueDate, priority, assignedTo } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        title,
        description: description || '',
        dueDate: dueDate || '',
        priority: priority || 'MEDIUM',
        assignedTo: assignedTo || 'BOTH',
        status: 'TODO',
        createdBy: req.user!.userId,
      });
    }

    const db = getPool();
    const result = await db.query(
      `INSERT INTO tasks (couple_id, title, description, due_date, priority, assigned_to, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user!.coupleId, title, description || '', dueDate || '', priority || 'MEDIUM', assignedTo || 'BOTH', 'TODO', req.user!.userId]
    );
    const t = result.rows[0];
    res.status(201).json({
      id: t.id,
      title: t.title,
      description: t.description,
      dueDate: t.due_date,
      priority: t.priority,
      assignedTo: t.assigned_to,
      status: t.status,
      createdBy: t.created_by,
    });
  } catch (error) {
    console.error('tasks POST', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

taskRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true, ...req.body, id: req.params.id });
    const db = getPool();
    const existing = await db.query('SELECT * FROM tasks WHERE id=$1 AND couple_id=$2 AND deleted_at IS NULL', [req.params.id, req.user!.coupleId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const { title, description, dueDate, priority, assignedTo, status } = req.body;
    await db.query(
      `UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description), due_date=COALESCE($3,due_date), priority=COALESCE($4,priority), assigned_to=COALESCE($5,assigned_to), status=COALESCE($6,status), updated_at=NOW(), version=version+1 WHERE id=$7`,
      [title, description, dueDate, priority, assignedTo, status, req.params.id]
    );
    const updated = await db.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    const t = updated.rows[0];
    res.json({
      id: t.id,
      title: t.title,
      description: t.description,
      dueDate: t.due_date,
      priority: t.priority,
      assignedTo: t.assigned_to,
      status: t.status,
      createdBy: t.created_by,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

taskRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (!isDbAvailable()) return res.json({ id: req.params.id, status });
    const db = getPool();
    await db.query('UPDATE tasks SET status=$1, updated_at=NOW(), version=version+1 WHERE id=$2 AND couple_id=$3', [status, req.params.id, req.user!.coupleId]);
    res.json({ id: req.params.id, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

taskRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    await db.query('UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND couple_id = $2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
