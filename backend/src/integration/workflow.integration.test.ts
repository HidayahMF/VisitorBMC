import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// ---------------------------------------------------------------------------
// Full-workflow integration test at the HTTP layer.
//
// Exercises the real Express app + middleware (auth cookie, route wiring,
// request/response shapes) end to end. All database state is provided by
// mocked services, so this test never touches a production or development
// database.
//
// Service-level DB logic is covered by the unit tests in src/services/*.test.ts.
// ---------------------------------------------------------------------------

vi.mock('../services/auth.service', () => ({
  findUserForLogin: vi.fn(),
  comparePassword: vi.fn(),
  generateToken: vi.fn(() => 'integration-test-token'),
  verifyToken: vi.fn(() => ({ userId: 1, role: 'ADMIN' })),
  getUserById: vi.fn(),
  toSafeUser: (u: { Id: number; Name: string; Username: string; Role: string }) => ({
    id: u.Id, name: u.Name, username: u.Username, role: u.Role,
  }),
}));

vi.mock('../services/audit-log.service', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  tryLogAudit: vi.fn(() => Promise.resolve()),
}));

vi.mock('../services/companies.service', () => ({
  createCompany: vi.fn(),
  listCompanies: vi.fn(),
  getCompanyById: vi.fn(),
}));

vi.mock('../services/visitors.service', () => ({
  getVisitorById: vi.fn(),
  createVisitor: vi.fn(),
  getVisitorVisitHistory: vi.fn(),
}));

vi.mock('../services/visits.service', () => ({
  createVisit: vi.fn(),
  getVisitById: vi.fn(),
  listVisits: vi.fn(),
  getActiveVisits: vi.fn(),
  checkInVisit: vi.fn(),
  checkOutVisit: vi.fn(),
  safetyCheck: vi.fn(),
  getDashboardStats: vi.fn(),
}));

vi.mock('../services/safety-inductions.service', () => ({
  getActiveInductionWithContents: vi.fn(),
  getInductionHistory: vi.fn(),
  completeInduction: vi.fn(),
  completeInductionByToken: vi.fn(),
  getPublicInductionWorkflowByToken: vi.fn(),
  issuePublicInductionToken: vi.fn(),
}));

import app from '../app';

import * as authService from '../services/auth.service';
import * as companiesService from '../services/companies.service';
import * as visitorsService from '../services/visitors.service';
import * as visitsService from '../services/visits.service';
import * as inductionsService from '../services/safety-inductions.service';

type ServerLike = {
  listen: (port: number) => unknown;
  address: () => unknown;
  close: (cb: () => void) => void;
  once: (e: string, cb: () => void) => void;
};

const adminUser = { Id: 1, Name: 'Admin User', Username: 'admin', Role: 'ADMIN', IsActive: true, PasswordHash: 'hashed' };

const company = { Id: 1, CompanyName: 'PT ABC', IsActive: true, CreatedAt: new Date(), UpdatedAt: null };
const visitorA = { Id: 11, VisitorCode: 'VST-000011', VisitorName: 'Andi', CompanyId: 1, PhoneNumber: '0811111111', IsActive: true, CreatedAt: new Date(), UpdatedAt: null };

const NEW_VISIT = {
  Id: 5,
  VisitCode: 'VIS-20260907-001',
  HostName: 'Budi',
  Purpose: 'Supplier Meeting',
  VisitDate: new Date('2026-09-07'),
  CheckInTime: null,
  CheckOutTime: null,
  Status: 'PENDING_INDUCTION' as const,
  CreatedBy: 1,
  CheckedInBy: null,
  CheckedOutBy: null,
  CreatedAt: new Date(),
  UpdatedAt: null,
  Company: { Id: 1, CompanyName: 'PT ABC' },
  Visitors: [
    { Id: 11, VisitorCode: 'VST-000011', VisitorName: 'Andi', PhoneNumber: null, SafetyStatus: 'VALID' as const, ValidUntil: new Date('2027-03-01') },
    { Id: 12, VisitorCode: 'VST-000012', VisitorName: 'Reza', PhoneNumber: null, SafetyStatus: 'REQUIRED' as const, ValidUntil: undefined },
  ],
  SafetySummary: { totalVisitors: 2, cleared: 1, requiresInduction: 1 },
};

const CHECKED_IN = { ...NEW_VISIT, Status: 'IN' as const, CheckInTime: new Date('2026-09-07T02:00:00Z'), CheckedInBy: 1 };
const CHECKED_OUT = { ...CHECKED_IN, Status: 'OUT' as const, CheckOutTime: new Date('2026-09-07T04:00:00Z'), CheckedOutBy: 1 };

