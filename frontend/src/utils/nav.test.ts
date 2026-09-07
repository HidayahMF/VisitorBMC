import { describe, expect, it } from 'vitest';
import { isNavRouteActive } from './nav';

const visits = { to: '/visits', exclude: ['/visits/active'] };
const inside = { to: '/visits/active', exact: true };

describe('navbar route matching', () => {
  it('keeps Visits active for its child routes', () => {
    expect(isNavRouteActive('/visits', visits)).toBe(true);
    expect(isNavRouteActive('/visits/new', visits)).toBe(true);
    expect(isNavRouteActive('/visits/123', visits)).toBe(true);
  });

  it('activates only Inside for the active-visits route', () => {
    expect(isNavRouteActive('/visits/active', visits)).toBe(false);
    expect(isNavRouteActive('/visits/active', inside)).toBe(true);
  });

  it('does not match similar but unrelated paths', () => {
    expect(isNavRouteActive('/visitors', visits)).toBe(false);
    expect(isNavRouteActive('/visits/archive', inside)).toBe(false);
  });
});
