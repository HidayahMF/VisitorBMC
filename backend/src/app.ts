import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { healthCheck } from './routes/health.routes';
import { login, logout, me } from './routes/auth.routes';
import { authenticate } from './middleware/authenticate';
import { authorize } from './middleware/authorize';
import * as companiesRoutes from './routes/companies.routes';
import * as visitorsRoutes from './routes/visitors.routes';
import * as visitsRoutes from './routes/visits.routes';
import * as safetyInductionsRoutes from './routes/safety-inductions.routes';

const app: Express = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/auth/login', limiter);

app.get('/api/health', healthCheck);

app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', authenticate, me);

app.get('/api/companies', authenticate, companiesRoutes.list);
app.get('/api/companies/search', authenticate, companiesRoutes.search);
app.get('/api/companies/:id', authenticate, companiesRoutes.getById);
app.post('/api/companies', authenticate, companiesRoutes.create);
app.put('/api/companies/:id', authenticate, authorize('ADMIN'), companiesRoutes.update);
app.patch('/api/companies/:id/status', authenticate, authorize('ADMIN'), companiesRoutes.updateStatus);

app.get('/api/visitors', authenticate, visitorsRoutes.list);
app.get('/api/visitors/search', authenticate, visitorsRoutes.search);
app.get('/api/visitors/:id', authenticate, visitorsRoutes.getById);
app.post('/api/visitors', authenticate, visitorsRoutes.create);
app.put('/api/visitors/:id', authenticate, authorize('ADMIN'), visitorsRoutes.update);
app.patch('/api/visitors/:id/status', authenticate, authorize('ADMIN'), visitorsRoutes.updateStatus);

app.get('/api/visits', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.list);
app.get('/api/visits/active', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.active);
app.get('/api/visits/dashboard', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.dashboard);
app.get('/api/visits/:id', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.getById);
app.post('/api/visits', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.create);
app.post('/api/visits/safety-check', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.safetyCheckHandler);
app.post('/api/visits/check-duplicate', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.checkDuplicate);
app.put('/api/visits/:id/checkin', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.checkIn);
app.put('/api/visits/:id/checkout', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.checkOut);

app.get('/api/safety-inductions/active/contents', authenticate, safetyInductionsRoutes.getActiveContents);
app.get('/api/safety-inductions/visitor/:visitorId/history', authenticate, safetyInductionsRoutes.getVisitorHistory);
app.post('/api/safety-inductions/complete', authenticate, safetyInductionsRoutes.complete);

app.use(notFound);
app.use(errorHandler);

export default app;
