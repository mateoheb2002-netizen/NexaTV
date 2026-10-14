import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildCanonicalUrl } from '../utils/seo';
import { validateGuideReadiness } from '../utils/guide-validator';

export const prerender = true;

interface SitemapItem {
  path: string;
  lastmod?: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
}

export const GET: APIRoute = async () => {
  // 1. Static Core Landing Pages
  const staticPages: SitemapItem[] = [
    { path: '/', lastmod: '2026-10-14', changefreq: 'weekly', priority: '1.0' },
    { path: '/abonnement-iptv/', lastmod: '2026-10-14', changefreq: 'weekly', priority: '0.9' },
    { path: '/appareils-compatibles/', lastmod: '2026-10-14', changefreq: 'weekly', priority: '0.8' },
    { path: '/assistance/', lastmod: '2026-10-14', changefreq: 'weekly', priority: '0.8' },
  ];

  // 2. Published Blog Articles (strictly status === 'published', excluding redirected/assistance paths)
  const blogEntries = await getCollection('blog', ({ data }) => {
    return data.status === 'published' && data.slug !== 'iptv-buffering';
  });

  const blogPages: SitemapItem[] = blogEntries.map((entry) => ({
    path: `/blog/${entry.data.slug || entry.id}/`,
    lastmod: entry.data.updatedAt?.toISOString().split('T')[0] || entry.data.publishedAt?.toISOString().split('T')[0] || '2026-10-14',
    changefreq: 'monthly',
    priority: '0.7',
  }));

  // 3. Published Assistance Articles
  const assistanceEntries = await getCollection('blog', ({ data }) => {
    return data.status === 'published' && data.slug === 'iptv-buffering';
  });

  const assistancePages: SitemapItem[] = assistanceEntries.map((entry) => ({
    path: `/assistance/${entry.data.slug}/`,
    lastmod: entry.data.updatedAt?.toISOString().split('T')[0] || entry.data.publishedAt?.toISOString().split('T')[0] || '2026-10-14',
    changefreq: 'monthly',
    priority: '0.7',
  }));

  // 4. Validated Published Guides (strictly verified, excluding drafts and unvalidated guides)
  const guideEntries = await getCollection('guides', ({ data }) => data.status === 'published');
  const validGuides: SitemapItem[] = [];

  for (const guide of guideEntries) {
    const validation = validateGuideReadiness(guide.data);
    if (validation.canPublish) {
      validGuides.push({
        path: `/guides/${guide.data.slug || guide.id}/`,
        lastmod: guide.data.updatedAt?.toISOString().split('T')[0] || guide.data.publishedAt?.toISOString().split('T')[0] || '2026-10-14',
        changefreq: 'monthly',
        priority: '0.7',
      });
    }
  }

  const allItems: SitemapItem[] = [
    ...staticPages,
    ...blogPages,
    ...assistancePages,
    ...validGuides,
  ];

  const xmlUrls = allItems
    .map((item) => {
      const absoluteLoc = buildCanonicalUrl(item.path);
      return `  <url>
    <loc>${absoluteLoc}</loc>
    ${item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : ''}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`;
    })
    .join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Robots-Tag': 'noindex', // standard for sitemap itself
    },
  });
};
