import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { type AuthenticatedRequest } from '../middleware/authenticate';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import {
  createInductionContent,
  deleteInductionContent,
  listManagedInductionContents,
  updateInductionContentStatus,
} from '../services/safety-inductions.service';
import {
  getActiveInductionWithContents,
  getInductionHistory,
  completeInduction,
} from '../services/safety-inductions.service';

const contentUploadDir = path.join(env.UPLOAD_DIR, 'safety-induction');
fs.mkdirSync(contentUploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: contentUploadDir,
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase().replace('.', '');
    callback(null, env.UPLOAD_ALLOWED_TYPES.includes(extension));
  },
});

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
      { visitorId, visitId, acknowledged, ipAddress: req.ip },
      req.user!.userId,
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function managedContents(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json(await listManagedInductionContents());
  } catch (error) {
    next(error);
  }
}

export const uploadContent = [upload.single('file'), async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) throw new AppError('A video, image, or PDF file is required', 400);
    const extension = path.extname(req.file.originalname).toLowerCase();
    const contentType = extension === '.pdf'
      ? 'PDF'
      : extension === '.jpg' || extension === '.jpeg' || extension === '.png' || extension === '.gif'
        ? 'IMAGE'
        : 'VIDEO';
    const content = await createInductionContent({
      file: req.file,
      contentType,
      title: typeof req.body.title === 'string' ? req.body.title : undefined,
      description: typeof req.body.description === 'string' ? req.body.description : undefined,
    });
    res.status(201).json(content);
  } catch (error) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => undefined);
    next(error);
  }
}];

export async function updateContentStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { isActive } = req.body as { isActive?: boolean };
    if (isNaN(id) || typeof isActive !== 'boolean') {
      throw new AppError('Valid content ID and isActive are required', 400);
    }
    if (!await updateInductionContentStatus(id, isActive)) {
      throw new AppError('Content not found', 404);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function removeContent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) throw new AppError('Invalid content ID', 400);
    if (!await deleteInductionContent(id)) throw new AppError('Content not found', 404);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
