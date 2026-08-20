import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { authRouter } from './api/auth';
import { profileRouter } from './api/profile';
import { coupleRouter } from './api/couple';
import { moodRouter } from './api/moods';
import { memoryRouter } from './api/memories';
import { journalRouter } from './api/journal';
import { chatRouter } from './api/chat';
import { calendarRouter } from './api/calendar';
import { taskRouter } from './api/tasks';
import { wishlistRouter } from './api/wishlist';
import { bucketListRouter } from './api/bucketList';
import { letterRouter } from './api/letters';
import { questionRouter } from './api/questions';
import { countdownRouter } from './api/countdowns';
import { backupRouter } from './api/backup';
import { deviceRouter } from './api/devices';
import { syncRouter } from './api/sync';
import { setupWebSocket } from './workers/websocket';
import { authMiddleware } from './middleware/auth';
import { coupleIsolationMiddleware } from './middleware/coupleIsolation';
import { errorHandler } from './middleware/errorHandler';
import { initDatabase } from './database/init';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id', 'X-Couple-Id'],
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts.' },
});

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', name: 'Couple OS API', version: '1.0.0' });
});

// Auth routes (no auth middleware)
app.use('/api/auth', authLimiter, authRouter);

// Protected routes
app.use('/api/profile', authMiddleware, coupleIsolationMiddleware, profileRouter);
app.use('/api/couple', authMiddleware, coupleIsolationMiddleware, coupleRouter);
app.use('/api/moods', authMiddleware, coupleIsolationMiddleware, moodRouter);
app.use('/api/memories', authMiddleware, coupleIsolationMiddleware, memoryRouter);
app.use('/api/journal', authMiddleware, coupleIsolationMiddleware, journalRouter);
app.use('/api/chat', authMiddleware, coupleIsolationMiddleware, chatRouter);
app.use('/api/calendar', authMiddleware, coupleIsolationMiddleware, calendarRouter);
app.use('/api/tasks', authMiddleware, coupleIsolationMiddleware, taskRouter);
app.use('/api/wishlist', authMiddleware, coupleIsolationMiddleware, wishlistRouter);
app.use('/api/bucket-list', authMiddleware, coupleIsolationMiddleware, bucketListRouter);
app.use('/api/letters', authMiddleware, coupleIsolationMiddleware, letterRouter);
app.use('/api/questions', authMiddleware, coupleIsolationMiddleware, questionRouter);
app.use('/api/countdowns', authMiddleware, coupleIsolationMiddleware, countdownRouter);
app.use('/api/backup', authMiddleware, coupleIsolationMiddleware, backupRouter);
app.use('/api/devices', authMiddleware, coupleIsolationMiddleware, deviceRouter);
app.use('/api/sync', authMiddleware, coupleIsolationMiddleware, syncRouter);

// Error handler
app.use(errorHandler);

// Initialize
async function start() {
  try {
    if (process.env.DATABASE_URL) {
      await initDatabase();
      console.log('Database initialized');
    } else {
      console.warn('⚠️ DATABASE_URL not set — running without database (API returns mock data)');
    }

    setupWebSocket(server);
    console.log('WebSocket server ready');

    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Couple OS API running on port ${PORT}`);
      console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Start server anyway without DB for development
    setupWebSocket(server);
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Couple OS API running on port ${PORT} (without database)`);
    });
  }
}

start();

export default app;
