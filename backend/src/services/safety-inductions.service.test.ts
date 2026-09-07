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

vi.mock('./safety-clearance.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./safety-clearance.service')>();
  return {
    ...actual,
    getActiveSafetyInductionConfig: vi.fn(() =>
      Promise.resolve({ id: 1, title: 'Visitor Safety Induction', version: 1, validMonths: 6, forceReinductionOnNewVersion: false }),
    ),
  };
});

import {
  getActiveInductionWithContents,
  getInductionHistory,
  completeInduction,
} from '../services/safety-inductions.service';

beforeEach(() => {
  vi.resetAllMocks();
  mockInput.mockReturnThis();
});

describe('getActiveInductionWithContents', () => {
  it('returns induction config with ordered contents', async () => {
    mockQuery.mockResolvedValueOnce({
      recordset: [
        { Id: 1, SafetyInductionId: 1, ContentType: 'VIDEO', ContentUrl: '/uploads/a.mp4', Title: 'Intro', Description: null, SortOrder: 1, IsRequired: 1, CreatedAt: new Date() },
        { Id: 2, SafetyInductionId: 1, ContentType: 'IMAGE', ContentUrl: '/uploads/b.png', Title: null, Description: 'Desc', SortOrder: 2, IsRequired: 0, CreatedAt: new Date() },
      ],
    });

    const result = await getActiveInductionWithContents();
    expect(result.induction.title).toBe('Visitor Safety Induction');
    expect(result.induction.version).toBe(1);
    expect(result.induction.validMonths).toBe(6);
    expect(result.contents).toHaveLength(2);
    expect(result.contents[0].ContentType).toBe('VIDEO');
    expect(result.contents[1].IsRequired).toBe(false);
  });
});

describe('getInductionHistory', () => {
  it('returns induction records ordered by CompletedAt desc', async () => {
    mockQuery.mockResolvedValueOnce({
      recordset: [
        { Id: 2, VisitorId: 1, VisitId: 5, SafetyInductionId: 1, InductionVersion: 1, CompletedAt: new Date('2026-01-01'), ValidUntil: new Date('2026-07-01'), Acknowledged: 1, AcknowledgedAt: new Date('2026-01-01'), CreatedBy: 2, CreatedAt: new Date('2026-01-01') },
        { Id: 1, VisitorId: 1, VisitId: 4, SafetyInductionId: 1, InductionVersion: 1, CompletedAt: new Date('2025-06-15'), ValidUntil: new Date('2025-12-15'), Acknowledged: 1, AcknowledgedAt: new Date('2025-06-15'), CreatedBy: 2, CreatedAt: new Date('2025-06-15') },
      ],
    });

    const result = await getInductionHistory(1);
    expect(result).toHaveLength(2);
    expect(result[0].InductionVersion).toBe(1);
    expect(result[0].Acknowledged).toBe(true);
    expect(result[1].ValidUntil).toBeInstanceOf(Date);
  });
});

describe('completeInduction', () => {
  it('rejects when not acknowledged', async () => {
    await expect(
      completeInduction({ visitorId: 1, visitId: 1, acknowledged: false }, 2),
    ).rejects.toThrow('Acknowledgement is required');
  });

  it('returns recordId, completedAt, acknowledgedAt, and validUntil on success', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ Id: 1, VisitorName: 'Andi' }] })   // visitor check
      .mockResolvedValueOnce({ recordset: [{ Id: 1, Status: 'PENDING_INDUCTION' }] }) // visit check
      .mockResolvedValueOnce({ recordset: [{ Id: 1 }] })                          // visit visitor check
      .mockResolvedValueOnce({ recordset: [{ Id: 10, CompletedAt: new Date('2026-09-07'), ValidUntil: new Date('2027-03-07'), AcknowledgedAt: new Date('2026-09-07') }] }) // insert OUTPUT
      .mockResolvedValueOnce({ recordset: [] })                                 // audit INSERT
      .mockResolvedValueOnce({                                                  // visitors + induction records
        recordset: [
          { Id: 1, VisitorName: 'Andi', CompletedAt: new Date('2026-09-07'), ValidUntil: new Date('2027-03-07'), InductionVersion: 1 },
        ],
      })
      .mockResolvedValueOnce({ rowsAffected: [1], recordset: [] });             // status UPDATE -> READY_FOR_CHECKIN

    const result = await completeInduction({ visitorId: 1, visitId: 1, acknowledged: true, ipAddress: '10.0.0.2' }, 2);
    expect(result.recordId).toBe(10);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.acknowledgedAt).toBeInstanceOf(Date);
    expect(result.validUntil).toBeInstanceOf(Date);

    // Verify ValidUntil is computed from ValidMonths via DATEADD, not hard-coded
    const insertCall = mockQuery.mock.calls[3][0] as string;
    expect(insertCall).toContain('DATEADD(month, @validMonths,');
    expect(insertCall).toContain('SYSUTCDATETIME()');
    expect(insertCall).toContain('ValidUntil');

    // Verify audit log written atomically
    const auditCall = mockQuery.mock.calls[4][0] as string;
    expect(auditCall).toContain('INSERT INTO vms.AuditLogs');

    // Verify visit lifecycle advances to READY_FOR_CHECKIN when all cleared
    const statusUpdateCall = mockQuery.mock.calls[6][0] as string;
    expect(statusUpdateCall).toContain("Status = 'READY_FOR_CHECKIN'");
  });

  it('does not advance visit status when another visitor still requires induction', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ Id: 1, VisitorName: 'Andi' }] })   // visitor check
      .mockResolvedValueOnce({ recordset: [{ Id: 1, Status: 'PENDING_INDUCTION' }] }) // visit check
      .mockResolvedValueOnce({ recordset: [{ Id: 1 }] })                          // visit visitor check
      .mockResolvedValueOnce({ recordset: [{ Id: 10, CompletedAt: new Date('2026-09-07'), ValidUntil: new Date('2027-03-07'), AcknowledgedAt: new Date('2026-09-07') }] }) // insert OUTPUT
      .mockResolvedValueOnce({ recordset: [] })                                 // audit INSERT
      .mockResolvedValueOnce({                                                  // visitors: Andi valid, Reza never completed
        recordset: [
          { Id: 1, VisitorName: 'Andi', CompletedAt: new Date('2026-09-07'), ValidUntil: new Date('2027-03-07'), InductionVersion: 1 },
          { Id: 2, VisitorName: 'Reza', CompletedAt: null, ValidUntil: null, InductionVersion: null },
        ],
      });

    await completeInduction(
      { visitorId: 1, visitId: 1, acknowledged: true, ipAddress: '10.0.0.2' },
      2,
    );

    // No status UPDATE query should run (last query executed is the clearance query)
    const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0] as string;
    expect(lastCall).toContain('SELECT vis.Id');
    expect(lastCall).not.toContain('UPDATE vms.Visits');
  });

  it('throws 404 when visitor not found or inactive', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    await expect(
      completeInduction({ visitorId: 999, visitId: 1, acknowledged: true }, 2),
    ).rejects.toThrow('Visitor not found or inactive');
  });

  it('throws 400 when visitor not part of visit', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ Id: 1, VisitorName: 'Andi' }] })
      .mockResolvedValueOnce({ recordset: [{ Id: 1, Status: 'PENDING_INDUCTION' }] })
      .mockResolvedValueOnce({ recordset: [] });   // no VisitVisitors row
    await expect(
      completeInduction({ visitorId: 1, visitId: 1, acknowledged: true }, 2),
    ).rejects.toThrow('Visitor is not part of this visit');
  });
});
