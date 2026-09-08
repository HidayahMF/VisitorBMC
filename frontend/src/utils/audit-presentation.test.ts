import { describe, expect, it } from 'vitest';
import { actionLabel, detailSummary, entityLabel, parseAuditDetails, prettyDetails } from './audit-presentation';
import type { AuditLog } from '../api/audit.api';

const log = (overrides: Partial<AuditLog> = {}): AuditLog => ({ Id: 1, UserId: 2, UserName: 'Hidayah', Action: 'LOGIN_SUCCESS', EntityType: 'User', EntityId: 10, Details: '{"action":"login_success"}', IpAddress: '::1', CreatedAt: '2026-09-09T04:51:09.000Z', ...overrides });

describe('audit presentation', () => {
  it('maps known actions in Indonesian and English', () => {
    expect(actionLabel('LOGIN_SUCCESS', 'id')).toBe('Login berhasil');
    expect(actionLabel('LOGIN_SUCCESS', 'en')).toBe('Login successful');
    expect(actionLabel('VISIT_CREATED', 'id')).toBe('Kunjungan dibuat');
    expect(actionLabel('VISIT_CHECKED_IN', 'en')).toBe('Visit checked in');
    expect(actionLabel('VISIT_CHECKED_OUT', 'id')).toBe('Kunjungan keluar');
    expect(actionLabel('SAFETY_INDUCTION_COMPLETED', 'en')).toBe('Safety induction completed');
  });

  it('maps entities and safely humanizes unknown values', () => {
    expect(entityLabel('VisitorInductionRecord', 'id')).toBe('Safety Induction');
    expect(entityLabel('Visit', 'en')).toBe('Visit');
    expect(actionLabel('NEW_EVENT_TYPE', 'en')).toBe('New event type');
    expect(entityLabel('NewEntityType', 'id')).toBe('New entity type');
  });

  it('keeps technical values available while hiding raw JSON from summaries', () => {
    const entry = log({ Action: 'VISIT_CREATED', EntityType: 'Visit', EntityId: 16, Details: '{"visitCode":"VIS-20260908-001","visitId":16}' });
    expect(detailSummary(entry, 'en')).toBe('Visit VIS-20260908-001 was created.');
    expect(parseAuditDetails(entry.Details)?.visitId).toBe(16);
    expect(prettyDetails(entry.Details)).toContain('\n  "visitId": 16');
    expect(entry.IpAddress).toBe('::1');
    expect(entry.EntityId).toBe(16);
  });

  it('provides safe summaries for login and induction events', () => {
    expect(detailSummary(log(), 'id')).toBe('Pengguna berhasil masuk ke sistem.');
    expect(detailSummary(log({ Action: 'SAFETY_INDUCTION_COMPLETED', Details: '{"visitorId":14}' }), 'en')).toBe('Visitor safety induction was completed.');
  });
});
