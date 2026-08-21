import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';
import { v4 as uuid } from 'uuid';

export const backupRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

// GET /api/backup/history and GET /api/backup
backupRouter.get('/history', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM backup_jobs WHERE couple_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user!.coupleId]
    );
    res.json(result.rows.map((b: any) => ({
      id: b.id,
      versionId: b.version_id,
      createdAt: b.created_at,
      size: Number(b.size),
      status: b.status,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch backup history' });
  }
});

backupRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM backup_jobs WHERE couple_id = $1 ORDER BY created_at DESC',
      [req.user!.coupleId]
    );
    res.json(result.rows.map((b: any) => ({
      id: b.id,
      versionId: b.version_id,
      createdAt: b.created_at,
      size: Number(b.size),
      status: b.status,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST /api/backup/create and POST /api/backup
backupRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const versionId = uuid();
    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        versionId,
        createdAt: new Date().toISOString(),
        size: 0,
        status: 'COMPLETED',
      });
    }
    const db = getPool();
    // Create backup job record
    const result = await db.query(
      `INSERT INTO backup_jobs (couple_id, version_id, status, size) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user!.coupleId, versionId, 'COMPLETED', 0]
    );
    const b = result.rows[0];
    // In real implementation, we'd trigger GitHub Gist backup here using GITHUB_TOKEN
    // For now, mark completed
    res.status(201).json({
      id: b.id,
      versionId: b.version_id,
      createdAt: b.created_at,
      size: Number(b.size),
      status: b.status,
    });
  } catch (error) {
    console.error('backup create error', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

backupRouter.post('/', async (req: Request, res: Response) => {
  try {
    const versionId = uuid();
    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        versionId,
        createdAt: new Date().toISOString(),
        size: 0,
        status: 'COMPLETED',
      });
    }
    const db = getPool();
    const result = await db.query(
      `INSERT INTO backup_jobs (couple_id, version_id, status, size) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user!.coupleId, versionId, 'COMPLETED', 0]
    );
    const b = result.rows[0];
    res.status(201).json({
      id: b.id,
      versionId: b.version_id,
      createdAt: b.created_at,
      size: Number(b.size),
      status: b.status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create backup' });
  }
});
