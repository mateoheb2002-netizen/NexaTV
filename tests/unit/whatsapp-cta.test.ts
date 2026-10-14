// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { experimental_AstroContainer } from 'astro/container';
import WhatsAppCTA from '../../src/components/WhatsAppCTA.astro';

describe('Reusable WhatsApp CTA Component (src/components/WhatsAppCTA.astro)', () => {
  const TEST_PHONE = '33612345678';
  let container: Awaited<ReturnType<typeof experimental_AstroContainer.create>>;

  beforeEach(async () => {
    container = await experimental_AstroContainer.create();
  });

  // Test 1: Valid configuration renders a wa.me HTTPS link
  it('Test 1: Valid configuration renders a semantic HTTPS wa.me link with visible label', async () => {
    const html = await container.renderToString(WhatsAppCTA, {
      props: {
        intent: 'general_information',
        label: 'Contacter sur WhatsApp',
        sourceSection: 'hero',
        phone: TEST_PHONE,
      },
    });

    expect(html).toContain('<a');
    expect(html).toContain('href="https://wa.me/33612345678?text=');
    expect(html).toContain('Contacter sur WhatsApp');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  // Test 2: Pricing intent 3m generates the correct message
  it('Test 2: Pricing intent 3m generates message with 3 mois and 12 €', async () => {
    const html = await container.renderToString(WhatsAppCTA, {
      props: {
        intent: 'pricing_3m',
        planId: '3m',
        label: 'Choisir la formule Découverte',
        sourceSection: 'pricing',
        phone: TEST_PHONE,
      },
    });

    expect(html).toContain('https://wa.me/33612345678?text=');
    const hrefMatch = html.match(/href="([^"]+)"/);
    expect(hrefMatch).not.toBeNull();
    const decodedUrl = decodeURIComponent(hrefMatch![1]);
    expect(decodedUrl).toContain('3 mois');
    expect(decodedUrl).toContain('12');
    expect(decodedUrl).toContain('€');
  });

  // Test 3: Pricing intent 6m generates the correct message
  it('Test 3: Pricing intent 6m generates message with 6 mois and 24 €', async () => {
    const html = await container.renderToString(WhatsAppCTA, {
      props: {
        intent: 'pricing_6m',
        planId: '6m',
        label: 'Choisir la formule Standard',
        sourceSection: 'pricing',
        phone: TEST_PHONE,
      },
    });

    const hrefMatch = html.match(/href="([^"]+)"/);
    const decodedUrl = decodeURIComponent(hrefMatch![1]);
    expect(decodedUrl).toContain('6 mois');
    expect(decodedUrl).toContain('24');
    expect(decodedUrl).toContain('€');
  });

  // Test 4: Pricing intent 12m generates the correct message
  it('Test 4: Pricing intent 12m generates message with 12 mois and 35 €', async () => {
    const html = await container.renderToString(WhatsAppCTA, {
      props: {
        intent: 'pricing_12m',
        planId: '12m',
        label: 'Choisir la formule Annuelle',
        sourceSection: 'pricing',
        phone: TEST_PHONE,
      },
    });

    const hrefMatch = html.match(/href="([^"]+)"/);
    const decodedUrl = decodeURIComponent(hrefMatch![1]);
    expect(decodedUrl).toContain('12 mois');
    expect(decodedUrl).toContain('35');
    expect(decodedUrl).toContain('€');
  });

  // Test 5: Support intent produces a non-commercial support message
  it('Test 5: Support intent produces a non-commercial assistance message', async () => {
    const html = await container.renderToString(WhatsAppCTA, {
      props: {
        intent: 'technical_support',
        label: 'Obtenir de l’aide',
        sourceSection: 'support',
        phone: TEST_PHONE,
      },
    });

    const hrefMatch = html.match(/href="([^"]+)"/);
    const decodedUrl = decodeURIComponent(hrefMatch![1]);
    expect(decodedUrl).toMatch(/assistance technique/i);
    expect(decodedUrl).not.toMatch(/souscrire/i);
  });

  // Test 6: Invalid production configuration cannot generate a false functional link
  it('Test 6: Missing or invalid phone number safely disables link without false wa.me target', async () => {
    const originalEnv = process.env.PUBLIC_WHATSAPP_PHONE;
    delete process.env.PUBLIC_WHATSAPP_PHONE;

    try {
      const html = await container.renderToString(WhatsAppCTA, {
        props: {
          intent: 'general_information',
          label: 'Nous contacter',
          sourceSection: 'hero',
        },
      });

      // Must not generate a broken or invented wa.me link
      expect(html).not.toMatch(/href="https:\/\/wa\.me/);
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('data-cta-status="unconfigured"');
    } finally {
      if (originalEnv) {
        process.env.PUBLIC_WHATSAPP_PHONE = originalEnv;
      }
    }
  });

  // Test 7: Component is keyboard accessible
  it('Test 7: Component renders keyboard accessible markup', async () => {
    const html = await container.renderToString(WhatsAppCTA, {
      props: {
        intent: 'device_check',
        label: 'Vérifier la compatibilité',
        sourceSection: 'compatibility',
        phone: TEST_PHONE,
      },
    });

    expect(html).toContain('<a');
    expect(html).toContain('class="');
    expect(html).toContain('whatsapp-cta');
  });

  // Test 8: Generated HTML remains functional without JavaScript
  it('Test 8: Generated HTML is pure semantic anchor without inline script handlers', async () => {
    const html = await container.renderToString(WhatsAppCTA, {
      props: {
        intent: 'faq_question',
        label: 'Poser une question',
        sourceSection: 'faq',
        phone: TEST_PHONE,
      },
    });

    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/onclick=/i);
  });

  // Test 9: CTA context is available for later event instrumentation
  it('Test 9: Non-sensitive machine-readable data attributes are exposed for analytics', async () => {
    const html = await container.renderToString(WhatsAppCTA, {
      props: {
        intent: 'pricing_12m',
        planId: '12m',
        label: 'Souscrire 12 mois',
        sourceSection: 'pricing',
        phone: TEST_PHONE,
      },
    });

    expect(html).toContain('data-cta-intent="pricing_12m"');
    expect(html).toContain('data-cta-source="pricing"');
    expect(html).toContain('data-cta-plan="12m"');
    expect(html).toContain('data-cta-status="configured"');
  });

  // Test 10: Phone number +330601384612 is properly normalized to 33601384612 in wa.me link
  it('Test 10: Formatted number +330601384612 is automatically normalized to 33601384612 in target link', async () => {
    const html = await container.renderToString(WhatsAppCTA, {
      props: {
        intent: 'general_information',
        label: 'Contacter sur WhatsApp',
        sourceSection: 'hero',
        phone: '+330601384612',
      },
    });

    expect(html).toContain('href="https://wa.me/33601384612?text=');
    expect(html).toContain('data-cta-status="configured"');
  });

  // Test 11: Uses process.env.PUBLIC_WHATSAPP_PHONE when phone prop is omitted
  it('Test 11: Uses environment variable PUBLIC_WHATSAPP_PHONE when phone prop is omitted', async () => {
    const originalEnv = process.env.PUBLIC_WHATSAPP_PHONE;
    try {
      process.env.PUBLIC_WHATSAPP_PHONE = '33601384612';
      const html = await container.renderToString(WhatsAppCTA, {
        props: {
          intent: 'pricing_3m',
          planId: '3m',
          label: 'Souscrire 3 mois',
          sourceSection: 'pricing',
        },
      });

      expect(html).toContain('href="https://wa.me/33601384612?text=');
      expect(html).toContain('data-cta-status="configured"');
    } finally {
      if (originalEnv) {
        process.env.PUBLIC_WHATSAPP_PHONE = originalEnv;
      } else {
        delete process.env.PUBLIC_WHATSAPP_PHONE;
      }
    }
  });
});
