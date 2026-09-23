import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { errorHandler, notFound } from './errors.js';
import { authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { campaignsRouter } from './routes/campaigns.js';
import { eventsRouter } from './routes/events.js';
import { usersRouter } from './routes/users.js';
import { auditRouter } from './routes/audit.js';

export const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.frontendOrigin, credentials: false }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }), authRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/campaigns', authenticate, campaignsRouter);
app.use('/api/security-events', authenticate, eventsRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/audit-logs', authenticate, auditRouter);
app.use((_request, _response, next) => next(notFound('Endpoint not found')));
app.use(errorHandler);

