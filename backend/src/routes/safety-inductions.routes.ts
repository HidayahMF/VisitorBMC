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
  listActiveInductions,
  updateActiveInductionConfig,
  listManagedInductionContents,
  updateInductionContentStatus,
} from '../services/safety-inductions.service';
import {
  getActiveInductionWithContents,
  getInductionHistory,
  getPublicInductionWorkflowByToken,
  issuePublicInductionToken,
  completeInductionByToken,
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

export async function issueToken(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { const visitId = Number(req.params.visitId); if (!Number.isInteger(visitId)) throw new AppError('Invalid visit ID', 400); res.status(200).json(await issuePublicInductionToken(visitId)); } catch (error) { next(error); } }
export async function tokenWorkflow(req: Request, res: Response, next: NextFunction) { try { res.json(await getPublicInductionWorkflowByToken(String(req.params.token))); } catch (error) { next(error); } }

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
    const { token, visitorId, acknowledged } = req.body as {
      token?: string;
      visitorId?: number;
      acknowledged?: boolean;
    };
    if (!token || typeof visitorId !== 'number' || !Number.isInteger(visitorId)) throw new AppError('Induction access token and visitor ID are required', 400);
    if (acknowledged === undefined) {
      throw new AppError('Acknowledgement is required', 400);
    }

    const completion = await completeInductionByToken(token, visitorId, acknowledged, req.ip);

    res.status(200).json({ ...completion.result, workflow: completion.workflow });
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

export async function config(_req: AuthenticatedRequest, res: Response, next: NextFunction) { try { res.json(await listActiveInductions()); } catch (error) { next(error); } }
export async function updateConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { const { validMonths, forceReinductionOnNewVersion } = req.body as { validMonths?: number; forceReinductionOnNewVersion?: boolean }; if (typeof validMonths !== 'number' || typeof forceReinductionOnNewVersion !== 'boolean') throw new AppError('Valid configuration is required', 400); res.json(await updateActiveInductionConfig({ validMonths, forceReinductionOnNewVersion }, req.user!.userId, req.ip)); } catch (error) { next(error); } }

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
