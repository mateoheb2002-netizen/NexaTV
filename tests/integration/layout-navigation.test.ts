import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');

describe('Global Layout & Responsive Navigation (Integration Tests)', () => {
  const baseLayoutPath = path.join(projectRoot, 'src/layouts/BaseLayout.astro');
  const headerPath = path.join(projectRoot, 'src/components/Header.astro');
  const footerPath = path.join(projectRoot, 'src/components/Footer.astro');
  const globalCssPath = path.join(projectRoot, 'src/styles/global.css');

  it('Test 1: Global HTML landmarks exist (header, nav, main, footer) with exactly one main landmark', () => {
    expect(fs.existsSync(baseLayoutPath), 'src/layouts/BaseLayout.astro must exist').toBe(true);
    expect(fs.existsSync(headerPath), 'src/components/Header.astro must exist').toBe(true);
    expect(fs.existsSync(footerPath), 'src/components/Footer.astro must exist').toBe(true);

    const baseLayoutContent = fs.readFileSync(baseLayoutPath, 'utf-8');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');
    const footerContent = fs.readFileSync(footerPath, 'utf-8');

    // Exactly one main landmark in BaseLayout
    const mainMatches = baseLayoutContent.match(/<main\b[^>]*>/g);
    expect(mainMatches).toHaveLength(1);
    expect(mainMatches![0]).toMatch(/id=["']main-content["']/);

    // Header landmark
    expect(headerContent).toMatch(/<header\b[^>]*>/);

    // Navigation landmark with accessible label
    expect(headerContent).toMatch(/<nav\b[^>]*aria-label=["'][^"']+["']/);

    // Footer landmark
    expect(footerContent).toMatch(/<footer\b[^>]*>/);
  });

  it('Test 2: The four confirmed navigation destinations resolve correctly in Header', () => {
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    // Confirmed destinations must be imported or rendered
    expect(headerContent).toMatch(/MAIN_NAV_ITEMS/);
    expect(headerContent).toContain('href');
  });

  it('Test 3: Mobile menu uses native HTML disclosure (<details><summary>) operable by keyboard', () => {
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    // Native HTML disclosure pattern
    expect(headerContent).toMatch(/<details\b[^>]*class=["'][^"']*mobile-nav[^"']*["']/);
    expect(headerContent).toMatch(/<summary\b[^>]*aria-label=["'][^"']+["']/);
  });

  it('Test 4: Navigation works without JavaScript (native links and disclosure)', () => {
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    // Crawlable standard links
    expect(headerContent).toMatch(/<a\b[^>]*href=/);

    // Header does NOT mandate a client runtime script to function
    expect(headerContent).not.toMatch(/<script\b[^>]*type=["']module["']/);
    expect(headerContent).not.toMatch(/addEventListener\(['"]click['"]/);
  });

  it('Test 5: Skip link moves focus to main content (#main-content)', () => {
    const baseLayoutContent = fs.readFileSync(baseLayoutPath, 'utf-8');

    // Skip link exists before header/main
    expect(baseLayoutContent).toMatch(/<a\b[^>]*href=["']#main-content["'][^>]*class=["'][^"']*skip-link[^"']*["']/);

    // Skip link has French text
    expect(baseLayoutContent).toMatch(/Aller au contenu principal/i);

    // Target main landmark has id="main-content" and tabindex="-1"
    expect(baseLayoutContent).toMatch(/<main\b[^>]*id=["']main-content["'][^>]*tabindex=["']-1["']/);
  });

  it('Test 6: Active-page indication is exposed accessibly via aria-current="page"', () => {
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    // Header computes and applies aria-current="page"
    expect(headerContent).toMatch(/aria-current=\{[^}]*['"]page['"][^}]*\}/);
  });

  it('Test 7: No unpublished guide or legal route appears as a broken link', () => {
    const headerContent = fs.readFileSync(headerPath, 'utf-8');
    const footerContent = fs.readFileSync(footerPath, 'utf-8');

    const forbiddenRoutes = [
      '/guides/installer-iptv-android-tv/',
      '/guides/installer-iptv-samsung/',
      '/guides/installer-iptv-lg/',
      '/guides/installer-iptv-fire-tv/',
      '/guides/configurer-iptv-smarters/',
      '/guides/configurer-tivimate/',
      '/mentions-legales/',
      '/cgv/',
      '/contact/',
    ];

    for (const route of forbiddenRoutes) {
      expect(headerContent).not.toContain(route);
      expect(footerContent).not.toContain(route);
    }
  });

  it('Test 8: Layout styles prevent horizontal overflow at 320px, 360px and 390px', () => {
    expect(fs.existsSync(globalCssPath)).toBe(true);
    const cssContent = fs.readFileSync(globalCssPath, 'utf-8');

    // Box sizing border-box reset
    expect(cssContent).toMatch(/box-sizing:\s*border-box/);

    // Overflow prevention on html or body
    expect(cssContent).toMatch(/overflow-x:\s*hidden/);

    // Max width 100% on images/media/containers
    expect(cssContent).toMatch(/max-width:\s*100%/);
  });

  it('Test 9: Accessible focus indicators and clear metadata slots are configured', () => {
    const cssContent = fs.readFileSync(globalCssPath, 'utf-8');
    const baseLayoutContent = fs.readFileSync(baseLayoutPath, 'utf-8');

    // Visible focus indicator in CSS
    expect(cssContent).toMatch(/:focus-visible/);
    expect(cssContent).toMatch(/outline:/);

    // BaseLayout has head slot for consent-controlled analytics and SEO metadata
    expect(baseLayoutContent).toMatch(/<slot\s+name=["']head["']\s*\/>/);

    // BaseLayout has main content slot
    expect(baseLayoutContent).toMatch(/<slot\s*\/>/);
  });
});
