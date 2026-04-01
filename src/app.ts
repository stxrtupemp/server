import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes        from './modules/auth/auth.routes';
import usersRoutes       from './modules/users/users.routes';
import propertiesRoutes  from './modules/properties/properties.routes';
import clientsRoutes     from './modules/clients/clients.routes';
import dealsRoutes       from './modules/deals/deals.routes';
import tasksRoutes       from './modules/tasks/tasks.routes';
import notesRoutes       from './modules/notes/notes.routes';
import webContactsRoutes from './modules/web-contacts/webContacts.routes';
import dashboardRoutes   from './modules/dashboard/dashboard.routes';
import tenantsRoutes     from './modules/tenants/tenants.routes';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin:         env.CLIENT_URL,
      credentials:    true,
      methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000, max: 500,
      standardHeaders: true, legacyHeaders: false,
      message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    }),
  );
  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000, max: 20,
      standardHeaders: true, legacyHeaders: false,
      message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts' } },
    }),
  );

  app.use(
    '/uploads',
    express.static(path.resolve(env.UPLOAD_DIR), { maxAge: '30d', etag: true, index: false }),
  );

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: 'ok', environment: env.NODE_ENV, timestamp: new Date().toISOString() } });
  });

  app.use('/api/auth',         authRoutes);
  app.use('/api/users',        usersRoutes);
  app.use('/api/properties',   propertiesRoutes);
  app.use('/api/clients',      clientsRoutes);
  app.use('/api/deals',        dealsRoutes);
  app.use('/api/tasks',        tasksRoutes);
  app.use('/api/notes',        notesRoutes);
  app.use('/api/web-contacts', webContactsRoutes);
  app.use('/api/dashboard',    dashboardRoutes);
  app.use('/api/tenants',      tenantsRoutes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    });
  });

  app.use(errorHandler);

  return app;
}
