import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { listEmployees, searchEmployees } from '../services/hris.service';
import { env } from '../config/env';

export async function search(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { q, limit } = req.query as { q?: string; limit?: string };

    if (!q || q.trim().length < env.HRIS_SEARCH_MIN_CHARS) {
      res.json([]);
      return;
    }

    const employees = await searchEmployees(q, limit ? parseInt(limit, 10) : 10);
    res.json(employees);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    // The HRIS table may not exist yet in some environments (e.g. local dev).
    // Returning empty keeps the endpoint usable; manual host entry still works.
    console.error('HRIS employee lookup failed:', error);
    res.json([]);
  }
}

export async function publicList(
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  try {
    const { limit } = req.query as { limit?: string };
    res.json(await listEmployees(limit ? parseInt(limit, 10) : 50));
  } catch (error) {
    console.error('HRIS employee list failed:', error);
    res.json([]);
  }
}
