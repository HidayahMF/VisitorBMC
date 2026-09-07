import { describe, it, expect, vi } from 'vitest';

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

import { logAudit, tryLogAudit } from '../services/audit-log.service';

const executor = { request: mockRequest };

beforeEach(() => {
  vi.resetAllMocks();
  mockInput.mockReturnThis();
});

describe('logAudit', () => {
  it('inserts an audit row with parameterized query and server timestamp omitted (DB default)', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });

    await logAudit(executor, {
      userId: 3,
      action: 'VISIT_CREATED',
      entityType: 'Visit',
      entityId: 42,
      details: '{"visitCode":"VIS-20260907-001"}',
      ipAddress: '10.0.0.5',
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT INTO vms.AuditLogs');
    expect(sql).not.toContain('CreatedAt'); // server-generated default
    expect(sql).not.toContain('password');
    expect(sql).not.toContain('token');
  });

  it('writes nulls when fields are omitted', async () => {
    mockQuery.mockResolvedValueOnce({ recordset: [] });
    await logAudit(executor, {
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

describe('tryLogAudit', () => {
  it('does not rethrow when insert fails (best-effort for login)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db down'));
    await expect(
      tryLogAudit({ action: 'LOGIN_SUCCESS', entityType: 'User' }),
    ).resolves.toBeUndefined();
  });

  it('logs to console on failure without leaking to caller', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockQuery.mockRejectedValueOnce(new Error('db down'));
    await tryLogAudit({ action: 'LOGIN_SUCCESS', entityType: 'User' });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
