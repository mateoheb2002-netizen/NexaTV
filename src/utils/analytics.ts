/**
 * Non-blocking Analytics & CTA Interaction Tracking Engine for NexaTV.
 *
 * Enforces strict data minimization:
 * - No recording of customer messages or personal credentials
 * - No client-side sales attribution fabrication (tracks qualified clicks / intents only)
 * - Navigation is never blocked or dependent on analytics availability
 * - Remains strictly inactive by default when provider or consent is unconfigured
 */

export type AnalyticsEventName =
  | 'hero_cta_click'
  | 'pricing_section_cta_click'
  | 'device_section_cta_click'
  | 'blog_cta_click'
  | 'faq_cta_click'
  | 'sticky_mobile_cta_click'
  | 'whatsapp_cta_click';

export type CTAType = 'internal' | 'whatsapp';

export type CTASectionId =
  | 'hero'
  | 'pricing'
  | 'compatibility'
  | 'blog'
  | 'faq'
  | 'mobile_sticky'
  | 'support';

export interface NexaAnalyticsEvent {
  readonly eventName: AnalyticsEventName;
  readonly pagePath: string;
  readonly sectionId: CTASectionId;
  readonly ctaType: CTAType;
  readonly planId?: '3m' | '6m' | '12m';
  readonly timestamp?: number;
}

export interface AnalyticsAdapter {
  readonly name: string;
  track(event: NexaAnalyticsEvent): void | Promise<void>;
}

export interface AnalyticsConfig {
  provider?: string;
  requireConsent?: boolean;
  hasConsent?: boolean;
}

export interface TrackCTAInteractionParams {
  pagePath: string;
  sectionId: CTASectionId;
  ctaType: CTAType;
  planId?: '3m' | '6m' | '12m';
  interactionId?: string;
}

// Default pre-production state: provider UNKNOWN, consent UNKNOWN
let currentConfig: AnalyticsConfig = {
  provider: undefined,
  requireConsent: true,
  hasConsent: false,
};

let adapters: AnalyticsAdapter[] = [];
const processedInteractions = new Set<string>();

/**
 * Maps a section ID to its contextual event name.
 */
export function resolveContextualEventName(sectionId: CTASectionId): AnalyticsEventName {
  switch (sectionId) {
    case 'hero':
      return 'hero_cta_click';
    case 'pricing':
      return 'pricing_section_cta_click';
    case 'compatibility':
      return 'device_section_cta_click';
    case 'blog':
      return 'blog_cta_click';
    case 'faq':
      return 'faq_cta_click';
    case 'mobile_sticky':
      return 'sticky_mobile_cta_click';
    case 'support':
    default:
      return 'faq_cta_click';
  }
}

/**
 * Updates analytics configuration (provider and consent flags).
 */
export function setAnalyticsConfig(config: Partial<AnalyticsConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
  };
}

/**
 * Returns a copy of the current analytics configuration.
 */
export function getAnalyticsConfig(): Readonly<AnalyticsConfig> {
  return { ...currentConfig };
}

/**
 * Determines whether analytics tracking is active.
 * Inactive if provider is missing or if mandatory consent is absent.
 */
export function isAnalyticsActive(): boolean {
  if (!currentConfig.provider || currentConfig.provider.trim() === '') {
    return false;
  }
  if (currentConfig.requireConsent && !currentConfig.hasConsent) {
    return false;
  }
  return true;
}

/**
 * Registers an analytics adapter (e.g. GA4, Piwik/Matomo, internal beacon).
 */
export function registerAnalyticsAdapter(adapter: AnalyticsAdapter): void {
  adapters.push(adapter);
}

/**
 * Clears registered adapters and deduplication cache.
 */
export function resetAnalyticsAdapters(): void {
  adapters = [];
  processedInteractions.clear();
}

/**
 * Tracks a CTA interaction non-blockingly.
 * Emits contextual event and generic WhatsApp event when applicable.
 * Protects against duplicate events for a single interaction.
 */
export function trackCTAInteraction(params: {
  pagePath: string;
  sectionId: CTASectionId;
  ctaType: CTAType;
  planId?: '3m' | '6m' | '12m';
  interactionId?: string;
}): NexaAnalyticsEvent[] {
  // Guard: Inactive if provider or consent is missing
  if (!isAnalyticsActive()) {
    return [];
  }

  // Deduplication guard
  if (params.interactionId) {
    if (processedInteractions.has(params.interactionId)) {
      return [];
    }
    processedInteractions.add(params.interactionId);
  }

  const timestamp = Date.now();
  const emittedEvents: NexaAnalyticsEvent[] = [];

  // 1. Contextual event
  const contextualEventName = resolveContextualEventName(params.sectionId);
  const contextualEvent: NexaAnalyticsEvent = {
    eventName: contextualEventName,
    pagePath: params.pagePath,
    sectionId: params.sectionId,
    ctaType: params.ctaType,
    ...(params.planId ? { planId: params.planId } : {}),
    timestamp,
  };
  emittedEvents.push(contextualEvent);

  // 2. Generic WhatsApp event (emitted only for external WhatsApp CTAs)
  if (params.ctaType === 'whatsapp') {
    const genericWhatsAppEvent: NexaAnalyticsEvent = {
      eventName: 'whatsapp_cta_click',
      pagePath: params.pagePath,
      sectionId: params.sectionId,
      ctaType: 'whatsapp',
      ...(params.planId ? { planId: params.planId } : {}),
      timestamp,
    };
    emittedEvents.push(genericWhatsAppEvent);
  }

  // Dispatch non-blockingly to all registered adapters
  for (const event of emittedEvents) {
    for (const adapter of adapters) {
      try {
        adapter.track(event);
      } catch (err) {
        // Defensive: Analytics failure must never prevent user navigation
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`[NexaTV Analytics] Dispatch error on adapter ${adapter.name}:`, err);
        }
      }
    }
  }

  return emittedEvents;
}
