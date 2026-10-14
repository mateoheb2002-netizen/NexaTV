import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateInternalLinks } from '../../src/utils/link-validator';

const projectRoot = path.resolve(__dirname, '../../');
const distDir = path.join(projectRoot, 'dist');
const dist404Path = path.join(distDir, '404.html');

describe('Error Handling (404) & Internal Link Validation', () => {
  it('Test 1: Unknown route returns static 404 error page behavior', () => {
    expect(fs.existsSync(dist404Path), 'dist/404.html must exist after build').toBe(true);
    const html = fs.readFileSync(dist404Path, 'utf-8');

    // HTML5 and doctype
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html[^>]*lang=["']fr(-FR)?["']/i);

    // Title and robots noindex to prevent indexing error page
    expect(html).toMatch(/<title>[^<]*404[^<]*<\/title>/i);
    expect(html).toMatch(/<meta[^>]*name=["']robots["'][^>]*content=["']noindex/i);

    // Explanatory H1 in French
    const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches!.length).toBe(1);
    expect(h1Matches![0]).toMatch(/Page introuvable|404/i);
  });

  it('Test 2: 404 page provides functional recovery link to homepage', () => {
    const html = fs.readFileSync(dist404Path, 'utf-8');
    expect(html).toMatch(/<a\b[^>]*href="\/"[^>]*>/);
  });

  it('Test 3: 404 page links to published assistance and pricing routes', () => {
    const html = fs.readFileSync(dist404Path, 'utf-8');
    expect(html).toMatch(/<a\b[^>]*href="\/assistance\/"[^>]*>/);
    expect(html).toMatch(/<a\b[^>]*href="\/abonnement-iptv\/"[^>]*>/);
  });

  it('Test 4: Broken internal links fail validation', () => {
    const simulatedHtml = `
      <html>
        <body>
          <a href="/route-inexistante-fantome/">Lien brisé</a>
        </body>
      </html>
    `;

    // Create a temporary scratch directory with the broken link
    const scratchDir = path.join(projectRoot, 'scratch_test_broken_links');
    fs.mkdirSync(scratchDir, { recursive: true });
    fs.writeFileSync(path.join(scratchDir, 'index.html'), simulatedHtml, 'utf-8');

    try {
      const result = validateInternalLinks({ distDir: scratchDir });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].targetHref).toBe('/route-inexistante-fantome/');
      expect(result.errors[0].reason).toMatch(/introuvable|inexistante/i);
    } finally {
      fs.rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  it('Test 5: Links to draft/unpublished guides fail validation', () => {
    const simulatedHtml = `
      <html>
        <body>
          <a href="/guides/installer-iptv-samsung/">Guide en brouillon</a>
        </body>
      </html>
    `;

    const scratchDir = path.join(projectRoot, 'scratch_test_draft_links');
    fs.mkdirSync(scratchDir, { recursive: true });
    fs.writeFileSync(path.join(scratchDir, 'index.html'), simulatedHtml, 'utf-8');

    try {
      const result = validateInternalLinks({ distDir: scratchDir });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].targetHref).toContain('installer-iptv-samsung');
      expect(result.errors[0].reason).toMatch(/brouillon|non publi/i);
    } finally {
      fs.rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  it('Test 6: All published internal links in dist/ pass validation without errors', () => {
    expect(fs.existsSync(distDir), 'dist/ directory must exist before running link check').toBe(true);

    const result = validateInternalLinks({ distDir });

    if (!result.isValid) {
      console.error('Validation errors found in dist/:', result.errors);
    }

    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
    expect(result.checkedLinksCount).toBeGreaterThan(15);
  });

  it('Test 7: Internal fragment links resolve to real section IDs', () => {
    // E.g. /#offres, /#faq, /#appareils, etc.
    const result = validateInternalLinks({ distDir });

    const fragmentErrors = result.errors.filter((e) => e.targetHref.includes('#'));
    expect(fragmentErrors).toEqual([]);
  });

  it('Test 8: 404 layout is accessible, responsive, and uses site landmarks', () => {
    const html = fs.readFileSync(dist404Path, 'utf-8');

    // Landmarks
    expect(html).toContain('<header class="site-header">');
    expect(html).toContain('<main id="main-content" tabindex="-1">');
    expect(html).toContain('<footer class="site-footer">');

    // Skip link
    expect(html).toMatch(/<a\b[^>]*class="skip-link"/);

    // No client framework scripts
    expect(html).not.toMatch(/react(-dom)?/i);
    expect(html).not.toMatch(/vue(\.runtime)?/i);
  });
});
