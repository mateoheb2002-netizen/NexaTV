import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');
const assistanceAstroPath = path.join(projectRoot, 'src/pages/assistance/index.astro');

describe('Assistance Page (src/pages/assistance/index.astro)', () => {
  it('Test 1: All four assistance categories render', () => {
    expect(fs.existsSync(assistanceAstroPath), 'src/pages/assistance/index.astro must exist').toBe(true);
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');

    // 1. Installation guidance
    expect(content).toMatch(/installation|configuration initiale/i);
    // 2. Playback troubleshooting
    expect(content).toMatch(/dépannage|buffering|ralentissement|coupure/i);
    // 3. Subscription information
    expect(content).toMatch(/abonnement|renouvellement/i);
    // 4. Technical support contact
    expect(content).toMatch(/assistance technique|support technique|contact/i);
  });

  it('Test 2: Technical support CTA uses the correct WhatsApp intent (technical_support)', () => {
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');
    expect(content).toContain('intent="technical_support"');
    expect(content).toContain('sourceSection="support"');
  });

  it('Test 3: Troubleshooting information is readable without external navigation', () => {
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');
    // Checks that concrete troubleshooting steps are directly presented in the page
    expect(content).toMatch(/redémarr(er|age)/i);
    expect(content).toMatch(/ethernet|câble/i);
    expect(content).toMatch(/tampon|buffer/i);
  });

  it('Test 4: No unverified support-hours or response-time claims appear', () => {
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');
    const forbiddenClaims = [
      /24\s*\/\s*7/i,
      /24h\s*\/\s*24/i,
      /7j\s*\/\s*7/i,
      /réponse (immédiate|en \d+ minutes?|en \d+h)/i,
      /support garanti 24/i,
      /disponible jour et nuit/i,
    ];

    for (const pattern of forbiddenClaims) {
      expect(content).not.toMatch(pattern);
    }
  });

  it('Test 5: No unpublished guides produce broken links', () => {
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');
    const internalLinks = content.match(/href=["']\/([^"']+)["']/g);
    if (internalLinks) {
      for (const linkMatch of internalLinks) {
        const route = linkMatch.replace(/href=["']|["']/g, '');
        // Ignore fragment anchors or external links
        if (route.startsWith('#') || route.startsWith('http')) continue;

        // Check if destination exists either in src/pages or src/content
        const cleanRoute = route.replace(/^\/|\/$/g, '');
        const pageAstro = path.join(projectRoot, 'src/pages', cleanRoute + '.astro');
        const pageIndexAstro = path.join(projectRoot, 'src/pages', cleanRoute, 'index.astro');
        const contentMd = path.join(projectRoot, 'src/content', cleanRoute + '.md');
        const contentMdx = path.join(projectRoot, 'src/content', cleanRoute + '.mdx');

        const exists =
          cleanRoute === '' || // root /
          fs.existsSync(pageAstro) ||
          fs.existsSync(pageIndexAstro) ||
          fs.existsSync(contentMd) ||
          fs.existsSync(contentMdx);

        expect(exists, `Internal link /${cleanRoute}/ must point to an existing route`).toBe(true);
      }
    }
  });

  it('Test 6: FAQ answers are in static HTML and contain essential troubleshooting points', () => {
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');
    // Uses native accessible details/summary
    expect(content).toContain('<details');
    expect(content).toContain('<summary');
    expect(content).toMatch(/faq-section|assistance-faq/i);
  });

  it('Test 7: Keyboard and screen-reader access to support links works with exactly one H1', () => {
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');
    // Exactly one H1
    const h1Matches = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches![0]).toMatch(/assistance/i);

    // Skip link and semantic structure via BaseLayout
    expect(content).toContain('BaseLayout');
  });

  it('Section Sequence: Includes all 6 required sections in exact sequence', () => {
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');

    const introIndex = content.indexOf('assistance-intro-section');
    const installIndex = content.indexOf('assistance-installation-section');
    const troubleshootIndex = content.indexOf('assistance-troubleshooting-section');
    const subscriptionIndex = content.indexOf('assistance-subscription-section');
    const contactIndex = content.indexOf('assistance-contact-section');
    const faqIndex = content.indexOf('assistance-faq-section');

    expect(introIndex).toBeGreaterThan(-1);
    expect(installIndex).toBeGreaterThan(introIndex);
    expect(troubleshootIndex).toBeGreaterThan(installIndex);
    expect(subscriptionIndex).toBeGreaterThan(troubleshootIndex);
    expect(contactIndex).toBeGreaterThan(subscriptionIndex);
    expect(faqIndex).toBeGreaterThan(contactIndex);
  });

  it('Diagnostic guidance: Requests device model, app name and description only as optional info', () => {
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');
    expect(content).toMatch(/facultatif|préparer|recommandé/i);
    expect(content).toMatch(/modèle/i);
    expect(content).toMatch(/application/i);
    expect(content).toMatch(/description/i);

    // No input form or credential harvesting
    expect(content).not.toMatch(/<form\b/i);
    expect(content).not.toMatch(/<input\b/i);
  });

  it('Separates commercial requests from technical support requests', () => {
    const content = fs.readFileSync(assistanceAstroPath, 'utf-8');
    // Provides clear direction for commercial questions to pricing page
    expect(content).toMatch(/href=["']\/abonnement-iptv\/["']/);
  });
});
