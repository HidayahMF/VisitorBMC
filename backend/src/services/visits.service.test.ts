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
  CreatedBy: 1, CheckedOutBy: null, CreatedAt: new Date(), UpdatedAt: null,
  CompanyName: 'PT ABC',
};

describe('checkInVisit', () => {
  it('throws 404 when visit not found', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    await expect(checkInVisit(999)).rejects.toThrow('Visit not found');
  });

  it('throws 400 when visit not ready for check-in', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [{ Id: 1, Status: 'PENDING_INDUCTION' }] });
    await expect(checkInVisit(1)).rejects.toThrow('Visit is not ready for check-in');
  });

  it('updates status to IN for a ready visit', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [readyVisitRow] }); // visit lookup

    // getVisitById query chain happens after UPDATE
    mockQuery
      .mockResolvedValueOnce({ recordset: [] })               // UPDATE query result (empty recordset fine)
      .mockResolvedValueOnce({ recordset: [completedVisitRow] }) // getVisitById visit
      .mockResolvedValueOnce({ recordset: [] });              // getVisitById visitors (none)

    const result = await checkInVisit(1);
    expect(result).toBeDefined();
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

  it('updates status to OUT for an inside visit', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [insideVisitRow] })
      .mockResolvedValueOnce({ recordset: [] })               // UPDATE result
      .mockResolvedValueOnce({ recordset: [{ ...completedVisitRow, Status: 'OUT', CheckOutTime: new Date() }] })
      .mockResolvedValueOnce({ recordset: [] });

    const result = await checkOutVisit(1, 1);
    expect(result).toBeDefined();
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
