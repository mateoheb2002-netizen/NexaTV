import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PLANS, formatMonthlyEquivalent } from '../../src/data/plans';

const projectRoot = path.resolve(__dirname, '../../');
const pricingAstroPath = path.join(projectRoot, 'src/pages/abonnement-iptv.astro');
const globalCssPath = path.join(projectRoot, 'src/styles/global.css');

describe('Pricing Page & Offer Cards (src/pages/abonnement-iptv.astro)', () => {
  const content = fs.readFileSync(pricingAstroPath, 'utf-8');
  const globalCss = fs.readFileSync(globalCssPath, 'utf-8');

  it('Test 1: Exactly three plans are rendered from the centralized catalogue', () => {
    expect(fs.existsSync(pricingAstroPath), 'src/pages/abonnement-iptv.astro must exist').toBe(true);
    expect(content).toMatch(/import\s+.*PLANS.*from\s+['"].*plans['"]/);
    expect(PLANS).toHaveLength(3);
    expect(content).toContain('{PLANS.map');
  });

  it('Test 2: Prices match central configuration (12 €, 24 €, 35 €)', () => {
    expect(PLANS.find(p => p.id === '3m')?.amountEUR).toBe(12);
    expect(PLANS.find(p => p.id === '6m')?.amountEUR).toBe(24);
    expect(PLANS.find(p => p.id === '12m')?.amountEUR).toBe(35);

    // Checks that cards render via the centralized OfferCard component using plan data
    expect(content).toContain('<OfferCard');
    expect(content).toContain('plan={plan}');
  });

  it('Test 3: Monthly equivalent values are mathematically correct', () => {
    const plan3m = PLANS.find(p => p.id === '3m')!;
    const plan6m = PLANS.find(p => p.id === '6m')!;
    const plan12m = PLANS.find(p => p.id === '12m')!;

    // 12 / 3 = 4
    expect(plan3m.monthlyEquivalent).toBe(4);
    // 24 / 6 = 4
    expect(plan6m.monthlyEquivalent).toBe(4);
    // 35 / 12 = 2.91666... -> rounded to 2.92
    expect(Number(plan12m.monthlyEquivalent.toFixed(2))).toBe(2.92);

    expect(formatMonthlyEquivalent(plan3m.monthlyEquivalent)).toContain('4');
    expect(formatMonthlyEquivalent(plan12m.monthlyEquivalent)).toContain('2,92');
  });

  it('Test 4: Annual offer receives the correct highlight label "Meilleur tarif mensuel NexaTV"', () => {
    const plan12m = PLANS.find(p => p.id === '12m')!;
    expect(plan12m.highlightReason).toBe('Meilleur tarif mensuel NexaTV');
    expect(content).toContain('Meilleur tarif mensuel NexaTV');
  });

  it('Test 5: No "plus populaire" label appears without supporting evidence', () => {
    expect(content).not.toMatch(/plus populaire/i);
    expect(content).not.toMatch(/le plus vendu/i);
    expect(content).not.toMatch(/best-seller/i);
  });

  it('Test 6: Each plan CTA contains the correct plan context and standardized labels', () => {
    expect(content).toContain('Choisir 3 mois');
    expect(content).toContain('Choisir 6 mois');
    expect(content).toContain('Choisir 12 mois');
  });

  it('Test 7: The 6-month plan does not claim a monthly discount', () => {
    // 6m is 4 €/month, exactly same as 3m. It must not claim a discount or percentage off.
    const plan6m = PLANS.find(p => p.id === '6m')!;
    expect(plan6m.highlightReason).toBeUndefined();

    // Verify page content does not attribute a monthly discount to 6m
    expect(content).not.toMatch(/6 mois.*(-[0-9]+%|réduction mensuelle|tarif mensuel réduit)/i);
  });

  it('Test 8: Unverified features are not represented as included', () => {
    const forbiddenClaims = [
      /connexions? simultanées?/i,
      /2 écrans|3 écrans|4 écrans/i,
      /50\s?000 chaînes/i,
      /100\s?000 chaînes/i,
      /4K garanti/i,
      /satisfait ou remboursé sous 30 jours/i,
    ];

    for (const pattern of forbiddenClaims) {
      expect(content).not.toMatch(pattern);
    }
  });

  it('Test 9: Cards remain usable at mobile reference widths 320px and 390px', () => {
    // Verify responsive grid styling for offers in globalCss or component style
    expect(globalCss).toMatch(/\.offers-grid/);
    expect(globalCss).toMatch(/grid-template-columns/);
    // Ensure minmax allows wrapping down to small mobile screens
    expect(globalCss).toMatch(/minmax\((2[4-8]0px|100%),/);

    // Verify container padding prevents horizontal overflow
    expect(globalCss).toMatch(/padding-left:\s*var\(--spacing-md\)/);
    expect(globalCss).toMatch(/padding-right:\s*var\(--spacing-md\)/);
  });

  it('Test 10: Keyboard navigation reaches all actions', () => {
    // Verify all CTAs are implemented with accessible anchors and focusable elements
    expect(content).toContain('<WhatsAppCTA');
    // Verify FAQ uses accessible native details/summary semantic disclosure
    expect(content).toContain('<details');
    expect(content).toContain('<summary');
    // Verify no aria-hidden on active interactive elements
    expect(content).not.toMatch(/aria-hidden="true"[^>]*<a/);
  });

  it('Test 11: The page contains exactly one H1', () => {
    const h1Matches = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches![0]).toMatch(/abonnement iptv/i);
  });

  it('Section Sequence: Includes all 8 required visible sections in sequence', () => {
    const introIndex = content.indexOf('pricing-intro-section');
    const comparisonIndex = content.indexOf('pricing-comparison-section');
    const howToChooseIndex = content.indexOf('pricing-how-to-choose-section');
    const featuresIndex = content.indexOf('pricing-features-section');
    const paymentRenewalIndex = content.indexOf('pricing-payment-renewal-section');
    const refundConditionsIndex = content.indexOf('pricing-refund-conditions-section');
    const faqIndex = content.indexOf('pricing-faq-section');
    const finalCtaIndex = content.indexOf('pricing-final-cta-section');

    expect(introIndex).toBeGreaterThan(-1);
    expect(comparisonIndex).toBeGreaterThan(introIndex);
    expect(howToChooseIndex).toBeGreaterThan(comparisonIndex);
    expect(featuresIndex).toBeGreaterThan(howToChooseIndex);
    expect(paymentRenewalIndex).toBeGreaterThan(featuresIndex);
    expect(refundConditionsIndex).toBeGreaterThan(paymentRenewalIndex);
    expect(faqIndex).toBeGreaterThan(refundConditionsIndex);
    expect(finalCtaIndex).toBeGreaterThan(faqIndex);
  });

  it('Transparency: Explains that payment, renewal and refund terms must be verified before ordering', () => {
    expect(content).toMatch(/reconduction tacite|renouvellement/i);
    expect(content).toMatch(/remboursement/i);
    expect(content).toMatch(/WhatsApp/i);
  });
});

