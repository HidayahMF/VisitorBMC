import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { listAuditLogs } from '../services/audit-log.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as Record<string, string | undefined>; const userId = query.userId ? Number(query.userId) : undefined;
    if (userId !== undefined && !Number.isInteger(userId)) throw new AppError('Invalid user ID', 400);
    res.json(await listAuditLogs({ action: query.action, userId, from: query.from, to: query.to, q: query.q, page: query.page ? Number(query.page) : undefined, limit: query.limit ? Number(query.limit) : undefined }));
  } catch (error) { next(error); }
}
