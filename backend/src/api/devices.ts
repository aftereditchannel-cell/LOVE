import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const deviceRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

deviceRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      // Return at least current device as mock
      return res.json([{
        id: req.user!.deviceId,
        deviceName: 'Current Device',
        deviceId: req.user!.deviceId,
        platform: 'android',
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }]);
    }
    const db = getPool();
    // devices table has no couple_id, join via users
    const result = await db.query(
      `SELECT d.* FROM devices d JOIN users u ON d.user_id = u.id WHERE u.couple_id = $1 ORDER BY d.created_at DESC`,
      [req.user!.coupleId]
    );
    res.json(result.rows.map((d: any) => ({
      id: d.id,
      deviceName: d.device_name,
      deviceId: d.device_id,
      platform: d.platform,
      lastSeen: d.last_seen,
      createdAt: d.created_at,
    })));
  } catch (error) {
    console.error('devices GET', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

deviceRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { deviceName, deviceId, platform } = req.body;
    if (!isDbAvailable()) return res.json({ success: true, deviceId: deviceId || req.user!.deviceId });
    const db = getPool();
    if (deviceId) {
      const existing = await db.query('SELECT * FROM devices WHERE device_id=$1', [deviceId]);
      if (existing.rows.length === 0) {
        await db.query('INSERT INTO devices (user_id, device_name, device_id, platform) VALUES ($1,$2,$3,$4)', [req.user!.userId, deviceName || 'Android', deviceId, platform || 'android']);
      } else {
        await db.query('UPDATE devices SET last_seen=NOW(), revoked_at=NULL WHERE device_id=$1', [deviceId]);
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register device' });
  }
});

deviceRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    // id may be device_id or actual id
    const param = req.params.id;
    // Try by id then by device_id
    let result = await db.query('UPDATE devices SET revoked_at=NOW() WHERE id=$1 RETURNING *', [param]);
    if (result.rowCount === 0) {
      result = await db.query('UPDATE devices SET revoked_at=NOW() WHERE device_id=$1 RETURNING *', [param]);
    }
    if (result.rowCount === 0) {
      // Also try join check to ensure couple isolation - delete only if belongs to couple
      await db.query(`UPDATE devices SET revoked_at=NOW() WHERE device_id=$1 AND user_id IN (SELECT id FROM users WHERE couple_id=$2)`, [param, req.user!.coupleId]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('devices DELETE', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});
