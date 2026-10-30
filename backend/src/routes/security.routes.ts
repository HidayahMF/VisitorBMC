import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { getActiveTravelCheckpoint, getOverview, getReport, markTravelDeparted, markTravelReturned, scanAction, type SecurityReportType } from '../services/security.service';
import { type AuthenticatedRequest } from '../middleware/authenticate';

export async function overview(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getOverview());
  } catch (error) {
    next(error);
  }
}

export async function returnTravel(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.body?.id ?? req.body?.Id ?? req.body?.ID ?? req.body?.travelId ?? '').trim();
    const rawNip = req.body?.nip ?? req.body?.NIP;
    const nip = rawNip == null ? '' : String(rawNip);
    const returnTime = typeof req.body?.returnTime === 'string' ? req.body.returnTime : '';
    if (!id && !nip.trim()) throw new AppError('ID atau NIP tugas luar wajib diisi.', 400);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(returnTime)) throw new AppError('Jam kembali harus berformat HH:MM.', 400);
    if (!await markTravelReturned(id || null, nip, returnTime, (req as AuthenticatedRequest).user!.userId)) throw new AppError('Data tugas luar tidak ditemukan atau belum dicatat berangkat.', 404);
    res.json({ message: 'Kepulangan berhasil dicatat.' });
  } catch (error) {
    next(error);
  }
}

export async function departTravel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.body?.id ?? req.body?.Id ?? req.body?.travelId ?? '').trim();
    const nip = String(req.body?.nip ?? req.body?.NIP ?? '');
    const departureTime = String(req.body?.departureTime ?? '');
    if (!id || !/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime)) throw new AppError('ID dan jam keberangkatan wajib diisi.', 400);
    if (!await markTravelDeparted(id, nip, departureTime, req.user!.userId)) throw new AppError('Tugas luar tidak ditemukan atau sudah dicatat berangkat.', 409);
    res.json({ message: 'Keberangkatan berhasil dicatat.' });
  } catch (error) {
    next(error);
  }
}

export async function scanTravel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.body?.id ?? req.body?.travelId ?? '').trim();
    const time = String(req.body?.time ?? '');
    if (!/^[A-Za-z0-9._-]{1,50}$/.test(id) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new AppError('ID dan jam scan wajib diisi.', 400);
    const checkpoint = await getActiveTravelCheckpoint(id);
    const action = scanAction(Boolean(checkpoint));
    if (action === 'RETURNED') {
      if (!await markTravelReturned(id, checkpoint!.NIP, time, req.user!.userId)) throw new AppError('Kepulangan gagal dicatat.', 409);
      res.json({ action });
      return;
    }
    if (!await markTravelDeparted(id, '', time, req.user!.userId)) throw new AppError('Tugas luar tidak ditemukan atau sudah selesai.', 409);
    res.json({ action });
  } catch (error) {
    next(error);
  }
}

export async function report(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.query.type as SecurityReportType;
    const start = String(req.query.start || '');
    const end = String(req.query.end || '');
    if (!['travel', 'izin', 'kembali'].includes(type) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      throw new AppError('Parameter laporan tidak valid.', 400);
    }
    res.json(await getReport(type, start, end));
  } catch (error) {
    next(error);
  }
}
