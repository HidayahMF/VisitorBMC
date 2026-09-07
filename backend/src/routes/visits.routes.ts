import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { listVisits, getVisitById, createVisit, safetyCheck, checkVisitorDuplicate, checkInVisit, checkOutVisit, getActiveVisits, getDashboardStats } from '../services/visits.service';
import { type AuthenticatedRequest } from '../middleware/authenticate';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { q, status, companyId, date, page, limit } = req.query as {
      q?: string;
      status?: string;
      companyId?: string;
      date?: string;
      page?: string;
      limit?: string;
    };

    const result = await listVisits({
      q,
      status,
      companyId: companyId ? parseInt(companyId, 10) : undefined,
      date,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    res.json(result);
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
      throw new AppError('Invalid visit ID', 400);
    }

    const visit = await getVisitById(id);
    if (!visit) {
      throw new AppError('Visit not found', 404);
    }

    res.json(visit);
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
    const { companyId, hostName, purpose, visitDate, visitorIds } = req.body as {
      companyId?: number;
      hostName?: string;
      purpose?: string;
      visitDate?: string;
      visitorIds?: number[];
    };

    if (!companyId) {
      throw new AppError('Company is required', 400);
    }
    if (!hostName) {
      throw new AppError('Host name is required', 400);
    }
    if (!purpose) {
      throw new AppError('Purpose is required', 400);
    }
    if (!visitDate) {
      throw new AppError('Visit date is required', 400);
    }
    if (!visitorIds || !Array.isArray(visitorIds) || visitorIds.length === 0) {
      throw new AppError('At least one visitor is required', 400);
    }

    const visit = await createVisit(
      { companyId, hostName, purpose, visitDate, visitorIds },
      req.user!.userId
    );

    res.status(201).json(visit);
  } catch (error) {
    next(error);
  }
}

export async function safetyCheckHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { companyId, visitorIds } = req.body as {
      companyId?: number;
      visitorIds?: number[];
    };

    if (!companyId) {
      throw new AppError('Company is required', 400);
    }
    if (!visitorIds || !Array.isArray(visitorIds) || visitorIds.length === 0) {
      throw new AppError('Visitor IDs are required', 400);
    }

    const result = await safetyCheck({ companyId, visitorIds });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function checkDuplicate(
  req: Request,
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

    const result = await checkVisitorDuplicate({ visitorName, companyId, phoneNumber });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function checkIn(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new AppError('Invalid visit ID', 400);
    }

    const visit = await checkInVisit(id);
    res.json(visit);
  } catch (error) {
    next(error);
  }
}

export async function checkOut(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new AppError('Invalid visit ID', 400);
    }

    const visit = await checkOutVisit(id, req.user!.userId);
    res.json(visit);
  } catch (error) {
    next(error);
  }
}

export async function active(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { q, companyId, date, page, limit } = req.query as {
      q?: string;
      companyId?: string;
      date?: string;
      page?: string;
      limit?: string;
    };

    const result = await getActiveVisits({
      q,
      companyId: companyId ? parseInt(companyId, 10) : undefined,
      date,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function dashboard(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}