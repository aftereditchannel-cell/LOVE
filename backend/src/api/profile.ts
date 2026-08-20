import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const profileRouter = Router();

profileRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    const u = result.rows[0];
    res.json({
      id: u.id, role: u.role, name: u.name, nickname: u.nickname,
      birthday: u.birthday, photoUrl: u.photo_url, favoriteColor: u.favorite_color,
      favoriteThings: u.favorite_things, loveLanguage: u.love_language,
    });
  } catch (error) { res.status(500).json({ error: 'Failed to get profile' }); }
});

profileRouter.put('/', async (req: Request, res: Response) => {
  try {
    const { name, nickname, birthday, favoriteColor, favoriteThings, loveLanguage } = req.body;
    const db = getPool();
    await db.query(
      `UPDATE users SET name = COALESCE($1, name), nickname = COALESCE($2, nickname),
       birthday = COALESCE($3, birthday), favorite_color = COALESCE($4, favorite_color),
       favorite_things = COALESCE($5, favorite_things), love_language = COALESCE($6, love_language),
       updated_at = NOW() WHERE id = $7`,
      [name, nickname, birthday, favoriteColor, favoriteThings, loveLanguage, req.user!.userId]
    );
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.userId]);
    const u = result.rows[0];
    res.json({
      id: u.id, role: u.role, name: u.name, nickname: u.nickname,
      birthday: u.birthday, photoUrl: u.photo_url, favoriteColor: u.favorite_color,
      favoriteThings: u.favorite_things, loveLanguage: u.love_language,
    });
  } catch (error) { res.status(500).json({ error: 'Failed to update profile' }); }
});

profileRouter.get('/partner', async (req: Request, res: Response) => {
  try {
    const db = getPool();
    const result = await db.query(
      'SELECT * FROM users WHERE couple_id = $1 AND id != $2',
      [req.user!.coupleId, req.user!.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Partner not found' });
    const u = result.rows[0];
    // Limited partner view
    res.json({ id: u.id, name: u.name, nickname: u.nickname, birthday: u.birthday, loveLanguage: u.love_language });
  } catch (error) { res.status(500).json({ error: 'Failed to get partner profile' }); }
});
