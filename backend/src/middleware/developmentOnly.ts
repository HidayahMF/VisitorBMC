import { type NextFunction, type Request, type Response } from 'express';
import { AppError } from './errorHandler';

export function developmentOnly(_req: Request, _res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    next(new AppError('Development-only action is disabled', 404));
    return;
  }

  next();
}
