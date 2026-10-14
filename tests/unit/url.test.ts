import { describe, it, expect } from 'vitest';
import { ensureTrailingSlash, formatCanonicalUrl } from '../../src/utils/url';

describe('URL formatting utilities (unit)', () => {
  it('adds a trailing slash if missing', () => {
    expect(ensureTrailingSlash('/abonnement-iptv')).toBe('/abonnement-iptv/');
    expect(ensureTrailingSlash('/assistance/iptv-buffering')).toBe('/assistance/iptv-buffering/');
  });

  it('preserves existing trailing slashes', () => {
    expect(ensureTrailingSlash('/abonnement-iptv/')).toBe('/abonnement-iptv/');
    expect(ensureTrailingSlash('/')).toBe('/');
  });

  it('formats canonical URLs accurately with trailing slash', () => {
    expect(formatCanonicalUrl('https://example.com', 'abonnement-iptv')).toBe(
      'https://example.com/abonnement-iptv/'
    );
    expect(formatCanonicalUrl('https://example.com/', '/blog/comment-choisir-abonnement-iptv')).toBe(
      'https://example.com/blog/comment-choisir-abonnement-iptv/'
    );
  });

  it('preserves file extensions without adding a trailing slash', () => {
    expect(ensureTrailingSlash('/sitemap.xml')).toBe('/sitemap.xml');
    expect(ensureTrailingSlash('/robots.txt')).toBe('/robots.txt');
    expect(formatCanonicalUrl('https://example.com', 'sitemap.xml')).toBe(
      'https://example.com/sitemap.xml'
    );
  });
});
