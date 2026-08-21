import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';
export const moodRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

moodRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM moods WHERE user_id = $1 ORDER BY date DESC LIMIT 30',
      [req.user!.userId]
    );
    res.json(result.rows.map((m: any) => ({
      id: m.id, userId: m.user_id, mood: m.mood, energy: m.energy, stress: m.stress,
      sleep: m.sleep, loveLevel: m.love_level, socialBattery: m.social_battery,
      note: m.note, date: m.date,
    })));
  } catch (error) { res.status(500).json({ error: 'Failed to get moods' }); }
});

moodRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { mood, energy, stress, sleep, loveLevel, socialBattery, note, date } = req.body;
    if (!mood || !date) return res.status(400).json({ error: 'Mood and date required' });
    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        userId: req.user!.userId,
        mood,
        energy: energy || 5,
        stress: stress || 5,
        sleep: sleep || 5,
        loveLevel: loveLevel || 5,
        socialBattery: socialBattery || 5,
        note: note || '',
        date,
      });
    }
    const db = getPool();
    // Ensure unique index exists for upsert
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_moods_user_date_unique ON moods(user_id, date)`);
    
    const result = await db.query(
      `INSERT INTO moods (user_id, couple_id, mood, energy, stress, sleep, love_level, social_battery, note, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, date) DO UPDATE SET mood = EXCLUDED.mood, energy = EXCLUDED.energy, stress = EXCLUDED.stress, sleep = EXCLUDED.sleep,
       love_level = EXCLUDED.love_level, social_battery = EXCLUDED.social_battery, note = EXCLUDED.note, couple_id = EXCLUDED.couple_id
       RETURNING *`,
      [req.user!.userId, req.user!.coupleId, mood, energy || 5, stress || 5, sleep || 5, loveLevel || 5, socialBattery || 5, note || '', date]
    );
    const m = result.rows[0];
    res.json({
      id: m.id, userId: m.user_id, mood: m.mood, energy: m.energy, stress: m.stress,
      sleep: m.sleep, loveLevel: m.love_level, socialBattery: m.social_battery,
      note: m.note, date: m.date,
    });
  } catch (error) {
    console.error('moods POST error', error);
    res.status(500).json({ error: 'Failed to create mood' });
  }
});

moodRouter.get('/partner/today', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.status(404).json({ error: 'No partner mood today' });
    const db = getPool();
    const today = new Date().toISOString().split('T')[0];
    const result = await db.query(
      'SELECT * FROM moods WHERE couple_id = $1 AND user_id != $2 AND date = $3 ORDER BY created_at DESC LIMIT 1',
      [req.user!.coupleId, req.user!.userId, today]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No partner mood today' });
    const m = result.rows[0];
    res.json({ id: m.id, mood: m.mood, energy: m.energy, date: m.date, note: m.note, loveLevel: m.love_level });
  } catch (error) { res.status(500).json({ error: 'Failed to get partner mood' }); }
});
