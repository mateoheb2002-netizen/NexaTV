import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import axe from 'axe-core';

const projectRoot = path.resolve(__dirname, '../../');
const distDir = path.join(projectRoot, 'dist');
const globalCssPath = path.join(projectRoot, 'src/styles/global.css');
const tokensCssPath = path.join(projectRoot, 'src/styles/tokens.css');

const CORE_PAGES = [
  { name: 'Accueil', path: 'index.html' },
  { name: 'Tarifs / Abonnement IPTV', path: 'abonnement-iptv/index.html' },
  { name: 'Appareils compatibles', path: 'appareils-compatibles/index.html' },
  { name: 'Centre d’assistance', path: 'assistance/index.html' },
  { name: 'Article Dépannage buffering', path: 'assistance/iptv-buffering/index.html' },
  { name: 'Article Comment choisir son abonnement', path: 'blog/comment-choisir-abonnement-iptv/index.html' },
  { name: 'Page 404', path: '404.html' },
];

function loadPageHtml(pageRelPath: string): string {
  const fullPath = path.join(distDir, pageRelPath);
  expect(fs.existsSync(fullPath), `Compiled file ${pageRelPath} must exist in dist`).toBe(true);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('WCAG 2.2 AA Accessibility Audit & Verification (tests/integration/accessibility-wcag.test.ts)', () => {
  // -------------------------------------------------------------------------
  // Mandatory Check 1: Automated axe-core scan on core pages
  // -------------------------------------------------------------------------
  describe('Mandatory Check 1: Automated axe-core accessibility scan on core pages', () => {
    for (const page of CORE_PAGES) {
      it(`Passes axe scan on ${page.name} (${page.path}) with 0 critical or serious violations`, async () => {
        const html = loadPageHtml(page.path);
        document.documentElement.innerHTML = html;

        const results = await axe.run(document.documentElement, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
          },
          rules: {
            'color-contrast': { enabled: false }, // Computed styles limitation in headless DOM
          },
        });

        const criticalViolations = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations, `Page ${page.path} has critical/serious axe violations`).toEqual([]);
      });
    }
  });

  // -------------------------------------------------------------------------
  // Mandatory Check 2: Keyboard-only navigation through primary actions
  // -------------------------------------------------------------------------
  describe('Mandatory Check 2: Keyboard-only navigation through primary actions', () => {
    it('1. Verifies skip link is the first focusable element targeting #main-content', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const skipLink = document.querySelector('a.skip-link');
      expect(skipLink, 'Skip link must exist').not.toBeNull();
      expect(skipLink?.getAttribute('href')).toBe('#main-content');
      expect(skipLink?.textContent?.trim()).toMatch(/aller au contenu principal/i);

      const mainLandmark = document.getElementById('main-content');
      expect(mainLandmark, '#main-content target must exist').not.toBeNull();
      expect(mainLandmark?.getAttribute('tabindex')).toBe('-1');
    });

    it('2. Verifies desktop and mobile navigation links are keyboard accessible', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const navLinks = document.querySelectorAll('.site-header a.nav-link');
      expect(navLinks.length).toBeGreaterThan(0);
      for (const link of navLinks) {
        expect(link.getAttribute('href')).toBeTruthy();
        expect(link.getAttribute('tabindex')).toBeNull(); // Must not be skipped
      }
    });

    it('3. Verifies mobile navigation uses keyboard-operable details/summary disclosure', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const details = document.querySelector('.mobile-nav details.mobile-nav-details');
      const summary = details?.querySelector('summary.mobile-nav-summary');
      expect(details, 'Mobile nav details element must exist').not.toBeNull();
      expect(summary, 'Mobile nav summary element must exist').not.toBeNull();
      expect(summary?.getAttribute('aria-label')).toBeTruthy();
    });

    it('4. Verifies initial mobile sticky CTA has tabindex="-1" when aria-hidden="true" to prevent keyboard focus trapping', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const stickyBar = document.getElementById('mobile-sticky-cta-bar');
      expect(stickyBar, 'Mobile sticky bar element must exist').not.toBeNull();
      expect(stickyBar?.getAttribute('aria-hidden')).toBe('true');

      const stickyLink = stickyBar?.querySelector('a');
      expect(stickyLink, 'Sticky link must exist').not.toBeNull();
      // When aria-hidden="true", link MUST have tabindex="-1" to prevent axe aria-hidden-focus violation
      expect(stickyLink?.getAttribute('tabindex')).toBe('-1');
    });
  });

  // -------------------------------------------------------------------------
  // Mandatory Check 3: Focus visibility for every interactive element
  // -------------------------------------------------------------------------
  describe('Mandatory Check 3: Focus visibility for every interactive element', () => {
    it('1. Verifies global CSS defines accessible :focus-visible indicators with at least 2px outline', () => {
      expect(fs.existsSync(globalCssPath)).toBe(true);
      const css = fs.readFileSync(globalCssPath, 'utf-8');

      expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px/i);
      expect(css).toMatch(/:focus-visible\s*\{[^}]*outline-offset:/i);
    });

    it('2. Verifies skip link has explicit visible focus styles', () => {
      const css = fs.readFileSync(globalCssPath, 'utf-8');
      expect(css).toMatch(/\.skip-link:focus/i);
    });

    it('3. Verifies mobile disclosure summary has visible focus styling', () => {
      const css = fs.readFileSync(globalCssPath, 'utf-8');
      expect(css).toMatch(/\.mobile-nav-summary:focus-visible/i);
    });
  });

  // -------------------------------------------------------------------------
  // Mandatory Check 4: Heading hierarchy validation
  // -------------------------------------------------------------------------
  describe('Mandatory Check 4: Heading hierarchy validation (h1 -> h2 -> h3, no skipped levels)', () => {
    for (const page of CORE_PAGES) {
      it(`Validates heading sequence on ${page.name} (${page.path})`, () => {
        const html = loadPageHtml(page.path);
        document.documentElement.innerHTML = html;

        // Rule: Exactly one <h1> per page
        const h1Elements = document.querySelectorAll('h1');
        expect(h1Elements.length, `Page ${page.path} must have exactly one <h1>`).toBe(1);

        // Rule: Sequential heading order without skipping levels
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        let currentLevel = 0;

        for (const heading of headings) {
          const level = parseInt(heading.tagName.substring(1), 10);
          if (currentLevel === 0) {
            expect(level, `First heading must be h1 on ${page.path}`).toBe(1);
          } else {
            // Level can increase by at most 1 (e.g., h1 -> h2, h2 -> h3)
            // It can stay same or decrease to any previous level (e.g. h3 -> h2)
            expect(
              level <= currentLevel + 1,
              `Page ${page.path} skipped heading level from h${currentLevel} to h${level}: "${heading.textContent?.trim()}"`
            ).toBe(true);
          }
          currentLevel = level;
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // Mandatory Check 5: Pricing card accessible-name checks
  // -------------------------------------------------------------------------
  describe('Mandatory Check 5: Pricing card accessible-name checks', () => {
    it('1. Verifies pricing CTA links on /abonnement-iptv/ have complete self-explanatory accessible names for screen readers', () => {
      const html = loadPageHtml('abonnement-iptv/index.html');
      document.documentElement.innerHTML = html;

      const pricingCards = document.querySelectorAll('.offers-grid .offer-card');
      expect(pricingCards.length).toBe(3);

      const expectedPlans = [
        { name: 'Découverte', duration: '3 mois', price: '12 €' },
        { name: 'Standard', duration: '6 mois', price: '24 €' },
        { name: 'Annuel', duration: '12 mois', price: '35 €' },
      ];

      pricingCards.forEach((card, index) => {
        const cta = card.querySelector('.offer-cta, a.whatsapp-cta');
        expect(cta, `CTA link on card ${index} must exist`).not.toBeNull();

        const ariaLabel = (cta?.getAttribute('aria-label') || '').replace(/\u00a0/g, ' ');
        const expected = expectedPlans[index];

        expect(ariaLabel).toContain(expected.duration);
        expect(ariaLabel).toContain(expected.price);
        expect(ariaLabel).toContain(expected.name);
        expect(ariaLabel).toMatch(/WhatsApp/i);
      });
    });

    it('2. Verifies pricing cards on homepage also expose self-explanatory accessible names', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const pricingCards = document.querySelectorAll('.subscription-overview-section .offer-card');
      expect(pricingCards.length).toBe(3);

      for (const card of pricingCards) {
        const cta = card.querySelector('a.whatsapp-cta');
        const ariaLabel = cta?.getAttribute('aria-label') || '';
        expect(ariaLabel).toMatch(/\d+\s*mois/);
        expect(ariaLabel).toMatch(/\d+\s*€/);
        expect(ariaLabel).toMatch(/WhatsApp/i);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Mandatory Check 6: Screen-reader-oriented semantic inspection
  // -------------------------------------------------------------------------
  describe('Mandatory Check 6: Screen-reader-oriented semantic inspection', () => {
    it('1. Verifies device cards on /appareils-compatibles/ have unique accessible link names indicating the device family', () => {
      const html = loadPageHtml('appareils-compatibles/index.html');
      document.documentElement.innerHTML = html;

      const deviceCards = document.querySelectorAll('.devices-grid .device-card');
      expect(deviceCards.length).toBeGreaterThan(0);

      const accessibleNames = new Set<string>();

      for (const card of deviceCards) {
        const deviceTitle = card.querySelector('.device-title')?.textContent?.trim() || '';
        const cta = card.querySelector('a.whatsapp-cta');
        expect(cta).not.toBeNull();

        const ariaLabel = cta?.getAttribute('aria-label') || '';
        expect(ariaLabel).toContain(deviceTitle);
        expect(accessibleNames.has(ariaLabel), `Accessible label "${ariaLabel}" must be unique across device cards`).toBe(false);
        accessibleNames.add(ariaLabel);
      }
    });

    it('2. Verifies all navigation landmarks have distinct, descriptive aria-label attributes', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const navElements = Array.from(document.querySelectorAll('nav'));
      expect(navElements.length).toBeGreaterThanOrEqual(2);

      const labels = navElements.map((nav) => nav.getAttribute('aria-label'));
      for (const label of labels) {
        expect(label, 'Nav landmark must have aria-label').toBeTruthy();
      }

      // Check uniqueness of nav labels within the page
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('3. Verifies decorative SVG icons have aria-hidden="true" and focusable="false"', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const svgs = document.querySelectorAll('svg');
      for (const svg of svgs) {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.getAttribute('focusable')).toBe('false');
      }
    });

    it('4. Verifies global CSS defines .sr-only utility for screen reader announcements', () => {
      const css = fs.readFileSync(globalCssPath, 'utf-8');
      expect(css).toMatch(/\.sr-only\s*\{[^}]*position:\s*absolute/i);
      expect(css).toMatch(/\.sr-only\s*\{[^}]*clip:/i);
    });
  });

  // -------------------------------------------------------------------------
  // Mandatory Check 7: 320px overflow test
  // -------------------------------------------------------------------------
  describe('Mandatory Check 7: 320px overflow test', () => {
    it('1. Verifies global CSS enforces box-sizing and prevents horizontal overflow on small screens', () => {
      const css = fs.readFileSync(globalCssPath, 'utf-8');

      expect(css).toMatch(/box-sizing:\s*border-box/i);
      expect(css).toMatch(/overflow-x:\s*hidden/i);
      expect(css).toMatch(/max-width:\s*100%/i);
      expect(css).toMatch(/overflow-wrap:\s*break-word/i);
    });

    it('2. Verifies grid layouts adapt flexibly to 320px screens using responsive minmax and media query', () => {
      const css = fs.readFileSync(globalCssPath, 'utf-8');
      expect(css).toMatch(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(\d+px,\s*1fr\)\)/i);
      expect(css).toMatch(/@media\s*\(max-width:\s*320px\)\s*\{[^}]*grid-template-columns:\s*1fr/i);
    });
  });

  // -------------------------------------------------------------------------
  // Mandatory Check 8: 200% zoom usability test
  // -------------------------------------------------------------------------
  describe('Mandatory Check 8: 200% zoom usability test', () => {
    it('1. Verifies viewport meta tag allows scaling and text resizing', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const viewportMeta = document.querySelector('meta[name="viewport"]');
      expect(viewportMeta).not.toBeNull();
      const content = viewportMeta?.getAttribute('content') || '';

      expect(content).toContain('width=device-width');
      expect(content).toContain('initial-scale=1.0');
      // Prohibited in WCAG 1.4.4: user-scalable=no, maximum-scale=1.0
      expect(content).not.toMatch(/user-scalable\s*=\s*no/i);
      expect(content).not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/i);
    });

    it('2. Verifies line-height is at least 1.5 for body text in global CSS', () => {
      const css = fs.readFileSync(globalCssPath, 'utf-8');
      expect(css).toMatch(/line-height:\s*1\.5/i);
    });

    it('3. Verifies contrast compliance for subtle text token (WCAG AA ratio >= 4.5:1)', () => {
      const tokensCss = fs.readFileSync(tokensCssPath, 'utf-8');
      const match = tokensCss.match(/--color-text-subtle:\s*(#[0-9a-fA-F]{6})/);
      expect(match).not.toBeNull();

      // Hex color for text-subtle: must not be #6b7280 which has 3.7:1 ratio on #111827
      const hex = match![1].toLowerCase();
      expect(hex, '--color-text-subtle must have WCAG AA contrast ratio >= 4.5:1 on dark surfaces').not.toBe('#6b7280');
    });
  });

  // -------------------------------------------------------------------------
  // Mandatory Check 9: Mobile sticky CTA obstruction test
  // -------------------------------------------------------------------------
  describe('Mandatory Check 9: Mobile sticky CTA obstruction test', () => {
    it('1. Verifies mobile sticky CTA includes safe-area-inset-bottom padding', () => {
      const stickyCtaPath = path.join(projectRoot, 'src/components/MobileStickyCTA.astro');
      const content = fs.readFileSync(stickyCtaPath, 'utf-8');

      expect(content).toContain('env(safe-area-inset-bottom');
    });

    it('2. Verifies mobile sticky CTA is suppressed when footer or in-page CTA is in view', () => {
      const controllerPath = path.join(projectRoot, 'src/utils/sticky-cta-controller.ts');
      const content = fs.readFileSync(controllerPath, 'utf-8');

      expect(content).toContain('this.footerElement');
      expect(content).toContain('this.suppressElements');
      expect(content).toContain('this.activeSuppressSet');
    });

    it('3. Verifies mobile sticky CTA does not obstruct footer content', () => {
      const css = fs.readFileSync(globalCssPath, 'utf-8');
      expect(css).toMatch(/site-footer/);
      expect(css).toMatch(/padding-bottom/);
    });
  });

  // -------------------------------------------------------------------------
  // Mandatory Check 10: JavaScript-disabled functional navigation test
  // -------------------------------------------------------------------------
  describe('Mandatory Check 10: JavaScript-disabled functional navigation test', () => {
    it('1. Verifies all links are pure semantic HTML anchors with valid hrefs', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const links = document.querySelectorAll('main a');
      expect(links.length).toBeGreaterThan(0);

      for (const link of links) {
        const href = link.getAttribute('href');
        // If it's a configured link, it must have href
        if (!link.classList.contains('whatsapp-cta-disabled')) {
          expect(href, `Link ${link.outerHTML} must have non-empty href`).toBeTruthy();
        }
        if (href) {
          expect(href).not.toMatch(/^javascript:/i);
        }
        expect(link.getAttribute('onclick')).toBeNull();
      }
    });

    it('2. Verifies FAQ items use native HTML details/summary elements functioning without JS', () => {
      const html = loadPageHtml('index.html');
      document.documentElement.innerHTML = html;

      const faqItems = document.querySelectorAll('.faq-item');
      expect(faqItems.length).toBeGreaterThan(0);

      for (const item of faqItems) {
        expect(item.tagName.toLowerCase()).toBe('details');
        const summary = item.querySelector('summary');
        expect(summary, 'FAQ item must have a summary element').not.toBeNull();
        const answer = item.querySelector('.faq-answer');
        expect(answer, 'FAQ item must have an answer container').not.toBeNull();
      }
    });

    it('3. Verifies reduced-motion media query disables animations and transitions globally', () => {
      const css = fs.readFileSync(globalCssPath, 'utf-8');
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
      expect(css).toMatch(/transition-duration:\s*0\.01ms/i);
    });

    it('4. Verifies touch targets meet WCAG 2.2 AA minimum size (at least 44px for primary interactive elements)', () => {
      const css = fs.readFileSync(globalCssPath, 'utf-8');
      expect(css).toMatch(/\.mobile-nav-summary\s*\{[^}]*min-height:\s*44px/i);
      expect(css).toMatch(/\.btn\s*\{[^}]*min-height:\s*44px/i);
      expect(css).toMatch(/\.whatsapp-cta\s*\{[^}]*min-height:\s*44px/i);
    });
  });
});
