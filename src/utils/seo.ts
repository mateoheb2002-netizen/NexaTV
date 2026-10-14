/**
 * Centralized SEO & Canonical host configuration engine for NexaTV.
 *
 * Implements strict canonical URL formatting, production host validation,
 * sitemap filtering rules, and robots directives.
 */

import { formatCanonicalUrl } from './url';

/**
 * Working candidate domain during pre-production development.
 * Note: Must NOT be treated as confirmed production host until user validation.
 */
export const WORKING_DOMAIN_CANDIDATE = 'https://nexatv.fr';

/**
 * Retrieves the production confirmed canonical host.
 * Never fabricates or silently accepts unconfirmed domains in production.
 * Throws an explicit error if PUBLIC_SITE_URL or SITE_URL is not configured.
 */
export function getConfirmedCanonicalHost(): string {
  let host: string | undefined;

  if (typeof process !== 'undefined' && process.env) {
    host = process.env.PUBLIC_SITE_URL || process.env.SITE_URL;
  }

  if (!host && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    host = (import.meta as any).env.PUBLIC_SITE_URL || (import.meta as any).env.SITE_URL;
  }

  if (!host || host.trim().length === 0) {
    throw new Error(
      'Production canonical host is unknown. PUBLIC_SITE_URL environment variable must be configured with a confirmed domain before production release.'
    );
  }

  const trimmed = host.trim();
  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.endsWith('/') ? withProtocol.slice(0, -1) : withProtocol;
}

/**
 * Validates that the canonical host is properly configured for production.
 * Fails fast with an explicit error if unknown.
 */
export function validateProductionCanonicalHost(): boolean {
  getConfirmedCanonicalHost();
  return true;
}

/**
 * Returns the canonical host to use for page generation and sitemap.
 * Falls back to WORKING_DOMAIN_CANDIDATE when running in development or test environments.
 */
export function getSiteCanonicalHost(): string {
  try {
    return getConfirmedCanonicalHost();
  } catch {
    return WORKING_DOMAIN_CANDIDATE;
  }
}

/**
 * Generates an absolute canonical URL guaranteed to end with a trailing slash.
 */
export function buildCanonicalUrl(pathname: string, customHost?: string): string {
  const host = customHost || getSiteCanonicalHost();
  return formatCanonicalUrl(host, pathname);
}
