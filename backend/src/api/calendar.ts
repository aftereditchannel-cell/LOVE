import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const calendarRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

calendarRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    let query = 'SELECT * FROM calendar_events WHERE couple_id = $1 AND deleted_at IS NULL';
    const params: any[] = [req.user!.coupleId];
    if (from) {
      params.push(from);
      query += ` AND date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND date <= $${params.length}`;
    }
    query += ' ORDER BY date ASC';
    const result = await db.query(query, params);
    res.json(result.rows.map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      endDate: e.end_date,
      type: e.type,
      isRecurring: e.is_recurring,
      hasReminder: e.has_reminder,
      reminderMinutes: e.reminder_minutes,
      createdBy: e.created_by,
    })));
  } catch (error) {
    console.error('calendar GET', error);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

calendarRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, date, endDate, type, isRecurring, hasReminder, reminderMinutes } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Title and date required' });

    if (!isDbAvailable()) {
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        title,
        description: description || '',
        date,
        endDate: endDate || '',
        type: type || 'CUSTOM',
        isRecurring: !!isRecurring,
        hasReminder: hasReminder !== false,
        reminderMinutes: reminderMinutes || 30,
        createdBy: req.user!.userId,
      });
    }

    const db = getPool();
    const result = await db.query(
      `INSERT INTO calendar_events (couple_id, title, description, date, end_date, type, is_recurring, has_reminder, reminder_minutes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user!.coupleId, title, description || '', date, endDate || '', type || 'CUSTOM', !!isRecurring, hasReminder !== false, reminderMinutes || 30, req.user!.userId]
    );
    const e = result.rows[0];
    res.status(201).json({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      endDate: e.end_date,
      type: e.type,
      isRecurring: e.is_recurring,
      hasReminder: e.has_reminder,
      reminderMinutes: e.reminder_minutes,
      createdBy: e.created_by,
    });
  } catch (error) {
    console.error('calendar POST', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

calendarRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true, ...req.body, id: req.params.id });
    const db = getPool();
    const existing = await db.query('SELECT * FROM calendar_events WHERE id=$1 AND couple_id=$2', [req.params.id, req.user!.coupleId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const { title, description, date, endDate, type, isRecurring, hasReminder, reminderMinutes } = req.body;
    await db.query(
      `UPDATE calendar_events SET title=COALESCE($1,title), description=COALESCE($2,description), date=COALESCE($3,date), end_date=COALESCE($4,end_date), type=COALESCE($5,type), is_recurring=COALESCE($6,is_recurring), has_reminder=COALESCE($7,has_reminder), reminder_minutes=COALESCE($8,reminder_minutes), updated_at=NOW() WHERE id=$9`,
      [title, description, date, endDate, type, isRecurring, hasReminder, reminderMinutes, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

calendarRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    await db.query('UPDATE calendar_events SET deleted_at = NOW() WHERE id = $1 AND couple_id = $2', [req.params.id, req.user!.coupleId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
