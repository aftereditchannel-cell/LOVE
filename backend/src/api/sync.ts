import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const syncRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

// GET /api/sync/pull?since=ISO
syncRouter.get('/pull', async (req: Request, res: Response) => {
  try {
    const since = (req.query.since as string) || '1970-01-01T00:00:00Z';
    if (!isDbAvailable()) {
      return res.json({ changes: [], lastSyncTimestamp: new Date().toISOString() });
    }
    const db = getPool();
    const coupleId = req.user!.coupleId;
    const changes: any[] = [];

    // Collect changes across tables where updated_at > since
    const tables = [
      { name: 'memories', query: `SELECT * FROM memories WHERE couple_id=$1 AND updated_at > $2 AND deleted_at IS NULL` },
      { name: 'journal_entries', query: `SELECT * FROM journal_entries WHERE couple_id=$1 AND updated_at > $2 AND deleted_at IS NULL` },
      { name: 'messages', query: `SELECT * FROM messages WHERE couple_id=$1 AND updated_at > $2 AND is_deleted=FALSE` },
      { name: 'calendar_events', query: `SELECT * FROM calendar_events WHERE couple_id=$1 AND updated_at > $2 AND deleted_at IS NULL` },
      { name: 'tasks', query: `SELECT * FROM tasks WHERE couple_id=$1 AND updated_at > $2 AND deleted_at IS NULL` },
      { name: 'wishlists', query: `SELECT * FROM wishlists WHERE couple_id=$1 AND updated_at > $2 AND deleted_at IS NULL` },
      { name: 'bucket_items', query: `SELECT * FROM bucket_items WHERE couple_id=$1 AND updated_at > $2 AND deleted_at IS NULL` },
      { name: 'love_letters', query: `SELECT * FROM love_letters WHERE couple_id=$1 AND created_at > $2` },
      { name: 'countdowns', query: `SELECT * FROM countdowns WHERE couple_id=$1 AND created_at > $2` },
    ];

    for (const t of tables) {
      try {
        const result = await db.query(t.query, [coupleId, since]);
        for (const row of result.rows) {
          changes.push({
            table: t.name,
            recordId: row.id,
            operation: 'UPSERT',
            data: JSON.stringify(row),
            version: row.version || 1,
            timestamp: row.updated_at || row.created_at,
          });
        }
      } catch (e) {
        console.warn(`sync pull ${t.name} failed`, e);
      }
    }

    res.json({ changes, lastSyncTimestamp: new Date().toISOString() });
  } catch (error) {
    console.error('sync pull error', error);
    res.status(500).json({ error: 'Sync pull failed' });
  }
});

// Compat GET /api/sync
syncRouter.get('/', async (req: Request, res: Response) => {
  return res.redirect(307, `/api/sync/pull?since=${encodeURIComponent((req.query.since as string) || '1970-01-01T00:00:00Z')}`);
});

// POST /api/sync/push - push changes from client
syncRouter.post('/push', async (req: Request, res: Response) => {
  try {
    const { changes } = req.body as { changes: any[] };
    if (!changes || !Array.isArray(changes)) return res.status(400).json({ error: 'changes array required' });

    if (!isDbAvailable()) {
      // Mock - accept all
      return res.json({ accepted: changes.map((c: any) => c.recordId), conflicts: [] });
    }

    const db = getPool();
    const accepted: string[] = [];
    const conflicts: any[] = [];

    for (const change of changes) {
      try {
        const { table, recordId, operation, data } = change;
        let parsed: any = {};
        try { parsed = JSON.parse(data); } catch { parsed = data; }

        // Generic upserts per table
        switch (table) {
          case 'tasks': {
            if (operation === 'DELETE') {
              await db.query('UPDATE tasks SET deleted_at=NOW() WHERE id=$1 AND couple_id=$2', [recordId, req.user!.coupleId]);
            } else {
              await db.query(
                `INSERT INTO tasks (id, couple_id, title, description, due_date, priority, assigned_to, status, created_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, due_date=EXCLUDED.due_date, priority=EXCLUDED.priority, assigned_to=EXCLUDED.assigned_to, status=EXCLUDED.status, updated_at=NOW(), version=tasks.version+1`,
                [recordId, req.user!.coupleId, parsed.title || 'Untitled', parsed.description || '', parsed.dueDate || parsed.due_date || '', parsed.priority || 'MEDIUM', parsed.assignedTo || parsed.assigned_to || 'BOTH', parsed.status || 'TODO', req.user!.userId]
              );
            }
            accepted.push(recordId);
            break;
          }
          case 'memories': {
            if (operation === 'DELETE') {
              await db.query('UPDATE memories SET deleted_at=NOW() WHERE id=$1 AND couple_id=$2', [recordId, req.user!.coupleId]);
            } else {
              await db.query(
                `INSERT INTO memories (id, couple_id, title, description, date, location, tags, mood, privacy, created_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, date=EXCLUDED.date, location=EXCLUDED.location, tags=EXCLUDED.tags, mood=EXCLUDED.mood, privacy=EXCLUDED.privacy, updated_at=NOW(), version=memories.version+1`,
                [recordId, req.user!.coupleId, parsed.title || '', parsed.description || '', parsed.date || new Date().toISOString().split('T')[0], parsed.location || '', JSON.stringify(parsed.tags || []), parsed.mood || '', parsed.privacy || 'SHARED', req.user!.userId]
              );
            }
            accepted.push(recordId);
            break;
          }
          case 'messages': {
            if (operation === 'DELETE') {
              await db.query('UPDATE messages SET is_deleted=TRUE WHERE id=$1 AND couple_id=$2', [recordId, req.user!.coupleId]);
            } else {
              await db.query(
                `INSERT INTO messages (id, couple_id, sender_id, content, type) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
                [recordId, req.user!.coupleId, req.user!.userId, parsed.content || '', parsed.type || 'TEXT']
              );
            }
            accepted.push(recordId);
            break;
          }
          default: {
            // For other tables, just accept
            accepted.push(recordId);
            break;
          }
        }
      } catch (e) {
        console.warn('sync push item failed', e);
        conflicts.push({ recordId: change.recordId, error: String(e) });
      }
    }

    res.json({ accepted, conflicts });
  } catch (error) {
    console.error('sync push error', error);
    res.status(500).json({ error: 'Sync push failed' });
  }
});

// Compat POST /api/sync (duplicate handler for old clients)
syncRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { changes } = req.body as { changes: any[] };
    if (!changes || !Array.isArray(changes)) return res.status(400).json({ error: 'changes array required' });
    if (!isDbAvailable()) {
      return res.json({ accepted: changes.map((c: any) => c.recordId), conflicts: [] });
    }
    // Reuse push logic simple accept
    const accepted = changes.map((c: any) => c.recordId);
    res.json({ accepted, conflicts: [] });
  } catch (error) {
    res.status(500).json({ error: 'Sync push failed' });
  }
});
