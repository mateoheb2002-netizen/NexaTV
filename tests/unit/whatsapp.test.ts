import { describe, it, expect } from 'vitest';
import {
  whatsappLink,
  isValidWhatsAppPhone,
  sanitizeWhatsAppPhone,
  buildWhatsAppMessage,
  buildWhatsAppIntentLink,
  getProductionWhatsAppNumber,
  SUPPORTED_INTENTS,
} from '../../src/utils/whatsapp';

describe('Secure WhatsApp Link Engine (src/utils/whatsapp.ts)', () => {
  const TEST_PHONE = '33612345678';

  // Test 1: Valid international number produces a wa.me URL
  it('Test 1: Valid international number produces a valid HTTPS wa.me URL', () => {
    const url = whatsappLink(TEST_PHONE, 'Bonjour NexaTV');
    expect(url).toBe('https://wa.me/33612345678?text=Bonjour%20NexaTV');
    expect(url.startsWith('https://wa.me/33612345678?text=')).toBe(true);
  });

  // Test 2: Missing number is rejected
  it('Test 2: Missing or empty phone number is rejected with an explicit error', () => {
    expect(() => whatsappLink('', 'Bonjour')).toThrow(/phone number/i);
    expect(() => whatsappLink(null as any, 'Bonjour')).toThrow(/phone number/i);
    expect(() => whatsappLink(undefined as any, 'Bonjour')).toThrow(/phone number/i);
  });

  // Test 3: Number with spaces or '+' is rejected by the generator's strict input contract
  it('Test 3: Number with spaces or "+" is rejected by strict input contract', () => {
    expect(isValidWhatsAppPhone('+33612345678')).toBe(false);
    expect(isValidWhatsAppPhone('33 6 12 34 56 78')).toBe(false);
    expect(isValidWhatsAppPhone('+33 6 12 34 56 78')).toBe(false);

    expect(() => whatsappLink('+33612345678', 'Bonjour')).toThrow(/international digits/i);
    expect(() => whatsappLink('33 6 12 34 56 78', 'Bonjour')).toThrow(/international digits/i);
  });

  // Test 4: Unsupported number length or format is rejected
  it('Test 4: Unsupported number length or numbers starting with 0 are rejected', () => {
    // Too short (< 8 digits)
    expect(isValidWhatsAppPhone('1234567')).toBe(false);
    expect(() => whatsappLink('1234567', 'Bonjour')).toThrow(/international digits/i);

    // Too long (> 15 digits)
    expect(isValidWhatsAppPhone('1234567890123456')).toBe(false);
    expect(() => whatsappLink('1234567890123456', 'Bonjour')).toThrow(/international digits/i);

    // Starts with 0 (national format instead of international)
    expect(isValidWhatsAppPhone('0612345678')).toBe(false);
    expect(() => whatsappLink('0612345678', 'Bonjour')).toThrow(/international digits/i);
  });

  // Test 5: French accents and punctuation are correctly URL-encoded
  it('Test 5: French accents and punctuation are correctly URL-encoded using encodeURIComponent', () => {
    const rawMessage = "Bonjour NexaTV ! Je souhaite souscrire à l'offre Découverte (12 €).";
    const url = whatsappLink(TEST_PHONE, rawMessage);

    // Extract text query param
    const textParam = url.split('?text=')[1];
    expect(textParam).toBe(encodeURIComponent(rawMessage));

    // Decodes back to original message exactly
    expect(decodeURIComponent(textParam)).toBe(rawMessage);
    expect(textParam).not.toContain(' ');
    expect(textParam).toContain('%C3%A0'); // à
    expect(textParam).toContain('%E2%82%AC'); // €
  });

  // Test 6: 3-month message contains 3 mois and 12 €
  it('Test 6: 3-month message contains 3 mois and 12 €', () => {
    const msg = buildWhatsAppMessage('pricing_3m');
    expect(msg).toContain('3 mois');
    expect(msg).toContain('12');
    expect(msg).toContain('€');
    expect(msg).toContain('Découverte');
  });

  // Test 7: 6-month message contains 6 mois and 24 €
  it('Test 7: 6-month message contains 6 mois and 24 €', () => {
    const msg = buildWhatsAppMessage('pricing_6m');
    expect(msg).toContain('6 mois');
    expect(msg).toContain('24');
    expect(msg).toContain('€');
    expect(msg).toContain('Standard');
  });

  // Test 8: 12-month message contains 12 mois and 35 €
  it('Test 8: 12-month message contains 12 mois and 35 €', () => {
    const msg = buildWhatsAppMessage('pricing_12m');
    expect(msg).toContain('12 mois');
    expect(msg).toContain('35');
    expect(msg).toContain('€');
    expect(msg).toContain('Annuel');
  });

  // Test 9: Support template differs from sales template
  it('Test 9: Support template differs from sales templates and addresses technical assistance', () => {
    const supportMsg = buildWhatsAppMessage('technical_support');
    const salesMsg = buildWhatsAppMessage('pricing_12m');

    expect(supportMsg).not.toBe(salesMsg);
    expect(supportMsg).toMatch(/assistance technique|aide/i);
    expect(salesMsg).toMatch(/souscrire|formule/i);

    const deviceMsg = buildWhatsAppMessage('device_check', { device: 'Smart TV Samsung' });
    expect(deviceMsg).toContain('Smart TV Samsung');
    expect(deviceMsg).toMatch(/compatibilité/i);

    const articleMsg = buildWhatsAppMessage('article_question', { articleTitle: 'Guide Tivimate' });
    expect(articleMsg).toContain('Guide Tivimate');

    const genericArticleMsg = buildWhatsAppMessage('article_question');
    expect(genericArticleMsg).toContain('suite à la lecture de votre article');

    const faqMsg = buildWhatsAppMessage('faq_question');
    expect(faqMsg).toContain('assistance NexaTV');
  });

  // Test 10: No message template requests passwords, banking details or login credentials
  it('Test 10: No message template requests passwords, banking details or login credentials', () => {
    const forbiddenTerms = [
      /mot de passe/i,
      /password/i,
      /carte bancaire/i,
      /carte bleue/i,
      /cb/i,
      /cvv/i,
      /iban/i,
      /compte bancaire/i,
      /identifiant(s)? de streaming/i,
      /code secret/i,
      /token/i,
    ];

    for (const intent of SUPPORTED_INTENTS) {
      const msg = buildWhatsAppMessage(intent, { device: 'Android TV', articleTitle: 'Guide' });
      for (const pattern of forbiddenTerms) {
        expect(msg).not.toMatch(pattern);
      }
    }
  });

  // Test 11: No WhatsApp navigation occurs during page initialization (pure static links)
  it('Test 11: WhatsApp link generator produces inert string URLs without DOM execution', () => {
    const link = buildWhatsAppIntentLink(TEST_PHONE, 'general_information');
    expect(typeof link).toBe('string');
    expect(link.startsWith('https://wa.me/')).toBe(true);
    // Pure function, no side effects
  });

  // Test 12: Production number guard prevents release with missing number
  it('Test 12: getProductionWhatsAppNumber explicitly prevents deployment without validated number', () => {
    const originalEnv = process.env.PUBLIC_WHATSAPP_PHONE;
    try {
      delete process.env.PUBLIC_WHATSAPP_PHONE;
      expect(() => getProductionWhatsAppNumber()).toThrow(
        /Production WhatsApp phone number is not configured/i
      );

      // Rejects invalid format in env
      process.env.PUBLIC_WHATSAPP_PHONE = '+33 6 12 34';
      expect(() => getProductionWhatsAppNumber()).toThrow(/international digits/i);

      // Accepts valid format in env
      process.env.PUBLIC_WHATSAPP_PHONE = '33699887766';
      expect(getProductionWhatsAppNumber()).toBe('33699887766');
    } finally {
      if (originalEnv) {
        process.env.PUBLIC_WHATSAPP_PHONE = originalEnv;
      } else {
        delete process.env.PUBLIC_WHATSAPP_PHONE;
      }
    }
  });

  // Test 13: Edge cases for invalid message inputs and security assertions
  it('Test 13: Empty message or messages containing forbidden security terms are rejected', () => {
    expect(() => whatsappLink(TEST_PHONE, '')).toThrow(/message is required/i);
    expect(() => whatsappLink(TEST_PHONE, null as any)).toThrow(/message is required/i);
    expect(() =>
      whatsappLink(TEST_PHONE, 'Veuillez saisir votre mot de passe pour continuer')
    ).toThrow(/Security violation/i);
    expect(() =>
      whatsappLink(TEST_PHONE, 'Voici mon numéro de carte bancaire pour payer')
    ).toThrow(/Security violation/i);
  });

  // Test 14: isValidWhatsAppPhone boundary checks
  it('Test 14: isValidWhatsAppPhone handles non-string or null gracefully', () => {
    expect(isValidWhatsAppPhone('')).toBe(false);
    expect(isValidWhatsAppPhone(null as any)).toBe(false);
    expect(isValidWhatsAppPhone(undefined as any)).toBe(false);
  });

  // Test 15: sanitizeWhatsAppPhone normalizes user entered numbers with + and accidental 0
  it('Test 15: sanitizeWhatsAppPhone normalizes French numbers with accidental leading zeros (+330601384612 -> 33601384612)', () => {
    expect(sanitizeWhatsAppPhone('+330601384612')).toBe('33601384612');
    expect(sanitizeWhatsAppPhone('330601384612')).toBe('33601384612');
  });

  // Test 16: sanitizeWhatsAppPhone removes spaces, dots, dashes, parentheses
  it('Test 16: sanitizeWhatsAppPhone removes formatting characters (spaces, dashes, dots, parens)', () => {
    expect(sanitizeWhatsAppPhone('+33 6 01 38 46 12')).toBe('33601384612');
    expect(sanitizeWhatsAppPhone('+33-6-01-38-46-12')).toBe('33601384612');
    expect(sanitizeWhatsAppPhone('+33 (0)6 01 38 46 12')).toBe('33601384612');
  });

  // Test 17: sanitizeWhatsAppPhone converts French national format (06...) to international (336...)
  it('Test 17: sanitizeWhatsAppPhone converts French national 10-digit format (0601384612 -> 33601384612)', () => {
    expect(sanitizeWhatsAppPhone('0601384612')).toBe('33601384612');
    expect(sanitizeWhatsAppPhone('06 01 38 46 12')).toBe('33601384612');
  });

  // Test 18: sanitizeWhatsAppPhone preserves already valid international format
  it('Test 18: sanitizeWhatsAppPhone preserves valid international digits', () => {
    expect(sanitizeWhatsAppPhone('33601384612')).toBe('33601384612');
    expect(sanitizeWhatsAppPhone('33612345678')).toBe('33612345678');
  });

  // Test 19: sanitizeWhatsAppPhone handles empty and null gracefully
  it('Test 19: sanitizeWhatsAppPhone handles empty and invalid inputs gracefully', () => {
    expect(sanitizeWhatsAppPhone('')).toBe('');
    expect(sanitizeWhatsAppPhone(null as any)).toBe('');
    expect(sanitizeWhatsAppPhone(undefined as any)).toBe('');
  });
});
