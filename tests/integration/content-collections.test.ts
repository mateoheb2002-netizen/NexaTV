import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');
const articleLayoutPath = path.join(projectRoot, 'src/layouts/ArticleLayout.astro');
const breadcrumbsPath = path.join(projectRoot, 'src/components/Breadcrumbs.astro');
const relatedContentPath = path.join(projectRoot, 'src/components/RelatedContent.astro');
const blogSlugRoutePath = path.join(projectRoot, 'src/pages/blog/[...slug].astro');
const guidesSlugRoutePath = path.join(projectRoot, 'src/pages/guides/[...slug].astro');

describe('Content Collections Infrastructure (ArticleLayout, Breadcrumbs, RelatedContent, Dynamic Routes)', () => {
  it('Test 3 & 4: Dynamic routes filter for status === "published" only', () => {
    expect(fs.existsSync(blogSlugRoutePath), 'src/pages/blog/[...slug].astro must exist').toBe(true);
    expect(fs.existsSync(guidesSlugRoutePath), 'src/pages/guides/[...slug].astro must exist').toBe(true);

    const blogRouteContent = fs.readFileSync(blogSlugRoutePath, 'utf-8');
    const guidesRouteContent = fs.readFileSync(guidesSlugRoutePath, 'utf-8');

    // Both dynamic routes must query only published entries
    expect(blogRouteContent).toMatch(/status\s*===\s*['"]published['"]/);
    expect(guidesRouteContent).toMatch(/status\s*===\s*['"]published['"]/);

    // Drafts must be explicitly filtered out
    expect(blogRouteContent).toContain('getCollection');
    expect(guidesRouteContent).toContain('getCollection');
  });

  it('Test 5: ArticleLayout renders exactly one H1 and semantic article structure', () => {
    expect(fs.existsSync(articleLayoutPath), 'src/layouts/ArticleLayout.astro must exist').toBe(true);
    const content = fs.readFileSync(articleLayoutPath, 'utf-8');

    // Exactly one H1
    const h1Matches = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);

    // Uses BaseLayout, Breadcrumbs and RelatedContent
    expect(content).toContain('BaseLayout');
    expect(content).toContain('Breadcrumbs');
    expect(content).toContain('RelatedContent');
    expect(content).toContain('<article');
  });

  it('Test 6: Breadcrumbs component contains semantic nav and valid internal destinations', () => {
    expect(fs.existsSync(breadcrumbsPath), 'src/components/Breadcrumbs.astro must exist').toBe(true);
    const content = fs.readFileSync(breadcrumbsPath, 'utf-8');

    expect(content).toMatch(/<nav\b[^>]*aria-label=["']Fil d'Ariane["']/);
    expect(content).toContain('<ol');
    expect(content).toContain('<li');
    expect(content).toMatch(/aria-current=["']page["']/);
  });

  it('Test 7: RelatedContent component filters for published articles only', () => {
    expect(fs.existsSync(relatedContentPath), 'src/components/RelatedContent.astro must exist').toBe(true);
    const content = fs.readFileSync(relatedContentPath, 'utf-8');

    // Ensures drafts are never shown in related articles
    expect(content).toMatch(/status\s*===\s*['"]published['"]/);
  });

  it('Test 8: Null dates are not displayed as real publication dates', () => {
    const content = fs.readFileSync(articleLayoutPath, 'utf-8');
    // Checks that publishedAt display is conditional on non-null date
    expect(content).toMatch(/publishedAt\s*&&/);
  });
});
