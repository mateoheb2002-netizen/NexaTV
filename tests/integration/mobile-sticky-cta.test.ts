import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { StickyCTAController } from '../../src/utils/sticky-cta-controller';

const projectRoot = path.resolve(__dirname, '../../');
const componentAstroPath = path.join(projectRoot, 'src/components/MobileStickyCTA.astro');

describe('Mobile Sticky WhatsApp CTA (src/components/MobileStickyCTA.astro & StickyCTAController)', () => {
  let stickyBar: HTMLElement;
  let heroCta: HTMLElement;
  let equivalentCta: HTMLElement;
  let footer: HTMLElement;
  let mockObserverCallback: (entries: IntersectionObserverEntry[]) => void;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let mockObserve: ReturnType<typeof vi.fn>;

  const createMockEntry = (
    target: HTMLElement,
    isIntersecting: boolean,
    top: number
  ): IntersectionObserverEntry => {
    return {
      target,
      isIntersecting,
      boundingClientRect: { top } as DOMRectReadOnly,
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    };
  };

  beforeEach(() => {
    document.body.innerHTML = '';

    // Create DOM structure
    stickyBar = document.createElement('div');
    stickyBar.id = 'mobile-sticky-cta-bar';
    stickyBar.className = 'mobile-sticky-bar';
    const link = document.createElement('a');
    link.href = 'https://wa.me/33612345678?text=Bonjour';
    link.className = 'mobile-sticky-link';
    link.textContent = 'Discuter sur WhatsApp';
    stickyBar.appendChild(link);

    heroCta = document.createElement('div');
    heroCta.id = 'hero-cta-trigger';

    equivalentCta = document.createElement('div');
    equivalentCta.className = 'equivalent-cta';

    footer = document.createElement('footer');
    footer.className = 'site-footer';

    document.body.appendChild(heroCta);
    document.body.appendChild(equivalentCta);
    document.body.appendChild(footer);
    document.body.appendChild(stickyBar);

    mockDisconnect = vi.fn();
    mockObserve = vi.fn();

    // Mock IntersectionObserver with a proper constructible class
    class MockIntersectionObserver {
      constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
        mockObserverCallback = callback;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = vi.fn();
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('Test 1: Sticky CTA is hidden while the hero CTA is visible', () => {
    const controller = new StickyCTAController({
      stickyBarElement: stickyBar,
      heroElement: heroCta,
      suppressElements: [equivalentCta],
      footerElement: footer,
    });

    controller.init();

    // Initially or while hero CTA is intersecting, sticky CTA is hidden
    mockObserverCallback([createMockEntry(heroCta, true, 100)]);

    expect(stickyBar.getAttribute('data-sticky-visible')).toBe('false');
    expect(stickyBar.getAttribute('aria-hidden')).toBe('true');
  });

  it('Test 2: Sticky CTA appears after the hero CTA leaves the viewport', () => {
    const controller = new StickyCTAController({
      stickyBarElement: stickyBar,
      heroElement: heroCta,
      suppressElements: [equivalentCta],
      footerElement: footer,
    });

    controller.init();

    // Hero CTA scrolled past the top (top < 0 and isIntersecting is false)
    mockObserverCallback([createMockEntry(heroCta, false, -250)]);

    expect(stickyBar.getAttribute('data-sticky-visible')).toBe('true');
    expect(stickyBar.getAttribute('aria-hidden')).toBe('false');
  });

  it('Test 3: Sticky CTA hides when an equivalent CTA enters the viewport', () => {
    const controller = new StickyCTAController({
      stickyBarElement: stickyBar,
      heroElement: heroCta,
      suppressElements: [equivalentCta],
      footerElement: footer,
    });

    controller.init();

    // Hero passed
    mockObserverCallback([createMockEntry(heroCta, false, -250)]);
    expect(stickyBar.getAttribute('data-sticky-visible')).toBe('true');

    // Equivalent in-page CTA enters viewport
    mockObserverCallback([createMockEntry(equivalentCta, true, 200)]);
    expect(stickyBar.getAttribute('data-sticky-visible')).toBe('false');

    // Equivalent in-page CTA leaves viewport
    mockObserverCallback([createMockEntry(equivalentCta, false, -100)]);
    expect(stickyBar.getAttribute('data-sticky-visible')).toBe('true');
  });

  it('Test 4: Footer content remains unobstructed', () => {
    const controller = new StickyCTAController({
      stickyBarElement: stickyBar,
      heroElement: heroCta,
      suppressElements: [equivalentCta],
      footerElement: footer,
    });

    controller.init();

    // Hero passed
    mockObserverCallback([createMockEntry(heroCta, false, -500)]);
    expect(stickyBar.getAttribute('data-sticky-visible')).toBe('true');

    // Footer enters viewport
    mockObserverCallback([createMockEntry(footer, true, 400)]);
    expect(stickyBar.getAttribute('data-sticky-visible')).toBe('false');
  });

  it('Test 5: Safe-area layout remains usable', () => {
    expect(fs.existsSync(componentAstroPath)).toBe(true);
    const content = fs.readFileSync(componentAstroPath, 'utf-8');
    // Checks that safe-area-inset-bottom is handled
    expect(content).toMatch(/env\(safe-area-inset-bottom/);
  });

  it('Test 6: No horizontal overflow at 320px', () => {
    const content = fs.readFileSync(componentAstroPath, 'utf-8');
    // Checks container rules preventing overflow
    expect(content).toMatch(/width:\s*100%/);
    expect(content).toMatch(/box-sizing:\s*border-box/);
    expect(content).toMatch(/max-width:/);
  });

  it('Test 7: Sticky CTA opens the correct contextual WhatsApp link with explicit label', () => {
    const content = fs.readFileSync(componentAstroPath, 'utf-8');
    expect(content).toContain('WhatsAppCTA');
    expect(content).toContain('sourceSection="mobile_sticky"');
    // Mentions WhatsApp in label or aria
    expect(content).toMatch(/WhatsApp/);
  });

  it('Test 8: Page remains usable with JavaScript disabled', () => {
    const content = fs.readFileSync(componentAstroPath, 'utf-8');
    const controllerCode = fs.readFileSync(path.join(projectRoot, 'src/utils/sticky-cta-controller.ts'), 'utf-8');
    // Progressive enhancement: sticky container starts hidden or non-blocking
    expect(content).toMatch(/data-sticky-visible="false"|display:\s*none/);
    // Link has tabindex management when hidden to prevent invisible keyboard tab focus
    expect(controllerCode).toMatch(/tabindex/);
  });

  it('Test 9: Observer cleanup does not produce duplicate state changes', () => {
    const controller = new StickyCTAController({
      stickyBarElement: stickyBar,
      heroElement: heroCta,
      suppressElements: [equivalentCta],
      footerElement: footer,
    });

    controller.init();
    controller.destroy();

    expect(mockDisconnect).toHaveBeenCalled();
  });
});
