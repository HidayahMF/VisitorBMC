export interface NavRoute {
  to: string;
  exact?: boolean;
  exclude?: string[];
}

function matchesPath(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isNavRouteActive(pathname: string, route: NavRoute): boolean {
  if (route.exact) return pathname === route.to;
  if (!matchesPath(pathname, route.to)) return false;

  return !(route.exclude ?? []).some((excludedRoute) =>
    matchesPath(pathname, excludedRoute),
  );
}
