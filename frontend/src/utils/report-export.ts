import * as XLSX from 'xlsx-js-style';
import type { Language } from '../i18n/translations';
import type { VisitStatus } from '../types/visit';
import { visitStatusLabel } from './visit-status';

export type ReportTab = 'visits' | 'visitors' | 'inductions';
export interface ExportFilters { from: string; to: string; company: string; host: string; status: string; }
export interface ExportLabels {
  reportTitle: string; sheetName: string; period: string; allDates: string; company: string; allCompanies: string; host: string; allHosts: string; status: string; allStatuses: string; exported: string; no: string; visitCode: string; date: string; visitor: string; companyHeader: string; hostHeader: string; checkIn: string; checkOut: string; visitsCount: string; latestVisit: string; version: string; completed: string; validUntil: string; active: string; inactive: string; valid: string; expired: string; statusLabels: Record<string, string>;
}

function safeText(value: unknown): string {
  if (value == null || value === '') return '-';
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
function excelDate(value: unknown): Date | string {
  if (typeof value !== 'string' || !value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? safeText(value) : date;
}
function dateText(value: string, language: Language): string {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
function periodText(filters: ExportFilters, labels: ExportLabels, language: Language): string {
  if (filters.from && filters.to) return `${dateText(filters.from, language)} - ${dateText(filters.to, language)}`;
  if (filters.from) return `${dateText(filters.from, language)} -`;
  if (filters.to) return `- ${dateText(filters.to, language)}`;
  return labels.allDates;
}
function metadataRows(labels: ExportLabels, filters: ExportFilters, exportedAt: Date, language: Language): string[][] {
  return [[labels.period, periodText(filters, labels, language)], [labels.company, filters.company || labels.allCompanies], [labels.host, filters.host || labels.allHosts], [labels.status, filters.status ? labels.statusLabels[filters.status] || filters.status : labels.allStatuses], [labels.exported, new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(exportedAt)]];
}

export function reportHeaders(tab: ReportTab, labels: ExportLabels): string[] {
  if (tab === 'visits') return [labels.no, labels.visitCode, labels.date, labels.visitor, labels.companyHeader, labels.hostHeader, labels.checkIn, labels.checkOut, labels.status];
  if (tab === 'visitors') return [labels.no, labels.visitor, labels.companyHeader, labels.visitsCount, labels.latestVisit, labels.status];
  return [labels.no, labels.visitor, labels.companyHeader, labels.version, labels.completed, labels.validUntil, labels.status];
}
export function reportRows(tab: ReportTab, rows: Record<string, unknown>[], labels: ExportLabels, language: Language): (string | number | Date)[][] {
  return rows.map((row, index) => {
    if (tab === 'visits') return [index + 1, safeText(row.VisitCode), excelDate(row.VisitDate), safeText(row.VisitorName), safeText(row.CompanyName), safeText(row.HostName), excelDate(row.CheckInTime), excelDate(row.CheckOutTime), labels.statusLabels[String(row.Status)] || visitStatusLabel(row.Status as VisitStatus, language)];
    if (tab === 'visitors') return [index + 1, safeText(row.VisitorName), safeText(row.CompanyName), Number(row.VisitsCount ?? 0), excelDate(row.LatestVisit), labels.statusLabels[String(row.Status)] || safeText(row.Status)];
    return [index + 1, safeText(row.VisitorName), safeText(row.CompanyName), Number(row.InductionVersion ?? 0), excelDate(row.CompletedAt), excelDate(row.ValidUntil), labels.statusLabels[String(row.Status)] || safeText(row.Status)];
  });
}
export function createWorkbook(tab: ReportTab, rows: Record<string, unknown>[], labels: ExportLabels, filters: ExportFilters, language: Language, exportedAt = new Date()): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new(); const metadata = metadataRows(labels, filters, exportedAt, language); const headers = reportHeaders(tab, labels); const data = reportRows(tab, rows, labels, language);
  const sheet = XLSX.utils.aoa_to_sheet([[labels.reportTitle], [labels.sheetName], [language === 'id' ? 'INFORMASI LAPORAN' : 'REPORT INFORMATION'], ...metadata.map(([label, value]) => [label, value]), [], headers, ...data]);
  const lastColumn = headers.length - 1;
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColumn } },
    ...metadata.map((_, index) => ({ s: { r: 3 + index, c: 1 }, e: { r: 3 + index, c: lastColumn } })),
  ];
  sheet['!freeze'] = { xSplit: 0, ySplit: 10 };
  sheet['!autofilter'] = { ref: `A10:${XLSX.utils.encode_col(lastColumn)}${10 + data.length}` };
  sheet['!cols'] = tab === 'visits' ? [{ wch: 6 }, { wch: 22 }, { wch: 15 }, { wch: 24 }, { wch: 24 }, { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 20 }] : tab === 'visitors' ? [{ wch: 6 }, { wch: 28 }, { wch: 26 }, { wch: 16 }, { wch: 20 }, { wch: 18 }] : [{ wch: 6 }, { wch: 28 }, { wch: 26 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 18 }];
  sheet['!rows'] = [{ hpt: 26 }, { hpt: 21 }, { hpt: 20 }, ...metadata.map(() => ({ hpt: 18 })), { hpt: 8 }, { hpt: 28 }, ...data.map(() => ({ hpt: 22 }))];
  sheet['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  sheet['!pageMargins'] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  sheet['!printOptions'] = { horizontalCentered: false, verticalCentered: false };
  sheet['!printTitleRows'] = '10:10';
  const border = { top: { style: 'thin', color: { rgb: 'D9E2F0' } }, bottom: { style: 'thin', color: { rgb: 'D9E2F0' } }, left: { style: 'thin', color: { rgb: 'D9E2F0' } }, right: { style: 'thin', color: { rgb: 'D9E2F0' } } };
  const blue = { rgb: '062B72' }; const lightBlue = { rgb: 'EAF2FF' }; const lightGray = { rgb: 'F7F9FC' };
  for (let column = 0; column <= lastColumn; column += 1) {
    const titleCell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })]; const subtitleCell = sheet[XLSX.utils.encode_cell({ r: 1, c: column })]; const sectionCell = sheet[XLSX.utils.encode_cell({ r: 2, c: column })];
    if (titleCell) titleCell.s = { font: { name: 'Arial', sz: 18, bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: blue }, alignment: { horizontal: 'left', vertical: 'center' } };
    if (subtitleCell) subtitleCell.s = { font: { name: 'Arial', sz: 13, bold: true, color: blue }, alignment: { horizontal: 'left', vertical: 'center' } };
    if (sectionCell) sectionCell.s = { font: { name: 'Arial', sz: 10, bold: true, color: blue }, fill: { patternType: 'solid', fgColor: lightBlue }, alignment: { vertical: 'center' }, border };
  }
  for (let row = 3; row <= 7; row += 1) {
    const labelCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })]; const valueCell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
    if (labelCell) labelCell.s = { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '394962' } }, fill: { patternType: 'solid', fgColor: lightBlue }, alignment: { vertical: 'center' }, border };
    if (valueCell) valueCell.s = { font: { name: 'Arial', sz: 10, color: { rgb: '16233B' } }, fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, alignment: { vertical: 'center', wrapText: true }, border };
  }
  const headerRow = 9; headers.forEach((_, column) => { const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c: column })]; if (cell) cell.s = { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: blue }, alignment: { horizontal: column === 0 || column === headers.length - 1 ? 'center' : 'left', vertical: 'center', wrapText: true }, border }; });
  for (let row = 0; row < data.length; row += 1) {
    const dateColumns = tab === 'visits' ? [2, 6, 7] : tab === 'visitors' ? [4] : [4, 5];
    for (let column = 0; column < headers.length; column += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: headerRow + 1 + row, c: column })];
      if (cell) cell.s = { font: { name: 'Arial', sz: 10, color: { rgb: '16233B' } }, fill: { patternType: 'solid', fgColor: row % 2 ? lightGray : { rgb: 'FFFFFF' } }, alignment: { horizontal: column === 0 || column === headers.length - 1 || dateColumns.includes(column) ? 'center' : 'left', vertical: 'center', wrapText: column !== 0 }, border };
    }
    dateColumns.forEach(column => { const cell = sheet[XLSX.utils.encode_cell({ r: headerRow + 1 + row, c: column })]; if (cell && cell.t === 'd') cell.z = (tab === 'visits' && column === 2) || (tab === 'visitors' && column === 4) ? 'dd mmm yyyy' : 'dd mmm yyyy hh:mm:ss'; });
    const statusColumn = headers.length - 1; const statusCell = sheet[XLSX.utils.encode_cell({ r: headerRow + 1 + row, c: statusColumn })]; const statusValue = String(data[row][statusColumn]);
    if (statusCell && ['Valid', 'Masih Berlaku', 'Inside', 'Di Dalam', 'Ready for Check-in', 'Siap Masuk'].includes(statusValue)) statusCell.s = { ...statusCell.s, font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '117A5A' } }, fill: { patternType: 'solid', fgColor: { rgb: 'E5F6EF' } } };
    if (statusCell && ['Checked Out', 'Sudah Keluar', 'Expired', 'Kedaluwarsa'].includes(statusValue)) statusCell.s = { ...statusCell.s, font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '607089' } }, fill: { patternType: 'solid', fgColor: { rgb: 'EEF2F7' } } };
    if (statusCell && ['Induction Required', 'Perlu Induksi'].includes(statusValue)) statusCell.s = { ...statusCell.s, font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'A56208' } }, fill: { patternType: 'solid', fgColor: { rgb: 'FFF3D9' } } };
  }
  XLSX.utils.book_append_sheet(workbook, sheet, labels.sheetName.slice(0, 31)); return workbook;
}
export function safeFilename(tab: ReportTab, language: Language, date = new Date()): string { const day = date.toISOString().slice(0, 10); const names = language === 'id' ? { visits: 'Laporan-Kunjungan', visitors: 'Laporan-Pengunjung', inductions: 'Laporan-Safety-Induction' } : { visits: 'Visit-Report', visitors: 'Visitor-Report', inductions: 'Safety-Induction-Report' }; return `${names[tab]}-${day}.xlsx`; }
export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void { XLSX.writeFile(workbook, filename, { bookType: 'xlsx', compression: true }); }

export function csvValue(value: unknown): string { return safeText(value).replaceAll('"', '""'); }
export function toExcelCsv(headers: string[], rows: (string | number | Date)[][], language: Language = 'id'): string { const format = (value: string | number | Date) => { if (!(value instanceof Date)) return csvValue(value); return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(value); }; return `sep=;\r\n\uFEFF${headers.map(csvValue).join(';')}\r\n${rows.map(row => row.map(format).map(value => `"${value}"`).join(';')).join('\r\n')}`; }
export { metadataRows, periodText };
