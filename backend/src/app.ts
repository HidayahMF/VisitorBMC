import express, { type Express } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { healthCheck } from './routes/health.routes';
import { login, logout, me } from './routes/auth.routes';
import { authenticate } from './middleware/authenticate';
import { authorize } from './middleware/authorize';
import { developmentOnly } from './middleware/developmentOnly';
import * as companiesRoutes from './routes/companies.routes';
import * as visitorsRoutes from './routes/visitors.routes';
import * as visitsRoutes from './routes/visits.routes';
import * as safetyInductionsRoutes from './routes/safety-inductions.routes';
import * as hrisRoutes from './routes/hris.routes';
import * as auditRoutes from './routes/audit.routes';
import * as reportsRoutes from './routes/reports.routes';
import * as usersRoutes from './routes/users.routes';
import rateLimit from 'express-rate-limit';

const app: Express = express();
const publicInductionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Terlalu banyak permintaan induction. Coba lagi nanti.' } });

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

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
app.delete('/api/companies/:id', authenticate, authorize('ADMIN'), developmentOnly, companiesRoutes.remove);

app.get('/api/visitors', authenticate, visitorsRoutes.list);
app.get('/api/visitors/search', authenticate, visitorsRoutes.search);
app.get('/api/visitors/:id/history', authenticate, visitorsRoutes.history);
app.get('/api/visitors/:id', authenticate, visitorsRoutes.getById);
app.post('/api/visitors', authenticate, visitorsRoutes.create);
app.put('/api/visitors/:id', authenticate, authorize('ADMIN'), visitorsRoutes.update);
app.patch('/api/visitors/:id/status', authenticate, authorize('ADMIN'), visitorsRoutes.updateStatus);
app.delete('/api/visitors/:id', authenticate, authorize('ADMIN'), developmentOnly, visitorsRoutes.remove);

app.get('/api/visits', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.list);
app.get('/api/visits/active', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.active);
app.get('/api/visits/dashboard', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.dashboard);
app.get('/api/visits/:id', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.getById);
app.post('/api/visits', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.create);
app.post('/api/visits/safety-check', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.safetyCheckHandler);
app.post('/api/visits/check-duplicate', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.checkDuplicate);
app.put('/api/visits/:id/checkin', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.checkIn);
app.put('/api/visits/:id/checkout', authenticate, authorize('ADMIN', 'SECURITY'), visitsRoutes.checkOut);
app.delete('/api/visits/:id', authenticate, authorize('ADMIN'), developmentOnly, visitsRoutes.remove);

app.get('/api/safety-inductions/active/contents', safetyInductionsRoutes.getActiveContents);
app.post('/api/safety-inductions/access/:visitId', authenticate, authorize('ADMIN', 'SECURITY'), safetyInductionsRoutes.issueToken);
app.get('/api/safety-inductions/token/:token/workflow', publicInductionLimiter, safetyInductionsRoutes.tokenWorkflow);
app.get('/api/safety-inductions/manage/contents', authenticate, authorize('ADMIN', 'SECURITY'), safetyInductionsRoutes.managedContents);
app.get('/api/safety-inductions/manage/config', authenticate, authorize('ADMIN'), safetyInductionsRoutes.config);
app.patch('/api/safety-inductions/manage/config', authenticate, authorize('ADMIN'), safetyInductionsRoutes.updateConfig);
app.post('/api/safety-inductions/manage/contents', authenticate, authorize('ADMIN', 'SECURITY'), safetyInductionsRoutes.uploadContent);
app.patch('/api/safety-inductions/manage/contents/:id/status', authenticate, authorize('ADMIN', 'SECURITY'), safetyInductionsRoutes.updateContentStatus);
app.delete('/api/safety-inductions/manage/contents/:id', authenticate, authorize('ADMIN', 'SECURITY'), safetyInductionsRoutes.removeContent);
app.get('/api/safety-inductions/visitor/:visitorId/history', authenticate, safetyInductionsRoutes.getVisitorHistory);
app.post('/api/safety-inductions/complete', publicInductionLimiter, safetyInductionsRoutes.complete);

app.get('/api/hris/employees', authenticate, authorize('ADMIN', 'SECURITY'), hrisRoutes.search);
app.get('/api/audit-logs', authenticate, authorize('ADMIN'), auditRoutes.list);
app.get('/api/reports/visits', authenticate, authorize('ADMIN', 'SECURITY'), reportsRoutes.visits);
app.get('/api/reports/visitors', authenticate, authorize('ADMIN', 'SECURITY'), reportsRoutes.visitors);
app.get('/api/reports/inductions', authenticate, authorize('ADMIN', 'SECURITY'), reportsRoutes.inductions);
app.get('/api/users', authenticate, authorize('ADMIN'), usersRoutes.list);
app.post('/api/users', authenticate, authorize('ADMIN'), usersRoutes.create);
app.patch('/api/users/:id', authenticate, authorize('ADMIN'), usersRoutes.update);

app.use(notFound);
app.use(errorHandler);

export default app;
