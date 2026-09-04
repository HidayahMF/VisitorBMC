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
    Bit: vi.fn(() => ({ type: 'Bit' })),
  },
}));

import { normalizeName, listCompanies, getCompanyById, createCompany, updateCompany, updateCompanyStatus, findCompaniesBySearch } from '../services/companies.service';

beforeEach(() => {
  vi.resetAllMocks();
  mockInput.mockReturnThis();
});

describe('normalizeName', () => {
  it('trims whitespace', () => {
    expect(normalizeName('  ABC  ')).toBe('ABC');
  });

  it('collapses repeated spaces', () => {
    expect(normalizeName('PT   ABC   XYZ')).toBe('PT ABC XYZ');
  });

  it('returns empty string for whitespace-only', () => {
    expect(normalizeName('   ')).toBe('');
  });
});

describe('createCompany', () => {
  it('creates a company with normalized name', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({
        recordset: [{ Id: 1, CompanyName: 'PT ABC', IsActive: true, CreatedAt: new Date(), UpdatedAt: null }],
      });

    const result = await createCompany('  PT   ABC  ');
    expect(result.CompanyName).toBe('PT ABC');
    expect(result.Id).toBe(1);
  });

  it('rejects empty name', async () => {
    await expect(createCompany('   ')).rejects.toThrow('Company name cannot be empty');
  });

  it('rejects duplicate company (case-insensitive)', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [{ Id: 1 }] });
    await expect(createCompany('PT ABC')).rejects.toThrow('Company already exists');
  });
});

describe('getCompanyById', () => {
  it('returns company when found', async () => {
    mockQuery.mockResolvedValueOnce({
      recordset: [{ Id: 1, CompanyName: 'PT ABC', IsActive: true, CreatedAt: new Date(), UpdatedAt: null }],
    });

    const result = await getCompanyById(1);
    expect(result).not.toBeNull();
    expect(result!.Id).toBe(1);
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    const result = await getCompanyById(999);
    expect(result).toBeNull();
  });
});

describe('listCompanies', () => {
  it('returns paginated results', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ total: 2 }] })
      .mockResolvedValueOnce({
        recordset: [
          { Id: 1, CompanyName: 'PT ABC', IsActive: true, CreatedAt: new Date(), UpdatedAt: null },
          { Id: 2, CompanyName: 'PT XYZ', IsActive: true, CreatedAt: new Date(), UpdatedAt: null },
        ],
      });

    const result = await listCompanies({ page: 1, limit: 20 });
    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('searches by query', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [{ total: 1 }] })
      .mockResolvedValueOnce({
        recordset: [{ Id: 1, CompanyName: 'PT ABC', IsActive: true, CreatedAt: new Date(), UpdatedAt: null }],
      });

    const result = await listCompanies({ q: 'abc' });
    expect(result.data).toHaveLength(1);
  });
});

describe('updateCompany', () => {
  it('updates company name', async () => {
    mockQuery
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({
        recordset: [{ Id: 1, CompanyName: 'PT NEW', IsActive: true, CreatedAt: new Date(), UpdatedAt: new Date() }],
      });

    const result = await updateCompany(1, 'PT NEW');
    expect(result).not.toBeNull();
    expect(result!.CompanyName).toBe('PT NEW');
  });

  it('rejects duplicate name', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [{ Id: 2 }] });
    await expect(updateCompany(1, 'PT XYZ')).rejects.toThrow('Company already exists');
  });

  it('rejects empty name', async () => {
    await expect(updateCompany(1, '   ')).rejects.toThrow('Company name cannot be empty');
  });
});

describe('updateCompanyStatus', () => {
  it('deactivates company', async () => {
    mockQuery.mockResolvedValueOnce({
      recordset: [{ Id: 1, CompanyName: 'PT ABC', IsActive: false, CreatedAt: new Date(), UpdatedAt: new Date() }],
    });

    const result = await updateCompanyStatus(1, false);
    expect(result).not.toBeNull();
    expect(result!.IsActive).toBe(false);
  });

  it('returns null when company not found', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    const result = await updateCompanyStatus(999, false);
    expect(result).toBeNull();
  });
});

describe('findCompaniesBySearch', () => {
  it('returns matching companies', async () => {
    mockQuery.mockResolvedValueOnce({
      recordset: [{ Id: 1, CompanyName: 'PT ABC', IsActive: true, CreatedAt: new Date(), UpdatedAt: null }],
    });

    const result = await findCompaniesBySearch('abc');
    expect(result).toHaveLength(1);
  });

  it('returns empty for empty query', async () => {
    const result = await findCompaniesBySearch('   ');
    expect(result).toHaveLength(0);
  });
});
