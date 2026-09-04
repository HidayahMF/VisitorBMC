import { type Request, type Response, type NextFunction } from 'express';
import { testDbConnection } from '../config/database';

export async function healthCheck(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dbHealthy = await testDbConnection();

    if (!dbHealthy) {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      database: 'connected',
    });
  } catch (error) {
    next(error);
  }
}
