import { describe, it, expect } from 'vitest';
import {
  PLANS,
  getPlanById,
  getRequiredPlanById,
  calculateMonthlyEquivalent,
  calculateAnnualSavingsVsShortTerm,
  formatPriceEUR,
  formatMonthlyEquivalent,
  getWhatsAppOrderMessage,
  validatePlanCatalogue,
  roundToTwoDecimals,
  type PlanRawConfig,
} from '../../src/data/plans';

describe('Centralized Subscription Plans Contract (src/data/plans.ts)', () => {
  // Test 1: Catalogue contains exactly three plans in explicit order
  it('Test 1: Catalogue contains exactly three plans in explicit order (3m, 6m, 12m)', () => {
    expect(PLANS).toHaveLength(3);
    expect(PLANS.map((p) => p.id)).toEqual(['3m', '6m', '12m']);
  });

  // Test 2: The 3-month plan has amountEUR = 12 and durationMonths = 3
  it('Test 2: The 3-month plan has amountEUR = 12 and durationMonths = 3', () => {
    const plan = getRequiredPlanById('3m');
    expect(plan.id).toBe('3m');
    expect(plan.displayName).toBe('Découverte');
    expect(plan.amountEUR).toBe(12);
    expect(plan.durationMonths).toBe(3);
    expect(plan.amountCents).toBe(1200);
  });

  // Test 3: The 6-month plan has amountEUR = 24 and durationMonths = 6
  it('Test 3: The 6-month plan has amountEUR = 24 and durationMonths = 6', () => {
    const plan = getRequiredPlanById('6m');
    expect(plan.id).toBe('6m');
    expect(plan.displayName).toBe('Standard');
    expect(plan.amountEUR).toBe(24);
    expect(plan.durationMonths).toBe(6);
    expect(plan.amountCents).toBe(2400);
  });

  // Test 4: The 12-month plan has amountEUR = 35 and durationMonths = 12
  it('Test 4: The 12-month plan has amountEUR = 35 and durationMonths = 12', () => {
    const plan = getRequiredPlanById('12m');
    expect(plan.id).toBe('12m');
    expect(plan.displayName).toBe('Annuel');
    expect(plan.amountEUR).toBe(35);
    expect(plan.durationMonths).toBe(12);
    expect(plan.amountCents).toBe(3500);
    expect(plan.highlightReason).toBe('Meilleur tarif mensuel NexaTV');
    expect(plan.highlightReason).not.toMatch(/plus populaire/i);
  });

  // Test 5: Monthly equivalents calculate to 4, 4 and approximately 2.92 EUR
  it('Test 5: Monthly equivalents calculate to 4, 4 and approximately 2.92 EUR', () => {
    const plan3m = getRequiredPlanById('3m');
    const plan6m = getRequiredPlanById('6m');
    const plan12m = getRequiredPlanById('12m');

    expect(calculateMonthlyEquivalent(12, 3)).toBe(4);
    expect(calculateMonthlyEquivalent(24, 6)).toBe(4);
    expect(calculateMonthlyEquivalent(35, 12)).toBeCloseTo(2.9167, 2);

    expect(plan3m.monthlyEquivalent).toBe(4);
    expect(plan3m.monthlyEquivalentRounded).toBe(4);

    expect(plan6m.monthlyEquivalent).toBe(4);
    expect(plan6m.monthlyEquivalentRounded).toBe(4);

    expect(plan12m.monthlyEquivalentRounded).toBe(2.92);

    expect(() => calculateMonthlyEquivalent(12, 0)).toThrow(/durationMonths/i);
    expect(roundToTwoDecimals(2.9167)).toBe(2.92);
  });

  // Test 6: Annual savings calculation returns exactly 13 EUR
  it('Test 6: Annual savings calculation returns exactly 13 EUR versus 4x 3-month purchases', () => {
    const savings = calculateAnnualSavingsVsShortTerm(PLANS);
    // 4 * 12 EUR = 48 EUR. 48 EUR - 35 EUR = 13 EUR.
    expect(savings).toBe(13);

    // Throws if required plans are missing in custom list
    expect(() => calculateAnnualSavingsVsShortTerm([])).toThrow(/Both 3m and 12m plans are required/i);
  });

  // Test 7: Currency display uses French formatting
  it('Test 7: Currency display uses French formatting (fr-FR and EUR)', () => {
    const formatted12 = formatPriceEUR(12);
    expect(formatted12).toMatch(/12(,00)?\s*€/);

    const formattedCustom = formatPriceEUR(12, { minimumFractionDigits: 2 });
    expect(formattedCustom).toMatch(/12,00\s*€/);

    const formattedMonthly = formatMonthlyEquivalent(2.9167);
    expect(formattedMonthly).toMatch(/2,92\s*€/);

    const fullMonthlyStr = formatMonthlyEquivalent(2.9167, { includePerMonth: true });
    expect(fullMonthlyStr).toMatch(/2,92\s*€\/mois/);
  });

  // Test 8: Invalid plan configuration fails validation
  it('Test 8: Invalid plan configuration fails validation', () => {
    // Duplicate IDs
    const duplicateIdConfigs: PlanRawConfig[] = [
      { id: '3m', displayName: 'Plan A', durationMonths: 3, amountEUR: 12 },
      { id: '3m', displayName: 'Plan B', durationMonths: 6, amountEUR: 24 },
    ];
    expect(() => validatePlanCatalogue(duplicateIdConfigs)).toThrow(/duplicate/i);

    // Negative price
    const negativePriceConfigs: PlanRawConfig[] = [
      { id: '3m', displayName: 'Plan A', durationMonths: 3, amountEUR: -12 },
    ];
    expect(() => validatePlanCatalogue(negativePriceConfigs)).toThrow(/positive|negative/i);

    // Zero duration
    const zeroDurationConfigs: PlanRawConfig[] = [
      { id: '3m', displayName: 'Plan A', durationMonths: 0, amountEUR: 12 },
    ];
    expect(() => validatePlanCatalogue(zeroDurationConfigs)).toThrow(/duration/i);

    // Empty catalogue
    expect(() => validatePlanCatalogue([])).toThrow(/empty/i);

    // Missing / invalid ID
    expect(() =>
      validatePlanCatalogue([
        { id: '' as any, displayName: 'Plan', durationMonths: 3, amountEUR: 10 },
      ])
    ).toThrow(/missing or invalid id/i);

    // Forbidden highlight claim
    expect(() =>
      validatePlanCatalogue([
        {
          id: '12m',
          displayName: 'Plan',
          durationMonths: 12,
          amountEUR: 35,
          highlightReason: 'Le plus populaire',
        },
      ])
    ).toThrow(/populaire/i);
  });

  // Test 9: Catalogue lookup returns the correct plan or an explicit failure for unknown IDs
  it('Test 9: Catalogue lookup returns the correct plan or an explicit failure for unknown IDs', () => {
    const found = getPlanById('6m');
    expect(found).toBeDefined();
    expect(found?.displayName).toBe('Standard');

    const notFound = getPlanById('invalid-id' as any);
    expect(notFound).toBeUndefined();

    expect(() => getRequiredPlanById('invalid-id' as any)).toThrow(
      /Plan not found: invalid-id/
    );
  });

  // Test 10: Standardized pre-filled WhatsApp conversion message
  it('Test 10: Generates consistent WhatsApp order initiation text', () => {
    const msg3m = getWhatsAppOrderMessage('3m');
    expect(msg3m).toContain('Découverte');
    expect(msg3m).toContain('3 mois');

    const msg12m = getWhatsAppOrderMessage('12m');
    expect(msg12m).toContain('Annuel');
    expect(msg12m).toContain('12 mois');
  });
});