// list endpoint rows are IVisit-shaped (flat CompanyId/CompanyName), not detail-shaped
const LIST_ROW_IN = {
  Id: 5, VisitCode: 'VIS-20260907-001', CompanyId: 1, CompanyName: 'PT ABC', HostName: 'Budi', Purpose: 'Supplier Meeting',
  VisitDate: new Date('2026-09-07'), CheckInTime: new Date('2026-09-07T02:00:00Z'), CheckOutTime: null,
  Status: 'IN' as const, CreatedBy: 1, CheckedInBy: 1, CheckedOutBy: null, CreatedAt: new Date(), UpdatedAt: null, VisitorCount: 2,
};
const LIST_ROW_OUT = { ...LIST_ROW_IN, Status: 'OUT' as const, CheckOutTime: new Date('2026-09-07T04:00:00Z'), CheckedOutBy: 1 };

let server: ServerLike;
let baseUrl: string;

async function makeRequest(path: string, options: { method?: string; body?: unknown; cookie?: string } = {}) {
  const { method = 'GET', body, cookie } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { res, status: res.status, body: text ? JSON.parse(text) : null, setCookie: res.headers.get('set-cookie') };
}

beforeAll(async () => {
  server = app.listen(0) as unknown as ServerLike;
  await new Promise<void>((resolve) => {
    server.once('listening', resolve);
  });
  const address = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${address.port}`;

  vi.mocked(authService.findUserForLogin).mockResolvedValue(adminUser);
  vi.mocked(authService.comparePassword).mockResolvedValue(true);
  vi.mocked(authService.getUserById).mockResolvedValue(adminUser);

  vi.mocked(companiesService.createCompany).mockResolvedValue(company);
  vi.mocked(visitorsService.createVisitor).mockResolvedValue({ visitor: visitorA, potentialMatches: [] });
  vi.mocked(visitorsService.getVisitorById).mockResolvedValue({ ...visitorA, Company: { Id: 1, CompanyName: 'PT ABC' } });
  vi.mocked(visitorsService.getVisitorVisitHistory).mockResolvedValue([
    { VisitId: 5, VisitCode: 'VIS-20260907-001', CompanyName: 'PT ABC', HostName: 'Budi', Purpose: 'Supplier Meeting', VisitDate: new Date('2026-09-07'), CheckInTime: new Date('2026-09-07T02:00:00Z'), CheckOutTime: new Date('2026-09-07T04:00:00Z'), Status: 'OUT' },
  ]);

  vi.mocked(visitsService.createVisit).mockResolvedValue(NEW_VISIT);
  vi.mocked(visitsService.safetyCheck).mockResolvedValue({
    safetyInduction: { id: 1, title: 'Visitor Safety Induction', version: 1, validMonths: 6, forceReinductionOnNewVersion: false },
    summary: { totalVisitors: 2, valid: 1, required: 1, expired: 0, requiresInduction: 1 },
    visitors: [],
  });
  vi.mocked(visitsService.checkInVisit).mockResolvedValue(CHECKED_IN);
  vi.mocked(visitsService.checkOutVisit).mockResolvedValue(CHECKED_OUT);
  vi.mocked(visitsService.listVisits).mockResolvedValue({
    data: [LIST_ROW_OUT],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  });
  vi.mocked(visitsService.getActiveVisits).mockResolvedValue({
    data: [LIST_ROW_IN],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  });

  vi.mocked(inductionsService.completeInduction).mockResolvedValue({
    recordId: 99,
    completedAt: new Date('2026-09-07T02:00:00Z'),
    acknowledgedAt: new Date('2026-09-07T02:00:00Z'),
    validUntil: new Date('2027-03-07T02:00:00Z'),
  });
  vi.mocked(inductionsService.getInductionHistory).mockResolvedValue([]);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('full workflow (HTTP integration, mocked services)', () => {
  it('rejects unauthenticated access', async () => {
    const { status } = await makeRequest('/api/visits');
    expect(status).toBe(401);
  });

  it('issues a public induction token only to authenticated operators', async () => {
    expect((await makeRequest('/api/safety-inductions/access/5', { method: 'POST' })).status).toBe(401);
    vi.mocked(inductionsService.issuePublicInductionToken).mockResolvedValue({ token: 'x'.repeat(43), expiresAt: new Date('2026-09-07T04:00:00Z') });
    const login = await makeRequest('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'secret123' } });
    const cookie = login.setCookie?.split(';')[0] as string;
    const response = await makeRequest('/api/safety-inductions/access/5', { method: 'POST', cookie });
    expect(response.status).toBe(200);
    expect(response.body.token).toHaveLength(43);
  });

  it('does not expose workflow data for an invalid token', async () => {
    vi.mocked(inductionsService.getPublicInductionWorkflowByToken).mockRejectedValue(new Error('invalid token'));
    const response = await makeRequest('/api/safety-inductions/token/not-a-token/workflow');
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('VisitCode');
  });

  it('logs in, authenticates via cookie, and runs the full visit lifecycle', async () => {
    // 1. authentication
    const login = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'secret123' },
    });
    expect(login.status).toBe(200);
    expect(login.body.user.username).toBe('admin');
    const cookie = login.setCookie?.split(';')[0] as string;
    expect(cookie).toContain('jwt=');

    // 2. whoami via cookie
    const me = await makeRequest('/api/auth/me', { cookie });
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('ADMIN');

    // 3. create company
    vi.mocked(companiesService.createCompany).mockClear();
    const companyRes = await makeRequest('/api/companies', { method: 'POST', cookie, body: { companyName: 'PT ABC' } });
    expect(companyRes.status).toBe(201);
    expect(companiesService.createCompany).toHaveBeenCalledWith('PT ABC');

    // 4. create visitor
    const visitorRes = await makeRequest('/api/visitors', { method: 'POST', cookie, body: { visitorName: 'Andi', companyId: 1, phoneNumber: '0811111111' } });
    expect(visitorRes.status).toBe(201);
    expect(visitorRes.body.visitor.VisitorCode).toBe('VST-000011');

    // 5. safety check during registration wizard
    const safetyRes = await makeRequest('/api/visits/safety-check', { method: 'POST', cookie, body: { companyId: 1, visitorIds: [11, 12] } });
    expect(safetyRes.status).toBe(200);
    expect(safetyRes.body.summary.requiresInduction).toBe(1);

    // 6. create visit (multiple visitors) -> PENDING_INDUCTION
    const createRes = await makeRequest('/api/visits', { method: 'POST', cookie, body: { companyId: 1, hostName: 'Budi', purpose: 'Supplier Meeting', visitDate: '2026-09-07', visitorIds: [11, 12] } });
    expect(createRes.status).toBe(201);
    expect(createRes.body.VisitCode).toBe('VIS-20260907-001');
    expect(createRes.body.Status).toBe('PENDING_INDUCTION');
    expect(visitsService.createVisit).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 1, visitorIds: [11, 12], ipAddress: expect.any(String) }),
      1,
    );

    // 7. complete required induction
    vi.mocked(inductionsService.completeInductionByToken).mockResolvedValue({ result: { recordId: 99, completedAt: new Date(), acknowledgedAt: new Date(), validUntil: new Date('2027-03-07T02:00:00') }, workflow: {} as never });
    const inductionRes = await makeRequest('/api/safety-inductions/complete', { method: 'POST', cookie, body: { token: 'a'.repeat(43), visitorId: 12, acknowledged: true } });
    expect(inductionRes.status).toBe(200);
    expect(inductionRes.body.recordId).toBe(99);
    expect(String(inductionRes.body.validUntil)).toContain('2027-03-06T19:00:00');

    // 8. check-in (arg #2 = authenticated user id)
    const checkInRes = await makeRequest('/api/visits/5/checkin', { method: 'PUT', cookie });
    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.Status).toBe('IN');
    expect(visitsService.checkInVisit).toHaveBeenCalledWith(5, 1, expect.any(String));

    // 9. currently inside
    const activeRes = await makeRequest('/api/visits/active', { cookie });
    expect(activeRes.status).toBe(200);
    expect(activeRes.body.data[0].Status).toBe('IN');

    // 10. check-out
    const checkOutRes = await makeRequest('/api/visits/5/checkout', { method: 'PUT', cookie });
    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.Status).toBe('OUT');
    expect(visitsService.checkOutVisit).toHaveBeenCalledWith(5, 1, expect.any(String));

    // 11. visit history
    const historyRes = await makeRequest('/api/visits?status=OUT', { cookie });
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data[0].Status).toBe('OUT');

    // 12. visitor history
    const visitorHistoryRes = await makeRequest('/api/visitors/11/history', { cookie });
    expect(visitorHistoryRes.status).toBe(200);
    expect(visitorHistoryRes.body[0].VisitCode).toBe('VIS-20260907-001');
    expect(visitorHistoryRes.body[0].Status).toBe('OUT');
  });

  it('audits failed login without leaking secrets', async () => {
    vi.mocked(authService.comparePassword).mockResolvedValue(false);
    const res = await makeRequest('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'wrong' } });
    expect(res.status).toBe(401);
    // The literal response must not echo the submitted secret or any hash.
    expect(JSON.stringify(res.body)).not.toContain('wrong');
    expect(JSON.stringify(res.body)).not.toContain('hashed');
    vi.mocked(authService.comparePassword).mockResolvedValue(true);
  });
});
