import type { APIRoute } from 'astro';
import { buildCanonicalUrl } from '../utils/seo';

export const prerender = true;

export const GET: APIRoute = () => {
  const sitemapUrl = buildCanonicalUrl('/sitemap.xml');

  const robotsTxt = `# robots.txt for NexaTV
User-agent: *
Allow: /
Allow: /_astro/
Allow: /favicon.svg

# Sitemap location
Sitemap: ${sitemapUrl}
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
