import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import {
  listCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  updateCompanyStatus,
  findCompaniesBySearch,
} from '../services/companies.service';
import { type AuthenticatedRequest } from '../middleware/authenticate';

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { q, active, page, limit } = req.query as {
      q?: string;
      active?: string;
      page?: string;
      limit?: string;
    };

    const result = await listCompanies({
      q,
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
    const companies = await findCompaniesBySearch(q, limit ? parseInt(limit, 10) : 20);
    res.json(companies);
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
      throw new AppError('Invalid company ID', 400);
    }

    const company = await getCompanyById(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    res.json(company);
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
    const { companyName } = req.body as { companyName?: string };
    if (!companyName) {
      throw new AppError('Company name is required', 400);
    }

    const company = await createCompany(companyName);
    res.status(201).json(company);
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
      throw new AppError('Invalid company ID', 400);
    }

    const { companyName } = req.body as { companyName?: string };
    if (!companyName) {
      throw new AppError('Company name is required', 400);
    }

    const company = await updateCompany(id, companyName);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    res.json(company);
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
      throw new AppError('Invalid company ID', 400);
    }

    const { isActive } = req.body as { isActive?: boolean };
    if (isActive === undefined) {
      throw new AppError('isActive is required', 400);
    }

    const company = await updateCompanyStatus(id, isActive);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    res.json(company);
  } catch (error) {
    next(error);
  }
}
