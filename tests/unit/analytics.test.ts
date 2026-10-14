import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackCTAInteraction,
  registerAnalyticsAdapter,
  resetAnalyticsAdapters,
  setAnalyticsConfig,
  isAnalyticsActive,
  type AnalyticsAdapter,
  type NexaAnalyticsEvent,
} from '../../src/utils/analytics';

describe('Analytics & CTA Tracking Engine (src/utils/analytics.ts)', () => {
  beforeEach(() => {
    resetAnalyticsAdapters();
    // Default pre-production state: provider UNKNOWN, consent UNKNOWN -> inactive
    setAnalyticsConfig({
      provider: undefined,
      requireConsent: true,
      hasConsent: false,
    });
  });

  it('Test 1: Clicking pricing 3m produces the correct categorical plan context', () => {
    const trackedEvents: NexaAnalyticsEvent[] = [];
    const testAdapter: AnalyticsAdapter = {
      name: 'test-adapter',
      track: (e) => {
        trackedEvents.push(e);
      },
    };

    setAnalyticsConfig({ provider: 'test', requireConsent: false, hasConsent: true });
    registerAnalyticsAdapter(testAdapter);

    const emitted = trackCTAInteraction({
      pagePath: '/abonnement-iptv/',
      sectionId: 'pricing',
      ctaType: 'whatsapp',
      planId: '3m',
      interactionId: 'click-1',
    });

    expect(emitted.length).toBe(2);
    const pricingEvent = emitted.find((e) => e.eventName === 'pricing_section_cta_click');
    expect(pricingEvent).toBeDefined();
    expect(pricingEvent?.planId).toBe('3m');
    expect(pricingEvent?.sectionId).toBe('pricing');
    expect(pricingEvent?.ctaType).toBe('whatsapp');
    expect(pricingEvent?.pagePath).toBe('/abonnement-iptv/');

    expect(trackedEvents).toHaveLength(2);
  });

  it('Test 2: Clicking pricing 12m identifies plan 12m', () => {
    setAnalyticsConfig({ provider: 'test', requireConsent: false, hasConsent: true });

    const emitted = trackCTAInteraction({
      pagePath: '/abonnement-iptv/',
      sectionId: 'pricing',
      ctaType: 'whatsapp',
      planId: '12m',
      interactionId: 'click-2',
    });

    const pricingEvent = emitted.find((e) => e.eventName === 'pricing_section_cta_click');
    expect(pricingEvent).toBeDefined();
    expect(pricingEvent?.planId).toBe('12m');
  });

  it('Test 3: Device verification produces device_section_cta_click', () => {
    setAnalyticsConfig({ provider: 'test', requireConsent: false, hasConsent: true });

    const emitted = trackCTAInteraction({
      pagePath: '/appareils-compatibles/',
      sectionId: 'compatibility',
      ctaType: 'whatsapp',
      interactionId: 'click-3',
    });

    const deviceEvent = emitted.find((e) => e.eventName === 'device_section_cta_click');
    expect(deviceEvent).toBeDefined();
    expect(deviceEvent?.sectionId).toBe('compatibility');
  });

  it('Test 4: Sticky CTA produces sticky_mobile_cta_click', () => {
    setAnalyticsConfig({ provider: 'test', requireConsent: false, hasConsent: true });

    const emitted = trackCTAInteraction({
      pagePath: '/abonnement-iptv/',
      sectionId: 'mobile_sticky',
      ctaType: 'whatsapp',
      planId: '12m',
      interactionId: 'click-4',
    });

    const stickyEvent = emitted.find((e) => e.eventName === 'sticky_mobile_cta_click');
    expect(stickyEvent).toBeDefined();
    expect(stickyEvent?.sectionId).toBe('mobile_sticky');
    expect(stickyEvent?.planId).toBe('12m');
  });

  it('Test 5: WhatsApp CTA also emits the generic event once', () => {
    setAnalyticsConfig({ provider: 'test', requireConsent: false, hasConsent: true });

    const emitted = trackCTAInteraction({
      pagePath: '/',
      sectionId: 'hero',
      ctaType: 'whatsapp',
      interactionId: 'click-5',
    });

    expect(emitted).toHaveLength(2);

    const genericEvents = emitted.filter((e) => e.eventName === 'whatsapp_cta_click');
    expect(genericEvents).toHaveLength(1);
    expect(genericEvents[0].ctaType).toBe('whatsapp');

    const contextualEvent = emitted.find((e) => e.eventName === 'hero_cta_click');
    expect(contextualEvent).toBeDefined();
  });

  it('Test 6: Internal navigation does not emit whatsapp_cta_click', () => {
    setAnalyticsConfig({ provider: 'test', requireConsent: false, hasConsent: true });

    const emitted = trackCTAInteraction({
      pagePath: '/',
      sectionId: 'hero',
      ctaType: 'internal',
      interactionId: 'click-6',
    });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].eventName).toBe('hero_cta_click');
    expect(emitted[0].ctaType).toBe('internal');

    const genericEvent = emitted.find((e) => e.eventName === 'whatsapp_cta_click');
    expect(genericEvent).toBeUndefined();
  });

  it('Test 7: One interaction does not generate duplicate identical events', () => {
    setAnalyticsConfig({ provider: 'test', requireConsent: false, hasConsent: true });

    const trackedEvents: NexaAnalyticsEvent[] = [];
    registerAnalyticsAdapter({
      name: 'dedup-adapter',
      track: (e) => {
        trackedEvents.push(e);
      },
    });

    // First call with interactionId 'click-unique'
    const firstCall = trackCTAInteraction({
      pagePath: '/abonnement-iptv/',
      sectionId: 'pricing',
      ctaType: 'whatsapp',
      planId: '3m',
      interactionId: 'click-unique',
    });
    expect(firstCall.length).toBe(2);
    expect(trackedEvents.length).toBe(2);

    // Duplicate call with the same interactionId
    const duplicateCall = trackCTAInteraction({
      pagePath: '/abonnement-iptv/',
      sectionId: 'pricing',
      ctaType: 'whatsapp',
      planId: '3m',
      interactionId: 'click-unique',
    });

    expect(duplicateCall.length).toBe(0);
    // Still 2, no duplicates dispatched
    expect(trackedEvents.length).toBe(2);
  });

  it('Test 8: Analytics adapter failure does not block WhatsApp navigation', () => {
    setAnalyticsConfig({ provider: 'test', requireConsent: false, hasConsent: true });

    const failingAdapter: AnalyticsAdapter = {
      name: 'broken-adapter',
      track: () => {
        throw new Error('Network error in tracking endpoint');
      },
    };
    registerAnalyticsAdapter(failingAdapter);

    // Calling tracking function must not throw
    expect(() => {
      const emitted = trackCTAInteraction({
        pagePath: '/assistance/',
        sectionId: 'support',
        ctaType: 'whatsapp',
        interactionId: 'click-resilient',
      });
      expect(emitted.length).toBe(2);
    }).not.toThrow();
  });

  it('Test 9: No sensitive message or customer credentials are captured', () => {
    setAnalyticsConfig({ provider: 'test', requireConsent: false, hasConsent: true });

    const emitted = trackCTAInteraction({
      pagePath: '/assistance/iptv-buffering/',
      sectionId: 'blog',
      ctaType: 'whatsapp',
      interactionId: 'click-clean',
    });

    for (const event of emitted) {
      // Must only contain safe, controlled properties
      const allowedKeys = ['eventName', 'pagePath', 'sectionId', 'ctaType', 'planId', 'timestamp'];
      for (const key of Object.keys(event)) {
        expect(allowedKeys).toContain(key);
      }

      // Explicitly verifies absence of customer messages or credentials
      const eventAny = event as any;
      expect(eventAny.message).toBeUndefined();
      expect(eventAny.text).toBeUndefined();
      expect(eventAny.phone).toBeUndefined();
      expect(eventAny.password).toBeUndefined();
      expect(eventAny.token).toBeUndefined();
    }
  });

  it('Test 10: Analytics remains inactive where configuration or necessary consent is absent', () => {
    // 1. Without provider configured
    setAnalyticsConfig({ provider: undefined, requireConsent: true, hasConsent: true });
    expect(isAnalyticsActive()).toBe(false);

    let emitted = trackCTAInteraction({
      pagePath: '/',
      sectionId: 'hero',
      ctaType: 'whatsapp',
      interactionId: 'click-inactive-1',
    });
    expect(emitted).toHaveLength(0);

    // 2. With provider configured but consent missing
    setAnalyticsConfig({ provider: 'ga4', requireConsent: true, hasConsent: false });
    expect(isAnalyticsActive()).toBe(false);

    emitted = trackCTAInteraction({
      pagePath: '/',
      sectionId: 'hero',
      ctaType: 'whatsapp',
      interactionId: 'click-inactive-2',
    });
    expect(emitted).toHaveLength(0);

    // 3. With provider configured and consent granted
    setAnalyticsConfig({ provider: 'ga4', requireConsent: true, hasConsent: true });
    expect(isAnalyticsActive()).toBe(true);

    emitted = trackCTAInteraction({
      pagePath: '/',
      sectionId: 'hero',
      ctaType: 'whatsapp',
      interactionId: 'click-active',
    });
    expect(emitted.length).toBe(2);
  });
});
