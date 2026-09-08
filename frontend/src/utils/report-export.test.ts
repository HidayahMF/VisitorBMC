import { describe, expect, it } from 'vitest';
import { createWorkbook, reportHeaders, reportRows, safeFilename, toExcelCsv, type ExportLabels } from './report-export';

const labels: ExportLabels = { reportTitle: 'REPORT', sheetName: 'Visits', period: 'Period', allDates: 'All dates', company: 'Company', allCompanies: 'All companies', host: 'Host', allHosts: 'All hosts', status: 'Status', allStatuses: 'All statuses', exported: 'Exported', no: 'NO.', visitCode: 'VISIT CODE', date: 'DATE', visitor: 'VISITOR', companyHeader: 'COMPANY', hostHeader: 'HOST', checkIn: 'CHECK-IN', checkOut: 'CHECK-OUT', visitsCount: 'VISITS COUNT', latestVisit: 'LATEST VISIT', version: 'VERSION', completed: 'COMPLETED', validUntil: 'VALID UNTIL', active: 'Active', inactive: 'Inactive', valid: 'Valid', expired: 'Expired', statusLabels: { OUT: 'Checked Out', IN: 'Inside', ACTIVE: 'Active', VALID: 'Valid' } };
const visit = { VisitCode: 'VIS-001', VisitDate: '2026-09-08T00:00:00.000Z', VisitorName: 'Hidayah \u00d6', CompanyName: 'VKTR; BMC', HostName: '=unsafe', CheckInTime: '2026-09-08T08:20:52.025Z', CheckOutTime: null, Status: 'OUT' };

describe('report export', () => {
  it('maps visit, visitor, and induction rows with localized status and date values', () => {
    expect(reportHeaders('visits', labels)).toEqual(['NO.', 'VISIT CODE', 'DATE', 'VISITOR', 'COMPANY', 'HOST', 'CHECK-IN', 'CHECK-OUT', 'STATUS']);
    expect(reportRows('visits', [visit], labels, 'en')[0]).toEqual([1, 'VIS-001', expect.any(Date), 'Hidayah \u00d6', 'VKTR; BMC', "'=unsafe", expect.any(Date), '-', 'Checked Out']);
    expect(reportRows('visitors', [{ VisitorName: 'A', CompanyName: 'B', VisitsCount: 2, LatestVisit: '2026-09-08T00:00:00.000Z', Status: 'ACTIVE' }], labels, 'en')[0][3]).toBe(2);
    expect(reportRows('inductions', [{ VisitorName: 'A', CompanyName: 'B', InductionVersion: 1, CompletedAt: '2026-09-08T08:20:52.025Z', ValidUntil: '2026-10-08T08:20:52.025Z', Status: 'VALID' }], labels, 'en')[0][6]).toBe('Valid');
  });

  it('creates a real workbook with metadata, widths, filter, and frozen data header', () => {
    const workbook = createWorkbook('visits', [visit], labels, { from: '', to: '', company: '', host: '', status: '' }, 'en', new Date('2026-09-09T10:30:00Z'));
    const sheet = workbook.Sheets.Visits;
    expect(sheet).toBeDefined();
    expect(sheet['!autofilter']?.ref).toBe('A10:I11');
    expect(sheet['!freeze']?.ySplit).toBe(10);
    expect(sheet['!cols']?.[1].wch).toBe(22);
    expect(sheet['!merges']).toHaveLength(8);
    expect(sheet.A1.s?.font?.sz).toBe(18);
    expect(sheet.A10.s?.fill?.fgColor?.rgb).toBe('062B72');
    expect(sheet.G11.z).toBe('dd mmm yyyy hh:mm:ss');
    expect(sheet.H11.v).toBe('-');
    expect(sheet['!pageSetup']?.orientation).toBe('landscape');
    expect(sheet.A1.v).toBe('REPORT');
  });

  it('creates Excel-compatible semicolon CSV with BOM, escaping, Unicode, and formula protection', () => {
    const csv = toExcelCsv(['NAME', 'VALUE'], [['Hidayah \u00d6', '=formula;"quoted"']], 'en');
    expect(csv.startsWith('sep=;\r\n\uFEFF')).toBe(true);
    expect(csv).toContain('"Hidayah \u00d6";"\'=formula;""quoted"""');
    expect(csv).not.toContain('2026-09-08T');
  });

  it('uses localized safe filenames', () => {
    const date = new Date('2026-09-09T10:30:00Z');
    expect(safeFilename('visits', 'id', date)).toBe('Laporan-Kunjungan-2026-09-09.xlsx');
    expect(safeFilename('inductions', 'en', date)).toBe('Safety-Induction-Report-2026-09-09.xlsx');
  });
});
