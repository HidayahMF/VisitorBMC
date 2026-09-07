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
  },
}));

import {
  listVisitors,
  getVisitorById,
  createVisitor,
  updateVisitor,
  updateVisitorStatus,
  searchVisitors,
  getVisitorVisitHistory,
} from '../services/visitors.service';

beforeEach(() => {
  vi.resetAllMocks();
  mockInput.mockReturnThis();
});

const validCompanyRow = { Id: 1, IsActive: true };
const validVisitorRow = {
  Id: 1,
  VisitorCode: 'VST-000001',
  VisitorName: 'Andi Saputra',
  CompanyId: 1,
  PhoneNumber: '08123456789',
  IsActive: true,
  CreatedAt: new Date(),
  UpdatedAt: null,
};
const validVisitorDetailRow = {
  ...validVisitorRow,
  CompanyName: 'PT ABC',
};

describe('listVisitors', () => {
  it('returns paginated results with company join', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ total: 1 }] })
      .mockResolvedValueOnce({ recordset: [validVisitorDetailRow] });

    const result = await listVisitors({ page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('filters by companyId', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ total: 1 }] })
      .mockResolvedValueOnce({ recordset: [validVisitorDetailRow] });

    const result = await listVisitors({ companyId: 1 });
    expect(result.data).toHaveLength(1);
  });

  it('qualifies visitor IsActive when the list joins companies', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ total: 1 }] })
      .mockResolvedValueOnce({ recordset: [validVisitorDetailRow] });

    await listVisitors({ active: true, page: 1, limit: 20 });

    expect(mockQuery.mock.calls[0][0]).toContain('v.IsActive = @active');
    expect(mockQuery.mock.calls[1][0]).toContain('v.IsActive = @active');
  });
});

describe('getVisitorById', () => {
  it('returns visitor with company', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [validVisitorDetailRow] });
    const result = await getVisitorById(1);
    expect(result).not.toBeNull();
    expect(result!.Company.CompanyName).toBe('PT ABC');
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    const result = await getVisitorById(999);
    expect(result).toBeNull();
  });
});

describe('createVisitor', () => {
  it('creates visitor and generates VisitorCode', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [validCompanyRow] })     // validateCompany
      .mockResolvedValueOnce({ recordset: [] })                    // potential matches by name
      .mockResolvedValueOnce({ recordset: [{ Id: 1, VisitorCode: 'VST-TMP', VisitorName: 'Andi', CompanyId: 1, PhoneNumber: null, IsActive: true, CreatedAt: new Date(), UpdatedAt: null }] })
      .mockResolvedValueOnce({ recordset: [] })                    // update visitorCode
      .mockResolvedValueOnce({ recordset: [validVisitorRow] });    // final select

    const result = await createVisitor({ visitorName: 'Andi', companyId: 1 });
    expect(result.visitor.VisitorCode).toMatch(/^VST-\d{6}$/);
  });

  it('rejects empty name', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [validCompanyRow] });
    await expect(createVisitor({ visitorName: '   ', companyId: 1 })).rejects.toThrow('Visitor name is required');
  });

  it('rejects when company is inactive/not found', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    await expect(createVisitor({ visitorName: 'Andi', companyId: 999 })).rejects.toThrow('Company not found or inactive');
  });

  it('rejects strong duplicate (same name + company + phone)', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [validCompanyRow] })
      .mockResolvedValueOnce({ recordset: [{ Id: 99 }] });

    await expect(
      createVisitor({ visitorName: 'Andi', companyId: 1, phoneNumber: '08123456789' }),
    ).rejects.toThrow('Visitor already exists');
  });

  it('allows same name different phone (not strong duplicate)', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [validCompanyRow] })
      .mockResolvedValueOnce({ recordset: [] })                    // strong dup: phone differs
      .mockResolvedValueOnce({ recordset: [{ Id: 50, VisitorCode: 'VST-000050', VisitorName: 'Andi', PhoneNumber: '08999999999' }] }) // potential matches
      .mockResolvedValueOnce({ recordset: [{ Id: 1, VisitorCode: 'VST-TMP', VisitorName: 'Andi', CompanyId: 1, PhoneNumber: '08111111111', IsActive: true, CreatedAt: new Date(), UpdatedAt: null }] })
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [validVisitorRow] });

    const result = await createVisitor({ visitorName: 'Andi', companyId: 1, phoneNumber: '08111111111' });
    expect(result.visitor).toBeDefined();
  });

  it('creates visitor without phone', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [validCompanyRow] })
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [{ Id: 1, VisitorCode: 'VST-TMP', VisitorName: 'Budi', CompanyId: 1, PhoneNumber: null, IsActive: true, CreatedAt: new Date(), UpdatedAt: null }] })
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [{ ...validVisitorRow, VisitorCode: 'VST-000001', VisitorName: 'Budi', PhoneNumber: null }] });

    const result = await createVisitor({ visitorName: 'Budi', companyId: 1 });
    expect(result.visitor.VisitorCode).toBe('VST-000001');
  });

  it('returns potentialMatches when same name exists', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [validCompanyRow] })
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [{ Id: 50, VisitorCode: 'VST-000050', VisitorName: 'Andi', PhoneNumber: '08999999999' }] })
      .mockResolvedValueOnce({ recordset: [{ Id: 1, VisitorCode: 'VST-TMP', VisitorName: 'Andi', CompanyId: 1, PhoneNumber: '08111111111', IsActive: true, CreatedAt: new Date(), UpdatedAt: null }] })
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [validVisitorRow] });

    const result = await createVisitor({ visitorName: 'Andi', companyId: 1, phoneNumber: '08111111111' });
    expect(result.potentialMatches).toBeDefined();
    expect(result.potentialMatches!.length).toBeGreaterThan(0);
  });
});

