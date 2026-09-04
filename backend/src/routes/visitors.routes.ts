import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import {
  listVisitors,
  getVisitorById,
  createVisitor,
  updateVisitor,
  updateVisitorStatus,
  searchVisitors,
} from '../services/visitors.service';
import { type AuthenticatedRequest } from '../middleware/authenticate';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { q, companyId, active, page, limit } = req.query as {
      q?: string;
      companyId?: string;
      active?: string;
      page?: string;
      limit?: string;
    };

    const result = await listVisitors({
      q,
      companyId: companyId ? parseInt(companyId, 10) : undefined,
      active: active !== undefined ? active === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function search(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { q, limit } = req.query as { q?: string; limit?: string };
    if (!q) {
      res.json([]);
      return;
    }
    const visitors = await searchVisitors(q, limit ? parseInt(limit, 10) : 20);
    res.json(visitors);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new AppError('Invalid visitor ID', 400);
    }

    const visitor = await getVisitorById(id);
    if (!visitor) {
      throw new AppError('Visitor not found', 404);
    }

    res.json(visitor);
  } catch (error) {
    next(error);
  }
}

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { visitorName, companyId, phoneNumber } = req.body as {
      visitorName?: string;
      companyId?: number;
      phoneNumber?: string;
    };

    if (!visitorName) {
      throw new AppError('Visitor name is required', 400);
    }
    if (!companyId) {
      throw new AppError('Company is required', 400);
    }

    const result = await createVisitor({
      visitorName,
      companyId,
      phoneNumber,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new AppError('Invalid visitor ID', 400);
    }

    const { visitorName, companyId, phoneNumber } = req.body as {
      visitorName?: string;
      companyId?: number;
      phoneNumber?: string;
    };

    if (visitorName === undefined && companyId === undefined && phoneNumber === undefined) {
      throw new AppError('No fields to update', 400);
    }

    const visitor = await updateVisitor(id, { visitorName, companyId, phoneNumber });
    if (!visitor) {
      throw new AppError('Visitor not found', 404);
    }

    res.json(visitor);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new AppError('Invalid visitor ID', 400);
    }

    const { isActive } = req.body as { isActive?: boolean };
    if (isActive === undefined) {
      throw new AppError('isActive is required', 400);
    }

    const visitor = await updateVisitorStatus(id, isActive);
    if (!visitor) {
      throw new AppError('Visitor not found', 404);
    }

    res.json(visitor);
  } catch (error) {
    next(error);
  }
}
