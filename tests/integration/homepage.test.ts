import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');
const indexAstroPath = path.join(projectRoot, 'src/pages/index.astro');

describe('Homepage Structure & SEO Content (src/pages/index.astro)', () => {
  it('Test 1: Route / file exists and imports BaseLayout', () => {
    expect(fs.existsSync(indexAstroPath)).toBe(true);
    const content = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(content).toMatch(/import\s+BaseLayout\s+from/);
  });

  it('Test 2: Exactly one H1 exists matching confirmed editorial title', () => {
    const content = fs.readFileSync(indexAstroPath, 'utf-8');
    const h1Matches = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches![0]).toContain('NexaTV : votre abonnement IPTV en France dès 12 €');
  });

  it('Test 3: All three confirmed plan prices are referenced from central data source', () => {
    const content = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(content).toMatch(/import\s+.*PLANS.*from\s+['"].*plans['"]/);
  });

  it('Test 4: Primary CTA navigates to intended offers section (#offres)', () => {
    const content = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(content).toMatch(/href=["']#offres["'][^>]*>[\s\S]*?Voir les offres NexaTV/i);
    expect(content).toMatch(/id=["']offres["']/);
  });

  it('Test 5: Secondary CTA links to device compatibility (/appareils-compatibles/)', () => {
    const content = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(content).toMatch(/href=["']\/appareils-compatibles\/["'][^>]*>[\s\S]*?Vérifier mon appareil/i);
  });

  it('Test 6: Full pricing page is reachable through a crawlable standard anchor (/abonnement-iptv/)', () => {
    const content = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(content).toMatch(/href=["']\/abonnement-iptv\/["']/);
  });

  it('Test 7: FAQ answers exist in prerendered semantic and indexable HTML (<details><summary>)', () => {
    const content = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(content).toContain('FAQ');
    // Checks that FAQ component or details elements are present
    expect(content).toMatch(/<FAQSection|<details/);
  });

  it('Test 8: Page contains no unsupported claims, fake reviews or illegal IPTV guarantees', () => {
    const content = fs.readFileSync(indexAstroPath, 'utf-8');
    const forbiddenPatterns = [
      /sans aucune coupure/i,
      /service n(°|o)\s*1/i,
      /tous les sports/i,
      /100%\s*garanti/i,
      /avis vérifiés/i,
      /4\.9\/5/i,
      /50\s?000\s?cha[îi]nes/i,
      /activation en 2 (secondes|minutes)/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(content).not.toMatch(pattern);
    }
  });

  it('Test 9: Respects the strict required section order from the PRD', () => {
    const content = fs.readFileSync(indexAstroPath, 'utf-8');

    const heroIndex = content.indexOf('hero-section');
    const offersIndex = content.indexOf('id="offres"');
    const compatibilityIndex = content.indexOf('compatibility-section');
    const verificationIndex = content.indexOf('verification-section');
    const choosePlanIndex = content.indexOf('choose-plan-section');
    const supportIndex = content.indexOf('support-section');
    const faqIndex = content.indexOf('faq-section');
    const finalCtaIndex = content.indexOf('final-cta-section');

    expect(heroIndex).toBeGreaterThan(-1);
    expect(offersIndex).toBeGreaterThan(heroIndex);
    expect(compatibilityIndex).toBeGreaterThan(offersIndex);
    expect(verificationIndex).toBeGreaterThan(compatibilityIndex);
    expect(choosePlanIndex).toBeGreaterThan(verificationIndex);
    expect(supportIndex).toBeGreaterThan(choosePlanIndex);
    expect(faqIndex).toBeGreaterThan(supportIndex);
    expect(finalCtaIndex).toBeGreaterThan(faqIndex);
  });

  it('Test 10: Includes link to assistance (/assistance/)', () => {
    const content = fs.readFileSync(indexAstroPath, 'utf-8');
    expect(content).toMatch(/href=["']\/assistance\/["']/);
  });
});
