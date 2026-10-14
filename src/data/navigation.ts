/**
 * Centralized navigation items and routing utilities for NexaTV.
 * Only confirmed, approved destinations are listed.
 *
 * Market: France (fr-FR)
 */

export interface NavItem {
  readonly label: string;
  readonly href: string;
}

/**
 * Confirmed main navigation links.
 * All internal links strictly maintain trailing slash consistency.
 */
export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Accueil', href: '/' },
  { label: 'Abonnements', href: '/abonnement-iptv/' },
  { label: 'Appareils', href: '/appareils-compatibles/' },
  { label: 'Assistance', href: '/assistance/' },
] as const;

/**
 * Verified confirmed routes set for quick lookup and crawl verification.
 */
export const CONFIRMED_ROUTES: readonly string[] = [
  '/',
  '/abonnement-iptv/',
  '/appareils-compatibles/',
  '/assistance/',
  '/assistance/iptv-buffering/',
  '/blog/comment-choisir-abonnement-iptv/',
] as const;

/**
 * Normalizes a path string to ensure consistent comparison with trailing slashes.
 */
function normalizePath(path: string): string {
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return clean === '' ? '/' : `${clean}/`;
}

/**
 * Checks whether a given navigation target corresponds to the currently active page.
 */
export function isActivePath(currentPath: string, targetHref: string): boolean {
  return normalizePath(currentPath) === normalizePath(targetHref);
}
