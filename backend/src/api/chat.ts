import { Router, Request, Response } from 'express';
import { getPool } from '../database/init';

export const chatRouter = Router();

function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

// GET /api/chat - list messages
chatRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) {
      return res.json([]);
    }
    const db = getPool();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const before = req.query.before as string | undefined;
    let result;
    if (before) {
      result = await db.query(
        'SELECT * FROM messages WHERE couple_id = $1 AND created_at < $2 AND is_deleted = FALSE ORDER BY created_at DESC LIMIT $3',
        [req.user!.coupleId, before, limit]
      );
    } else {
      result = await db.query(
        'SELECT * FROM messages WHERE couple_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC LIMIT $2',
        [req.user!.coupleId, limit]
      );
    }
    res.json(result.rows.map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      content: m.content,
      type: m.type,
      replyToId: m.reply_to_id,
      reactions: m.reactions || [],
      isPinned: m.is_pinned,
      isEdited: m.is_edited,
      seenAt: m.seen_at,
      createdAt: m.created_at,
    })));
  } catch (error) {
    console.error('chat GET error', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/chat - send message (token data registration)
chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { content, type, replyToId } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content required' });
    }
    if (content.length > 10000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    if (!isDbAvailable()) {
      // Mock mode - echo back as if saved on token
      return res.status(201).json({
        id: `mock-${Date.now()}`,
        senderId: req.user!.userId,
        content: content.trim(),
        type: type || 'TEXT',
        replyToId: replyToId || null,
        reactions: [],
        isPinned: false,
        isEdited: false,
        createdAt: new Date().toISOString(),
      });
    }

    const db = getPool();
    const result = await db.query(
      `INSERT INTO messages (couple_id, sender_id, content, type, reply_to_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user!.coupleId, req.user!.userId, content.trim(), type || 'TEXT', replyToId || null]
    );
    const m = result.rows[0];
    res.status(201).json({
      id: m.id,
      senderId: m.sender_id,
      content: m.content,
      type: m.type,
      replyToId: m.reply_to_id,
      reactions: m.reactions || [],
      isPinned: m.is_pinned,
      isEdited: m.is_edited,
      seenAt: m.seen_at,
      createdAt: m.created_at,
    });
  } catch (error) {
    console.error('chat POST error', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /api/chat/:id - edit message
chatRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    if (!isDbAvailable()) return res.json({ id: req.params.id, content, isEdited: true });

    const db = getPool();
    const existing = await db.query('SELECT * FROM messages WHERE id = $1 AND couple_id = $2', [req.params.id, req.user!.coupleId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    if (existing.rows[0].sender_id !== req.user!.userId) return res.status(403).json({ error: 'Can only edit own messages' });

    const result = await db.query(
      `UPDATE messages SET content = $1, is_edited = TRUE, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [content, req.params.id]
    );
    const m = result.rows[0];
    res.json({
      id: m.id,
      senderId: m.sender_id,
      content: m.content,
      type: m.type,
      isEdited: m.is_edited,
      createdAt: m.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// POST /api/chat/:id/reaction
chatRouter.post('/:id/reaction', async (req: Request, res: Response) => {
  try {
    const { reaction } = req.body;
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    await db.query(
      `UPDATE messages SET reactions = reactions || $1::jsonb WHERE id = $2 AND couple_id = $3`,
      [JSON.stringify([reaction]), req.params.id, req.user!.coupleId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

chatRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDbAvailable()) return res.json({ success: true });
    const db = getPool();
    const existing = await db.query('SELECT * FROM messages WHERE id = $1 AND couple_id = $2', [req.params.id, req.user!.coupleId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await db.query('UPDATE messages SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});
