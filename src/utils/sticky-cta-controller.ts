/**
 * Progressive enhancement controller for contextual mobile sticky WhatsApp CTA.
 *
 * Rules:
 * - Uses IntersectionObserver (no polling scroll listeners).
 * - Appears only after primary hero CTA scrolls out of view above the viewport.
 * - Hides when equivalent in-page CTAs or footer come into view.
 * - Fully unbinds and cleans up observers on destroy.
 */

export interface StickyCTAControllerOptions {
  stickyBarElement: HTMLElement;
  heroElement?: HTMLElement | null;
  suppressElements?: HTMLElement[];
  footerElement?: HTMLElement | null;
}

export class StickyCTAController {
  private stickyBar: HTMLElement;
  private heroElement: HTMLElement | null;
  private suppressElements: HTMLElement[];
  private footerElement: HTMLElement | null;
  private observer: IntersectionObserver | null = null;
  private heroPassed = false;
  private activeSuppressSet = new Set<Element>();

  constructor(options: StickyCTAControllerOptions) {
    this.stickyBar = options.stickyBarElement;
    this.heroElement = options.heroElement ?? null;
    this.suppressElements = options.suppressElements ?? [];
    this.footerElement = options.footerElement ?? null;
  }

  public init(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.updateVisibility();

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === this.heroElement) {
            if (entry.isIntersecting) {
              this.heroPassed = false;
            } else {
              // Scrolled past the hero CTA towards the bottom
              this.heroPassed = entry.boundingClientRect.top < 0;
            }
          } else if (
            entry.target === this.footerElement ||
            this.suppressElements.includes(entry.target as HTMLElement)
          ) {
            if (entry.isIntersecting) {
              this.activeSuppressSet.add(entry.target);
            } else {
              this.activeSuppressSet.delete(entry.target);
            }
          }
        }
        this.updateVisibility();
      },
      {
        root: null,
        threshold: 0.1,
      }
    );

    if (this.heroElement) {
      this.observer.observe(this.heroElement);
    }
    if (this.footerElement) {
      this.observer.observe(this.footerElement);
    }
    for (const el of this.suppressElements) {
      this.observer.observe(el);
    }
  }

  public updateVisibility(): void {
    const isSuppressed = this.activeSuppressSet.size > 0;
    const shouldBeVisible = this.heroPassed && !isSuppressed;

    this.stickyBar.setAttribute('data-sticky-visible', shouldBeVisible ? 'true' : 'false');
    this.stickyBar.setAttribute('aria-hidden', shouldBeVisible ? 'false' : 'true');

    const link = this.stickyBar.querySelector('a');
    if (link) {
      if (shouldBeVisible) {
        link.removeAttribute('tabindex');
      } else {
        link.setAttribute('tabindex', '-1');
      }
    }
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.activeSuppressSet.clear();
    this.heroPassed = false;
  }
}
