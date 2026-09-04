import { type Request, type Response, type NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  console.error('Unexpected error:', err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}

export function notFound(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  const err = new AppError('Route not found', 404);
  next(err);
}
