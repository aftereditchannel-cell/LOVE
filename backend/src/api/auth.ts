import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getPool } from '../database/init';
import { generateSessionToken } from '../middleware/auth';

export const authRouter = Router();

/**
 * POST /api/auth/pair
 * Two-person token pairing — the only way to authenticate.
 */
authRouter.post('/pair', async (req: Request, res: Response) => {
  try {
    const { personalToken, partnerToken, role, deviceName, deviceId } = req.body;

    if (!personalToken || !partnerToken || !role || !deviceName || !deviceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['PERSON_A', 'PERSON_B'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const db = getPool();

    // Look up tokens
    const personalTokenHash = await bcrypt.hash(personalToken, 10);
    const personalResult = await db.query(
      'SELECT * FROM access_tokens WHERE token_hash = $1 AND role = $2 AND revoked_at IS NULL',
      [personalToken, role]
    );

    // For first-time setup, create users and couple if they don't exist
    let userId: string;
    let coupleId: string;
    let personAName: string;
    let personBName: string;

    // Check if couple already exists
    const existingCouple = await db.query('SELECT * FROM couples LIMIT 1');

    if (existingCouple.rows.length > 0) {
      // Existing couple — validate tokens
      coupleId = existingCouple.rows[0].id;
      const users = await db.query('SELECT * FROM users WHERE couple_id = $1', [coupleId]);

      const self = users.rows.find((u: any) => u.role === role);
      if (!self) {
        return res.status(403).json({ error: 'Invalid role for this couple' });
      }

      // Validate personal token
      const tokenRecord = await db.query(
        'SELECT * FROM access_tokens WHERE user_id = $1 AND revoked_at IS NULL',
        [self.id]
      );

      if (tokenRecord.rows.length === 0) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      const validToken = await bcrypt.compare(personalToken, tokenRecord.rows[0].token_hash);
      if (!validToken) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      userId = self.id;
      const personA = users.rows.find((u: any) => u.role === 'PERSON_A');
      const personB = users.rows.find((u: any) => u.role === 'PERSON_B');
      personAName = personA?.name || 'Person A';
      personBName = personB?.name || 'Person B';
    } else {
      // First-time setup — create couple
      coupleId = uuid();
      const userAId = uuid();
      const userBId = uuid();

      userId = role === 'PERSON_A' ? userAId : userBId;
      personAName = 'امیر';
      personBName = 'ستایش';

      // Create users
      await db.query(
        'INSERT INTO users (id, couple_id, role, name) VALUES ($1, $2, $3, $4)',
        [userAId, coupleId, 'PERSON_A', personAName]
      );
      await db.query(
        'INSERT INTO users (id, couple_id, role, name) VALUES ($1, $2, $3, $4)',
        [userBId, coupleId, 'PERSON_B', personBName]
      );

      // Create couple
      await db.query(
        'INSERT INTO couples (id, person_a_id, person_b_id) VALUES ($1, $2, $3)',
        [coupleId, userAId, userBId]
      );

      // Store token hashes
      const personalHash = await bcrypt.hash(personalToken, 12);
      const partnerHash = await bcrypt.hash(partnerToken, 12);

      const selfId = role === 'PERSON_A' ? userAId : userBId;
      const partnerId = role === 'PERSON_A' ? userBId : userAId;

      await db.query(
        'INSERT INTO access_tokens (user_id, token_hash, role, scopes) VALUES ($1, $2, $3, $4)',
        [selfId, personalHash, role, 'profile:self:read,profile:self:write,mood:self:read,mood:self:write,shared:read,shared:write,partner:read-limited']
      );
      await db.query(
        'INSERT INTO access_tokens (user_id, token_hash, role, scopes) VALUES ($1, $2, $3, $4)',
        [partnerId, partnerHash, role === 'PERSON_A' ? 'PERSON_B' : 'PERSON_A', 'profile:self:read,profile:self:write,mood:self:read,mood:self:write,shared:read,shared:write,partner:read-limited']
      );
    }

    // Register device
    const existingDevice = await db.query('SELECT * FROM devices WHERE device_id = $1', [deviceId]);
    if (existingDevice.rows.length === 0) {
      await db.query(
        'INSERT INTO devices (user_id, device_name, device_id, platform) VALUES ($1, $2, $3, $4)',
        [userId, deviceName, deviceId, 'android']
      );
    } else {
      await db.query(
        'UPDATE devices SET last_seen = NOW(), revoked_at = NULL WHERE device_id = $1',
        [deviceId]
      );
    }

    // Generate session token
    const sessionToken = generateSessionToken({
      userId,
      coupleId,
      role,
      deviceId,
    });

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, couple_id, action, resource, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, coupleId, 'PAIR_DEVICE', 'device', req.ip, req.headers['user-agent']]
    );

    res.json({
      sessionToken,
      userId,
      coupleId,
      personAName,
      personBName,
      paired: true,
    });
  } catch (error) {
    console.error('Pair error:', error);
    res.status(500).json({ error: 'Pairing failed' });
  }
});

/**
 * POST /api/auth/validate
 * Validate a token without pairing.
 */
authRouter.post('/validate', async (req: Request, res: Response) => {
  try {
    const { token, role } = req.body;
    if (!token || !role) {
      return res.status(400).json({ valid: false });
    }

    // In first-time setup, any token is valid
    const db = getPool();
    const existingCouple = await db.query('SELECT * FROM couples LIMIT 1');

    if (existingCouple.rows.length === 0) {
      return res.json({ valid: true, name: role === 'PERSON_A' ? 'امیر' : 'ستایش' });
    }

    // Validate against stored tokens
    const users = await db.query('SELECT * FROM users WHERE role = $1', [role]);
    if (users.rows.length === 0) {
      return res.json({ valid: false });
    }

    const tokenRecords = await db.query(
      'SELECT * FROM access_tokens WHERE user_id = $1 AND revoked_at IS NULL',
      [users.rows[0].id]
    );

    for (const record of tokenRecords.rows) {
      const valid = await bcrypt.compare(token, record.token_hash);
      if (valid) {
        return res.json({ valid: true, name: users.rows[0].name });
      }
    }

    res.json({ valid: false });
  } catch (error) {
    res.status(500).json({ valid: false });
  }
});

/**
 * POST /api/auth/unpair
 * Unpair a device.
 */
authRouter.post('/unpair', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const db = getPool();
    await db.query(
      'UPDATE devices SET revoked_at = NOW() WHERE device_id = $1',
      [user.deviceId]
    );

    await db.query(
      'INSERT INTO audit_logs (user_id, couple_id, action, resource, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [user.userId, user.coupleId, 'UNPAIR_DEVICE', 'device', req.ip]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Unpair failed' });
  }
});
