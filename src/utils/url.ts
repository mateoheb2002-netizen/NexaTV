/**
 * Utility functions for URL handling and canonicalization.
 * Enforces trailing slash consistency as specified in project requirements.
 */

/**
 * Ensures a pathname ends with a trailing slash, unless it points to a file with an extension.
 */
export function ensureTrailingSlash(pathname: string): string {
  if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
    try {
      const url = new URL(pathname);
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      if (lastSegment && /\.[a-zA-Z0-9]+$/.test(lastSegment)) {
        return pathname;
      }
      if (!url.pathname.endsWith('/')) {
        url.pathname = `${url.pathname}/`;
      }
      return url.toString();
    } catch {
      // fallback
    }
  }

  const lastSegment = pathname.split('/').filter(Boolean).pop();
  if (lastSegment && /\.[a-zA-Z0-9]+$/.test(lastSegment)) {
    return pathname;
  }

  if (!pathname.endsWith('/')) {
    return `${pathname}/`;
  }
  return pathname;
}

/**
 * Formats a canonical URL with domain and path, guaranteeing a trailing slash.
 */
export function formatCanonicalUrl(domain: string, pathname: string): string {
  const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${cleanDomain}${ensureTrailingSlash(cleanPath)}`;
}
