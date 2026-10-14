/**
 * Secure WhatsApp link generation engine for NexaTV external conversion.
 * Strict validation of international phone numbers and polite contextual French templates.
 *
 * Market: France (fr-FR)
 */

import { getRequiredPlanById, formatPriceEUR } from '../data/plans';

/**
 * Supported user conversion intents.
 */
export const SUPPORTED_INTENTS = [
  'general_information',
  'pricing_3m',
  'pricing_6m',
  'pricing_12m',
  'device_check',
  'technical_support',
  'article_question',
  'faq_question',
] as const;

export type WhatsAppIntent = (typeof SUPPORTED_INTENTS)[number];

export const CTA_SECTIONS = [
  'hero',
  'pricing',
  'compatibility',
  'support',
  'blog',
  'faq',
  'mobile_sticky',
] as const;

export type CTASection = (typeof CTA_SECTIONS)[number];

export interface WhatsAppMessageContext {
  readonly device?: string;
  readonly articleTitle?: string;
  readonly subject?: string;
}

/**
 * Strict international phone number regex.
 * Format: 8 to 15 digits, digits only, starting with a non-zero digit (E.164 without '+').
 */
const PHONE_REGEX = /^[1-9]\d{7,14}$/;

/**
 * Sanitizes and normalizes a phone number for WhatsApp wa.me compatibility.
 * Removes spaces, hyphens, dots, parentheses, and leading '+'.
 * Automatically fixes common French format issues (e.g., +3306... -> 336... or 06... -> 336...).
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove whitespace, dashes, dots, parentheses, and leading '+'
  let cleaned = phone.trim().replace(/[\s\-\.\(\)]/g, '').replace(/^\+/, '');

  // Handle French numbers: if format is 330[1-9]XXXXXXXX (12 digits with accidental trunk '0'), drop the '0'
  if (/^330[1-9]\d{8}$/.test(cleaned)) {
    cleaned = `33${cleaned.slice(3)}`;
  } else if (/^0[1-9]\d{8}$/.test(cleaned)) {
    // If French national format 0[1-9]XXXXXXXX (10 digits), convert to 33[1-9]XXXXXXXX
    cleaned = `33${cleaned.slice(1)}`;
  }

  return cleaned;
}

/**
 * Terms that must never be requested or inserted into WhatsApp message links.
 */
const FORBIDDEN_SECURITY_TERMS = [
  /mot de passe/i,
  /password/i,
  /carte bancaire/i,
  /carte bleue/i,
  /\bcb\b/i,
  /cvv/i,
  /iban/i,
  /compte bancaire/i,
  /identifiant(s)? de streaming/i,
  /code secret/i,
  /token/i,
];

/**
 * Validates whether a phone string satisfies the strict international digit format.
 */
export function isValidWhatsAppPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Asserts phone validity, throwing explicit errors for invalid inputs.
 */
export function validateWhatsAppPhone(phone: string): void {
  if (!phone || typeof phone !== 'string') {
    throw new Error('WhatsApp phone number is required and must be a non-empty string.');
  }

  const trimmed = phone.trim();
  if (trimmed.includes(' ') || trimmed.includes('+')) {
    throw new Error(
      `Invalid WhatsApp phone format: "${phone}". Only international digits are allowed (no spaces, no "+" prefix).`
    );
  }

  if (!PHONE_REGEX.test(trimmed)) {
    throw new Error(
      `Invalid WhatsApp phone number: "${phone}". Expected 8 to 15 international digits without leading zero.`
    );
  }
}

/**
 * Asserts that a message contains no sensitive security terms.
 */
function assertSafeMessageContent(message: string): void {
  for (const pattern of FORBIDDEN_SECURITY_TERMS) {
    if (pattern.test(message)) {
      throw new Error(
        'Security violation: WhatsApp message template contains sensitive credential or payment terms.'
      );
    }
  }
}

/**
 * Generates a validated, secure HTTPS WhatsApp URL.
 * URL format: https://wa.me/{internationalDigits}?text={encodedMessage}
 */
export function whatsappLink(phone: string, message: string): string {
  validateWhatsAppPhone(phone);

  if (!message || typeof message !== 'string') {
    throw new Error('WhatsApp message is required and must be a non-empty string.');
  }

  assertSafeMessageContent(message);

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone.trim()}?text=${encodedMessage}`;
}

/**
 * Builds polite, contextual message templates in French for supported conversion intents.
 */
export function buildWhatsAppMessage(
  intent: WhatsAppIntent,
  context?: WhatsAppMessageContext
): string {
  switch (intent) {
    case 'pricing_3m': {
      const plan = getRequiredPlanById('3m');
      return `Bonjour NexaTV, je souhaite des renseignements pour souscrire à la formule ${plan.displayName} (${plan.durationMonths} mois à ${formatPriceEUR(plan.amountEUR)}).`;
    }
    case 'pricing_6m': {
      const plan = getRequiredPlanById('6m');
      return `Bonjour NexaTV, je souhaite des renseignements pour souscrire à la formule ${plan.displayName} (${plan.durationMonths} mois à ${formatPriceEUR(plan.amountEUR)}).`;
    }
    case 'pricing_12m': {
      const plan = getRequiredPlanById('12m');
      return `Bonjour NexaTV, je souhaite des renseignements pour souscrire à la formule ${plan.displayName} (${plan.durationMonths} mois à ${formatPriceEUR(plan.amountEUR)}).`;
    }
    case 'device_check': {
      const deviceLabel = context?.device ? ` de mon appareil (${context.device})` : ' de mon appareil';
      return `Bonjour NexaTV, je souhaite vérifier la compatibilité${deviceLabel} avec vos services.`;
    }
    case 'technical_support':
      return "Bonjour NexaTV, j'ai besoin d'une assistance technique concernant l'utilisation de mon service.";
    case 'article_question': {
      const articleLabel = context?.articleTitle
        ? ` sur votre article "${context.articleTitle}"`
        : ' suite à la lecture de votre article';
      return `Bonjour NexaTV, j'ai une question${articleLabel}.`;
    }
    case 'faq_question':
      return "Bonjour NexaTV, j'ai une question concernant l'assistance NexaTV.";
    case 'general_information':
    default:
      return 'Bonjour NexaTV, je souhaite obtenir des informations générales sur vos offres.';
  }
}

/**
 * Builds a contextualized WhatsApp link for a given intent and recipient phone number.
 */
export function buildWhatsAppIntentLink(
  phone: string,
  intent: WhatsAppIntent,
  context?: WhatsAppMessageContext
): string {
  const message = buildWhatsAppMessage(intent, context);
  return whatsappLink(phone, message);
}

/**
 * Retrieves the production commercial WhatsApp phone number.
 * Never fabricates or defaults to a placeholder.
 * Throws an explicit error if the number has not been provided by user configuration.
 */
export function getProductionWhatsAppNumber(): string {
  let envPhone: string | undefined;

  // Support Astro import.meta.env or Node process.env in build/SSR
  if (typeof process !== 'undefined' && process.env?.PUBLIC_WHATSAPP_PHONE) {
    envPhone = process.env.PUBLIC_WHATSAPP_PHONE;
  }

  if (!envPhone) {
    throw new Error(
      'Production WhatsApp phone number is not configured. User input is required before commercial release.'
    );
  }

  validateWhatsAppPhone(envPhone);
  return envPhone;
}
