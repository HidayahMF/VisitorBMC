import { type Request, type Response, type NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import {
  findUserForLogin,
  comparePassword,
  generateToken,
  getUserById,
  toSafeUser,
} from '../services/auth.service';
import { type AuthenticatedRequest } from '../middleware/authenticate';

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      next(new AppError('Username and password are required', 400));
      return;
    }

    const user = await findUserForLogin(username);

    if (!user || !user.IsActive) {
      res.status(401).json({ message: 'Invalid username or password' });
      return;
    }

    const passwordValid = await comparePassword(password, user.PasswordHash);

    if (!passwordValid) {
      res.status(401).json({ message: 'Invalid username or password' });
      return;
    }

    const token = generateToken({ userId: user.Id, role: user.Role });

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      path: '/',
      maxAge: env.JWT_EXPIRES_IN * 1000,
    });

    res.json({ user: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.clearCookie('jwt', { path: '/' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

export async function me(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    const user = await getUserById(req.user.userId);

    if (!user || !user.IsActive) {
      next(new AppError('Invalid or expired token', 401));
      return;
    }

    res.json(toSafeUser(user));
  } catch (error) {
    next(error);
  }
}
