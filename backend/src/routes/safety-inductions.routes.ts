import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { type AuthenticatedRequest } from '../middleware/authenticate';
import {
  getActiveInductionWithContents,
  getInductionHistory,
  completeInduction,
} from '../services/safety-inductions.service';

export async function getActiveContents(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getActiveInductionWithContents();
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getVisitorHistory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const visitorId = parseInt(req.params.visitorId as string, 10);
    if (isNaN(visitorId)) {
      throw new AppError('Invalid visitor ID', 400);
    }

    const records = await getInductionHistory(visitorId);
    res.json(records);
  } catch (error) {
    next(error);
  }
}

export async function complete(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { visitorId, visitId, acknowledged } = req.body as {
      visitorId?: number;
      visitId?: number;
      acknowledged?: boolean;
    };

    if (!visitorId) {
      throw new AppError('Visitor ID is required', 400);
    }
    if (!visitId) {
      throw new AppError('Visit ID is required', 400);
    }
    if (acknowledged === undefined) {
      throw new AppError('Acknowledgement is required', 400);
    }

    const result = await completeInduction(
      { visitorId, visitId, acknowledged },
      req.user!.userId,
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
