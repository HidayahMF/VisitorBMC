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
  },
}));

vi.mock('../config/env', () => ({
  env: {
    HRIS_EMPLOYEE_TABLE: 'dbo.hris_Employee',
    HRIS_EMPLOYEE_NAME_COL: 'Name',
    HRIS_SEARCH_MIN_CHARS: 2,
  },
}));

import { searchEmployees } from '../services/hris.service';

beforeEach(() => {
  vi.resetAllMocks();
  mockInput.mockReturnThis();
});

describe('searchEmployees', () => {
  it('returns employee names from dbo.hris_Employee using a parameterized LIKE + RTRIM', async () => {
    mockQuery.mockResolvedValueOnce({
      recordset: [{ name: 'AANG KUNAEFI' }, { name: 'RINA' }],
    });

    const result = await searchEmployees('aang');
    expect(result).toEqual([{ name: 'AANG KUNAEFI' }, { name: 'RINA' }]);

    const sqlText = mockQuery.mock.calls[0][0] as string;
    expect(sqlText).toContain('FROM dbo.hris_Employee');
    expect(sqlText).toContain('RTRIM([Name]) LIKE @q');
    expect(sqlText).toContain('TOP (@limit)');
  });

  it('returns empty when query is below the minimum characters', async () => {
    const result = await searchEmployees('a');
    expect(result).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('caps the result limit at 50', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    await searchEmployees('bu', 500);
    const inputLimit = mockInput.mock.calls.find((c) => c[0] === 'limit');
    expect(inputLimit?.[2]).toBe(50);
  });
});