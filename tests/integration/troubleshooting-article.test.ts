import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');
const articleMdPath = path.join(projectRoot, 'src/content/blog/iptv-buffering.md');
const assistanceDynamicRoutePath = path.join(projectRoot, 'src/pages/assistance/[slug].astro');

describe('IPTV Buffering Troubleshooting Article (/assistance/iptv-buffering/)', () => {
  it('Test 1: Article source exists with publication schema and route renders only when published', () => {
    expect(fs.existsSync(articleMdPath), 'src/content/blog/iptv-buffering.md must exist').toBe(true);
    expect(fs.existsSync(assistanceDynamicRoutePath), 'src/pages/assistance/[slug].astro must exist').toBe(true);

    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');
    const routeContent = fs.readFileSync(assistanceDynamicRoutePath, 'utf-8');

    // Asserts publication schema status
    expect(mdContent).toMatch(/status:\s*["']published["']/);
    expect(mdContent).toMatch(/slug:\s*["']iptv-buffering["']/);

    // Dynamic route ensures status === 'published' filter
    expect(routeContent).toMatch(/status\s*===\s*['"]published['"]/);
  });

  it('Test 2: Troubleshooting steps render in the expected logical sequence', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');

    const step1Index = mdContent.search(/##\s*Étape 1[^\n]*(connectivité|débit)/i);
    const step2Index = mdContent.search(/##\s*Étape 2[^\n]*(wi-fi|câble ethernet)/i);
    const step3Index = mdContent.search(/##\s*Étape 3[^\n]*(redémarrer|cache)/i);
    const step4Index = mdContent.search(/##\s*Étape 4[^\n]*(mises?\s+à\s+jour)/i);
    const step5Index = mdContent.search(/##\s*Étape 5[^\n]*(tampon|buffer)/i);
    const step6Index = mdContent.search(/##\s*Étape 6[^\n]*(comparer|autre)/i);
    const step7Index = mdContent.search(/##\s*Étape 7[^\n]*(assistance|support)/i);

    expect(step1Index).toBeGreaterThan(-1);
    expect(step2Index).toBeGreaterThan(step1Index);
    expect(step3Index).toBeGreaterThan(step2Index);
    expect(step4Index).toBeGreaterThan(step3Index);
    expect(step5Index).toBeGreaterThan(step4Index);
    expect(step6Index).toBeGreaterThan(step5Index);
    expect(step7Index).toBeGreaterThan(step6Index);
  });

  it('Test 3: Exactly one H1 exists and targets the primary troubleshooting topic', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');
    // Frontmatter title serves as the single H1 in ArticleLayout
    const titleMatch = mdContent.match(/^title:\s*["'](.*)["']/m);
    expect(titleMatch).not.toBeNull();
    expect(titleMatch![1]).toMatch(/buffering|coupure|bloque/i);

    // The markdown body must NOT contain any raw H1 (# Title)
    const rawH1Matches = mdContent.match(/^#\s+[^\n]+/gm);
    expect(rawH1Matches).toBeNull();
  });

  it('Test 4: Assistance hub link is valid and prominent', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');
    expect(mdContent).toMatch(/href=["']\/assistance\/["']|\[.*\]\(\/assistance\/\)/);
  });

  it('Test 5: No absolute no-buffering or zero-freeze guarantee is present', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');
    const forbiddenClaims = [
      /zéro coupure garanti/i,
      /aucun freeze garanti/i,
      /100%\s*sans coupure/i,
      /garantie zéro buffering/i,
      /zéro temps de chargement/i,
      /flux infaillible/i,
    ];

    for (const pattern of forbiddenClaims) {
      expect(mdContent).not.toMatch(pattern);
    }
  });

  it('Test 6: Article content provides instructional self-service guidance without forcing conversion', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');

    // Avoids purely promotional language
    expect(mdContent).not.toMatch(/achetez maintenant/i);
    expect(mdContent).not.toMatch(/offre exceptionnelle limitée/i);

    // Multi-cause explanation: does not blame solely user network
    expect(mdContent).toMatch(/plusieurs causes|pas uniquement/i);

    // Warning about resetting settings vs cache
    expect(mdContent).toMatch(/paramètres enregistrés|identifiants|favoris/i);
  });

  it('Test 7: Breadcrumbs structure includes Accueil, Assistance, and Article title', () => {
    const routeContent = fs.readFileSync(assistanceDynamicRoutePath, 'utf-8');
    expect(routeContent).toContain('Breadcrumbs');
    expect(routeContent).toContain("href: '/'");
    expect(routeContent).toContain("href: '/assistance/'");
  });

  it('Test 8: Any support CTA uses the technical-support intent', () => {
    const routeContent = fs.readFileSync(assistanceDynamicRoutePath, 'utf-8');
    expect(routeContent).toMatch(/(supportIntent|intent)=["']technical_support["']/);
  });
});
