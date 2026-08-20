import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimit';
import { csrfProtection } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';
import { coupleRouter, moodsRouter, periodRouter } from './routes/couple';
import { journalRouter } from './routes/journal';
import { memoriesRouter } from './routes/memories';
import { photosRouter, albumsRouter, filesRouter } from './routes/photos';
import { chatRouter } from './routes/chat';
import { calendarRouter, countdownsRouter, tasksRouter, wishlistRouter, bucketRouter, expensesRouter } from './routes/planning';
import { lettersRouter, questionsRouter, loveLanguageRouter, relationshipRouter, complimentsRouter, storyRouter } from './routes/love';
import { backupRouter, aiRouter, exportRouter, settingsRouter } from './routes/backup';
import { notificationsRouter, searchRouter, dashboardRouter, datePlannerRouter } from './routes/misc';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers (XSS hardening, clickjacking, MIME sniffing, …)
  app.use(helmet({
    contentSecurityPolicy: config.isProd ? undefined : false, // vite dev needs relaxed CSP
    crossOriginEmbedderPolicy: false,
  }));

  // CORS — credentials-carrying requests only from the configured web origin
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / same-origin
      const allowed = [config.webOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'];
      if (config.isProd || allowed.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', apiLimiter, csrfProtection);

  app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'Couple OS API', ts: new Date().toISOString() }));

  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/couple', coupleRouter);
  app.use('/api/moods', moodsRouter);
  app.use('/api/period', periodRouter);
  app.use('/api/journal', journalRouter);
  app.use('/api/memories', memoriesRouter);
  app.use('/api/photos', photosRouter);
  app.use('/api/albums', albumsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/countdowns', countdownsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/bucket-list', bucketRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/love-letters', lettersRouter);
  app.use('/api/questions', questionsRouter);
  app.use('/api/love-language', loveLanguageRouter);
  app.use('/api/relationship', relationshipRouter);
  app.use('/api/compliments', complimentsRouter);
  app.use('/api/story', storyRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/backup', backupRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/date-planner', datePlannerRouter);
  app.use('/api/files', filesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
