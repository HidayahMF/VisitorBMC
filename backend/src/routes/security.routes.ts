import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { getOverview, getReport, markTravelReturned, type SecurityReportType } from '../services/security.service';

export async function overview(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getOverview());
  } catch (error) {
    next(error);
  }
}

export async function returnTravel(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.body?.id ?? req.body?.Id ?? req.body?.ID ?? req.body?.travelId);
    const rawNip = req.body?.nip ?? req.body?.NIP;
    const nip = rawNip == null ? '' : String(rawNip);
    const returnTime = typeof req.body?.returnTime === 'string' ? req.body.returnTime : '';
    if (!Number.isInteger(id) && !nip.trim()) throw new AppError('ID atau NIP tugas luar wajib diisi.', 400);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(returnTime)) throw new AppError('Jam kembali harus berformat HH:MM.', 400);
    if (!await markTravelReturned(Number.isInteger(id) ? id : null, nip, returnTime)) throw new AppError('Data tugas luar tidak ditemukan atau sudah kembali.', 404);
    res.json({ message: 'Kepulangan berhasil dicatat.' });
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
