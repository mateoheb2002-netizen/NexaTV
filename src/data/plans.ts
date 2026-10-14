/**
 * Centralized, immutable subscription plans catalogue for NexaTV.
 * Single source of truth for pricing, durations, and monthly equivalents.
 *
 * Market: France (fr-FR, EUR)
 */

export type PlanId = '3m' | '6m' | '12m';

export interface PlanRawConfig {
  readonly id: PlanId;
  readonly displayName: string;
  readonly durationMonths: number;
  readonly amountEUR: number;
  readonly highlightReason?: string;
}

export interface Plan extends PlanRawConfig {
  readonly amountCents: number;
  readonly monthlyEquivalent: number;
  readonly monthlyEquivalentRounded: number;
}

/**
 * Confirmed raw plan configurations (explicit ordering: 3m, 6m, 12m).
 * Prices and durations are stored exactly once here.
 */
export const RAW_PLAN_CONFIGS: readonly PlanRawConfig[] = [
  {
    id: '3m',
    displayName: 'Découverte',
    durationMonths: 3,
    amountEUR: 12,
  },
  {
    id: '6m',
    displayName: 'Standard',
    durationMonths: 6,
    amountEUR: 24,
  },
  {
    id: '12m',
    displayName: 'Annuel',
    durationMonths: 12,
    amountEUR: 35,
    highlightReason: 'Meilleur tarif mensuel NexaTV',
  },
] as const;

/**
 * Validates a plan catalogue configuration at build/import time.
 * Rejects duplicates, zero/negative durations, negative prices, and malformed records.
 */
export function validatePlanCatalogue(configs: readonly PlanRawConfig[]): void {
  if (!configs || configs.length === 0) {
    throw new Error('Plan catalogue configuration cannot be empty.');
  }

  const seenIds = new Set<string>();

  for (const plan of configs) {
    if (!plan.id || typeof plan.id !== 'string') {
      throw new Error(`Malformed plan record: missing or invalid id.`);
    }

    if (seenIds.has(plan.id)) {
      throw new Error(`Duplicate plan ID detected: "${plan.id}".`);
    }
    seenIds.add(plan.id);

    if (typeof plan.durationMonths !== 'number' || plan.durationMonths <= 0) {
      throw new Error(
        `Invalid duration for plan "${plan.id}": durationMonths must be a positive integer.`
      );
    }

    if (typeof plan.amountEUR !== 'number' || plan.amountEUR < 0) {
      throw new Error(
        `Invalid price for plan "${plan.id}": amountEUR must be a non-negative number.`
      );
    }

    if (plan.highlightReason && /populaire/i.test(plan.highlightReason)) {
      throw new Error(
        `Forbidden highlight claim for plan "${plan.id}": cannot be labeled as "populaire".`
      );
    }
  }
}

/**
 * Derives the mathematical monthly equivalent in EUR.
 */
export function calculateMonthlyEquivalent(amountEUR: number, durationMonths: number): number {
  if (durationMonths <= 0) {
    throw new Error('durationMonths must be greater than 0.');
  }
  return amountEUR / durationMonths;
}

/**
 * Rounds a number to exactly two decimals using safe fixed-precision arithmetic.
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Builds the immutable, derived Plan objects from raw configurations.
 */
function buildCatalogue(configs: readonly PlanRawConfig[]): readonly Plan[] {
  validatePlanCatalogue(configs);

  return Object.freeze(
    configs.map((config) => {
      const amountCents = Math.round(config.amountEUR * 100);
      const monthlyEquivalent = calculateMonthlyEquivalent(config.amountEUR, config.durationMonths);
      const monthlyEquivalentRounded = roundToTwoDecimals(monthlyEquivalent);

      return Object.freeze({
        ...config,
        amountCents,
        monthlyEquivalent,
        monthlyEquivalentRounded,
      });
    })
  );
}

/**
 * Confirmed and validated immutable catalogue of NexaTV subscription plans.
 */
export const PLANS: readonly Plan[] = buildCatalogue(RAW_PLAN_CONFIGS);

/**
 * Finds a plan by its ID. Returns undefined if not found.
 */
export function getPlanById(id: PlanId | string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

/**
 * Finds a plan by its ID or throws an explicit error if missing.
 */
export function getRequiredPlanById(id: PlanId | string): Plan {
  const plan = getPlanById(id);
  if (!plan) {
    throw new Error(`Plan not found: ${id}`);
  }
  return plan;
}

/**
 * Calculates savings for the annual plan versus 4 consecutive 3-month purchases.
 * 4 * (3m price) - (12m price) = 4 * 12 - 35 = 13 EUR.
 */
export function calculateAnnualSavingsVsShortTerm(catalogue: readonly Plan[] = PLANS): number {
  const plan3m = catalogue.find((p) => p.id === '3m');
  const plan12m = catalogue.find((p) => p.id === '12m');

  if (!plan3m || !plan12m) {
    throw new Error('Both 3m and 12m plans are required to calculate annual savings.');
  }

  const fourQuarterlyPurchases = plan3m.amountEUR * 4;
  return fourQuarterlyPurchases - plan12m.amountEUR;
}

/**
 * Formats a monetary amount in EUR according to French typographic conventions (fr-FR).
 */
export function formatPriceEUR(
  amount: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: options?.minimumFractionDigits ?? (Number.isInteger(amount) ? 0 : 2),
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });

  return formatter.format(amount);
}

/**
 * Formats a monthly equivalent in EUR (e.g. "2,92 €" or "2,92 €/mois").
 */
export function formatMonthlyEquivalent(
  amount: number,
  options?: { includePerMonth?: boolean }
): string {
  const rounded = roundToTwoDecimals(amount);
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded);

  if (options?.includePerMonth) {
    return `${formatted}/mois`;
  }
  return formatted;
}

/**
 * Generates the standardized pre-filled text for external WhatsApp order initiation.
 */
export function getWhatsAppOrderMessage(planId: PlanId): string {
  const plan = getRequiredPlanById(planId);
  return `Bonjour NexaTV, je souhaite souscrire à l'offre ${plan.displayName} (${plan.durationMonths} mois à ${formatPriceEUR(plan.amountEUR)}).`;
}
