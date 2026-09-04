import { type Request, type Response, type NextFunction } from 'express';
import { verifyToken, getUserById, type IJwtPayload } from '../services/auth.service';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: IJwtPayload;
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const idx = cookie.indexOf('=');
      if (idx === -1) return acc;
      const key = cookie.slice(0, idx).trim();
      const value = cookie.slice(idx + 1).trim();
      if (key) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['jwt'];

  if (!token) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    const payload = verifyToken(token);

    const user = await getUserById(payload.userId);
    if (!user || !user.IsActive) {
      next(new AppError('Invalid or expired token', 401));
      return;
    }

    req.user = { userId: user.Id, role: user.Role };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}
