import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const coupleRouter = Router();

coupleRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    const result = await db.query('SELECT * FROM couples WHERE id = $1', [req.user!.coupleId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Couple not found' });
    const c = result.rows[0];
    res.json({
      id: c.id, name: c.name, startDate: c.start_date, anniversary: c.anniversary,
      favoritePlace: c.favorite_place, favoriteSong: c.favorite_song, ourStory: c.our_story,
    });
  } catch (error) { res.status(500).json({ error: 'Failed to get couple' }); }
});

coupleRouter.put('/', async (req: Request, res: Response) => {
  try {
    const { name, startDate, anniversary, favoritePlace, favoriteSong, ourStory } = req.body;
    const db = getPool();
    await db.query(
      `UPDATE couples SET name = COALESCE($1, name), start_date = COALESCE($2, start_date),
       anniversary = COALESCE($3, anniversary), favorite_place = COALESCE($4, favorite_place),
       favorite_song = COALESCE($5, favorite_song), our_story = COALESCE($6, our_story),
       updated_at = NOW() WHERE id = $7`,
      [name, startDate, anniversary, favoritePlace, favoriteSong, ourStory, req.user!.coupleId]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to update couple' }); }
});
