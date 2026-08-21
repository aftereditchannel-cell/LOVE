import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const questionRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

// Default questions for fallback
const defaultQuestions = [
  "امروز بیشتر از همه دلت چی می‌خواد؟",
  "کدوم خاطرمون رو هیچ‌وقت فراموش نمی‌کنی؟",
  "اگر همین الان سفر می‌رفتیم کجا می‌رفتیم؟",
  "امروز از چه چیزی ممنونی؟",
  "یک چیز که امروز لبخند رو لبت آورد؟",
  "چه آهنگی الان حالت رو خوب می‌کنه؟",
  "اگر فردا تعطیل بود چیکار می‌کردی؟",
  "بزرگترین آرزومون برای آینده چیه؟",
];

// GET /api/questions - list or today
questionRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      const today = new Date().toISOString().split('T')[0];
      const q = defaultQuestions[new Date().getDate() % defaultQuestions.length];
      return res.json([{ id: `default-${today}`, question: q, date: today }]);
    }
    const db = getPool();
    const result = await db.query('SELECT * FROM daily_questions ORDER BY date DESC LIMIT 20');
    if (result.rows.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const q = defaultQuestions[new Date().getDate() % defaultQuestions.length];
      return res.json([{ id: `default-${today}`, question: q, date: today }]);
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

questionRouter.get('/today', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    if (!isDbAvailable()) {
      const q = defaultQuestions[new Date().getDate() % defaultQuestions.length];
      return res.json({ id: `default-${today}`, question: q, date: today });
    }
    const db = getPool();
    let result = await db.query('SELECT * FROM daily_questions WHERE date = $1', [today]);
    if (result.rows.length === 0) {
      const q = defaultQuestions[new Date().getDate() % defaultQuestions.length];
      // Try to insert today's question
      try {
        const inserted = await db.query('INSERT INTO daily_questions (question, date) VALUES ($1,$2) RETURNING *', [q, today]);
        result = inserted;
      } catch (e) {
        // ignore conflict
        result = await db.query('SELECT * FROM daily_questions WHERE date = $1', [today]);
        if (result.rows.length === 0) return res.json({ id: `default-${today}`, question: q, date: today });
      }
    }
    const row = result.rows[0];
    res.json({ id: row.id, question: row.question, date: row.date });
  } catch (error) {
    const today = new Date().toISOString().split('T')[0];
    const q = defaultQuestions[new Date().getDate() % defaultQuestions.length];
    res.json({ id: `default-${today}`, question: q, date: today });
  }
});

questionRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { question, date } = req.body;
    if (!isDbAvailable()) return res.json({ success: true, data: req.body });
    const db = getPool();
    if (question) {
      const result = await db.query('INSERT INTO daily_questions (question, date) VALUES ($1,$2) RETURNING *', [question, date || new Date().toISOString().split('T')[0]]);
      return res.json(result.rows[0]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

questionRouter.post('/answer', async (req: Request, res: Response) => {
  try {
    const { questionId, answer } = req.body;
    if (!answer) return res.status(400).json({ error: 'Answer required' });
    if (!questionId) return res.status(400).json({ error: 'QuestionId required' });
    if (!isDbAvailable()) {
      return res.json({ id: `mock-${Date.now()}`, questionId, userId: req.user!.userId, answer });
    }
    const db = getPool();
    // Verify question exists or is default
    let qId = questionId;
    if (questionId.startsWith('default-')) {
      // Create real question entry for default
      const date = questionId.replace('default-', '');
      const qText = defaultQuestions[new Date().getDate() % defaultQuestions.length];
      const inserted = await db.query('INSERT INTO daily_questions (question, date) VALUES ($1,$2) ON CONFLICT (date) DO UPDATE SET question=EXCLUDED.question RETURNING *', [qText, date]);
      qId = inserted.rows[0].id;
    }
    const result = await db.query(
      `INSERT INTO question_answers (question_id, user_id, couple_id, answer) VALUES ($1,$2,$3,$4) RETURNING *`,
      [qId, req.user!.userId, req.user!.coupleId, answer]
    );
    const row = result.rows[0];
    res.status(201).json({ id: row.id, questionId: row.question_id, userId: row.user_id, answer: row.answer });
  } catch (error) {
    console.error('answer error', error);
    res.status(500).json({ error: 'Failed to answer' });
  }
});

questionRouter.get('/:id/answers', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json([]);
    const db = getPool();
    const result = await db.query('SELECT * FROM question_answers WHERE question_id=$1 AND couple_id=$2 ORDER BY created_at ASC', [req.params.id, req.user!.coupleId]);
    res.json(result.rows.map((r: any) => ({ id: r.id, questionId: r.question_id, userId: r.user_id, answer: r.answer, createdAt: r.created_at })));
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});