describe('updateVisitor', () => {
  it('updates visitor name', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ CompanyId: 1 }] })
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({
        recordset: [{ ...validVisitorRow, VisitorName: 'Andi Baru' }],
      });

    const result = await updateVisitor(1, { visitorName: 'Andi Baru' });
    expect(result).not.toBeNull();
    expect(result!.VisitorName).toBe('Andi Baru');
  });

  it('rejects empty name', async () => {
    await expect(updateVisitor(1, { visitorName: '   ' })).rejects.toThrow('Visitor name cannot be empty');
  });

  it('rejects duplicate name in same company', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ CompanyId: 1 }] })
      .mockResolvedValueOnce({ recordset: [{ Id: 2 }] });

    await expect(updateVisitor(1, { visitorName: 'Reza' })).rejects.toThrow('Visitor with this name already exists in this company');
  });

  it('throws when no fields provided', async () => {
    await expect(updateVisitor(1, {})).rejects.toThrow('No fields to update');
  });
});

describe('updateVisitorStatus', () => {
  it('deactivates visitor', async () => {
    mockQuery.mockResolvedValueOnce({
      recordset: [{ ...validVisitorRow, IsActive: false }],
    });

    const result = await updateVisitorStatus(1, false);
    expect(result).not.toBeNull();
    expect(result!.IsActive).toBe(false);
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    const result = await updateVisitorStatus(999, false);
    expect(result).toBeNull();
  });
});

describe('searchVisitors', () => {
  it('returns matching visitors', async () => {
    mockQuery.mockResolvedValueOnce({
      recordset: [{ Id: 1, VisitorCode: 'VST-000001', VisitorName: 'Andi', PhoneNumber: null }],
    });

    const result = await searchVisitors('andi');
    expect(result).toHaveLength(1);
  });

  it('returns empty for empty query', async () => {
    const result = await searchVisitors('   ');
    expect(result).toHaveLength(0);
  });
});

describe('getVisitorVisitHistory', () => {
  it('returns visit history entries ordered newest first', async () => {
    mockQuery.mockResolvedValueOnce({
      recordset: [
        { VisitId: 2, VisitCode: 'VIS-20260907-002', CompanyName: 'PT ABC', HostName: 'Budi', Purpose: 'Meeting', VisitDate: new Date('2026-09-07'), CheckInTime: new Date('2026-09-07T02:00:00Z'), CheckOutTime: new Date('2026-09-07T04:00:00Z'), Status: 'OUT' },
      ],
    });

    const result = await getVisitorVisitHistory(1);
    expect(result).toHaveLength(1);
    expect(result[0].VisitCode).toBe('VIS-20260907-002');
    expect(result[0].CompanyName).toBe('PT ABC');
    expect(result[0].CheckInTime).toBeInstanceOf(Date);
    expect(result[0].Status).toBe('OUT');
  });

  it('returns empty array when visitor has no visits', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    const result = await getVisitorVisitHistory(999);
    expect(result).toEqual([]);
  });
});
