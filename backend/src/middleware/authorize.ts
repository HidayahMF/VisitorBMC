import { type Response, type NextFunction } from 'express';
import { type AuthenticatedRequest } from './authenticate';
import { AppError } from './errorHandler';

export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (allowedRoles.length === 0 || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    next(new AppError('Insufficient permissions', 403));
  };
}
