import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockInput, mockRequest } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  const mockInput = vi.fn();
  const mockRequest = vi.fn(() => ({ input: mockInput, query: mockQuery }));
  return { mockQuery, mockInput, mockRequest };
});

vi.mock('../config/database', () => ({
  getDbConnection: vi.fn(() => Promise.resolve({ request: mockRequest })),
  sql: {
    NVarChar: vi.fn((len?: number) => ({ type: 'NVarChar', length: len })),
    Int: vi.fn(() => ({ type: 'Int' })),
    VarChar: vi.fn((len?: number) => ({ type: 'VarChar', length: len })),
    Bit: vi.fn(() => ({ type: 'Bit' })),
    Date: vi.fn(() => ({ type: 'Date' })),
    UniqueIdentifier: vi.fn(() => ({ type: 'UniqueIdentifier' })),
    Transaction: vi.fn(() => ({
      begin: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      request: vi.fn(() => ({ input: mockInput, query: mockQuery })),
    })),
    ISOLATION_LEVEL: { SERIALIZABLE: 'SERIALIZABLE' },
  },
}));

vi.mock('./safety-clearance.service', () => ({
  checkVisitorSafetyClearance: vi.fn(() =>
    Promise.resolve({
      safetyInduction: { id: 1, title: 'Visitor Safety Induction', version: 1 },
      summary: { totalVisitors: 1, valid: 1, required: 0, expired: 0, requiresInduction: 0 },
      visitors: [{ visitorId: 1, visitorName: 'Andi', status: 'VALID' }],
    }),
  ),
}));

import { checkInVisit, checkOutVisit, getActiveVisits, getDashboardStats } from '../services/visits.service';

beforeEach(() => {
  vi.resetAllMocks();
  mockInput.mockReturnThis();
});

const readyVisitRow = { Id: 1, Status: 'READY_FOR_CHECKIN' };
const insideVisitRow = { Id: 1, Status: 'IN' };
const completedVisitRow = {
  Id: 1, VisitCode: 'VIS-20260907-001', CompanyId: 1, HostName: 'Host', Purpose: 'Meeting',
  VisitDate: new Date(), CheckInTime: new Date(), CheckOutTime: null, Status: 'IN',
  CreatedBy: 1, CheckedInBy: 1, CheckedOutBy: null, CreatedAt: new Date(), UpdatedAt: null,
  CompanyName: 'PT ABC',
};

describe('checkInVisit', () => {
  it('throws 404 when visit not found', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    await expect(checkInVisit(999, 1)).rejects.toThrow('Visit not found');
  });

  it('throws 400 when visit not ready for check-in', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [{ Id: 1, Status: 'PENDING_INDUCTION' }] });
    await expect(checkInVisit(1, 1)).rejects.toThrow('Visit is not ready for check-in');
  });

  it('updates status to IN, records checked-in user, and writes audit log', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [readyVisitRow] }) // transaction SELECT
      .mockResolvedValueOnce({ rowsAffected: [1], recordset: [] }) // UPDATE
      .mockResolvedValueOnce({ recordset: [] }) // audit INSERT
      .mockResolvedValueOnce({ recordset: [completedVisitRow] }) // getVisitById visit
      .mockResolvedValueOnce({ recordset: [] }); // getVisitById visitors

    const result = await checkInVisit(1, 7, '10.0.0.1');
    expect(result).toBeDefined();
    expect(result.CheckedInBy).toBe(1);

    const updateCall = mockQuery.mock.calls[1][0] as string;
    expect(updateCall).toContain('CheckedInBy');
    expect(updateCall).toContain('CheckInTime = SYSUTCDATETIME()');

    const auditCall = mockQuery.mock.calls[2][0] as string;
    expect(auditCall).toContain('INSERT INTO vms.AuditLogs');
  });
});

describe('checkOutVisit', () => {
  it('throws 404 when visit not found', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    await expect(checkOutVisit(999, 1)).rejects.toThrow('Visit not found');
  });

  it('throws 400 when visit is not IN', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [{ Id: 1, Status: 'OUT' }] });
    await expect(checkOutVisit(1, 1)).rejects.toThrow('Visit is not currently inside');
  });

  it('updates status to OUT, records checked-out user, and writes audit log', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [insideVisitRow] })
      .mockResolvedValueOnce({ rowsAffected: [1], recordset: [] }) // UPDATE + audit
      .mockResolvedValueOnce({ recordset: [] }) // audit INSERT
      .mockResolvedValueOnce({ recordset: [{ ...completedVisitRow, Status: 'OUT', CheckOutTime: new Date() }] })
      .mockResolvedValueOnce({ recordset: [] });

    const result = await checkOutVisit(1, 2);
    expect(result).toBeDefined();
    expect(result.Status).toBe('OUT');

    const auditCall = mockQuery.mock.calls[2][0] as string;
    expect(auditCall).toContain('INSERT INTO vms.AuditLogs');
  });
});

describe('getActiveVisits', () => {
  it('delegates to listVisits with status IN', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ total: 1 }] })
      .mockResolvedValueOnce({ recordset: [completedVisitRow] });

    const result = await getActiveVisits({});
    expect(result.data).toHaveLength(1);
  });
});

describe('getDashboardStats', () => {
  it('returns all four stats with zero defaults', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ total: 10 }] }) // visitorsToday
      .mockResolvedValueOnce({ recordset: [{ total: 3 }] })   // currentlyInside
      .mockResolvedValueOnce({ recordset: [{ total: 5 }] })   // checkedOutToday
      .mockResolvedValueOnce({ recordset: [{ total: 2 }] });  // inductionRequiredToday

    const result = await getDashboardStats();
    expect(result.visitorsToday).toBe(10);
    expect(result.currentlyInside).toBe(3);
    expect(result.checkedOutToday).toBe(5);
    expect(result.inductionRequiredToday).toBe(2);
  });

  it('uses visitor participation rows consistently for every KPI', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ total: 3 }] })
      .mockResolvedValueOnce({ recordset: [{ total: 3 }] })
      .mockResolvedValueOnce({ recordset: [{ total: 3 }] })
      .mockResolvedValueOnce({ recordset: [{ total: 2 }] });
    const result = await getDashboardStats();
    expect(result).toEqual({ visitorsToday: 3, currentlyInside: 3, checkedOutToday: 3, inductionRequiredToday: 2 });
    expect(mockQuery.mock.calls[2][0]).toContain('vms.VisitVisitors');
    expect(mockQuery.mock.calls[3][0]).toContain('vms.VisitVisitors');
  });

  it('defaults to 0 when recordsets are empty', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{}] })
      .mockResolvedValueOnce({ recordset: [{}] })
      .mockResolvedValueOnce({ recordset: [{}] })
      .mockResolvedValueOnce({ recordset: [{}] });

    const result = await getDashboardStats();
    expect(result.visitorsToday).toBe(0);
    expect(result.currentlyInside).toBe(0);
    expect(result.checkedOutToday).toBe(0);
    expect(result.inductionRequiredToday).toBe(0);
  });
});
