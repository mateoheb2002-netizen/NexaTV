import { describe, it, expect } from 'vitest';
import {
  MAIN_NAV_ITEMS,
  CONFIRMED_ROUTES,
  isActivePath,
} from '../../src/data/navigation';

describe('Navigation Data Contract (src/data/navigation.ts)', () => {
  it('Test 1: Confirmed navigation items contain exactly the 4 approved destinations', () => {
    expect(MAIN_NAV_ITEMS).toHaveLength(4);

    const labels = MAIN_NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual(['Accueil', 'Abonnements', 'Appareils', 'Assistance']);

    const hrefs = MAIN_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toEqual([
      '/',
      '/abonnement-iptv/',
      '/appareils-compatibles/',
      '/assistance/',
    ]);
  });

  it('Test 2: All navigation links enforce trailing slash consistency', () => {
    for (const item of MAIN_NAV_ITEMS) {
      if (item.href === '/') {
        expect(item.href).toBe('/');
      } else {
        expect(item.href.endsWith('/')).toBe(true);
      }
    }
  });

  it('Test 3: isActivePath accurately determines active route', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/abonnement-iptv/', '/abonnement-iptv/')).toBe(true);
    expect(isActivePath('/abonnement-iptv', '/abonnement-iptv/')).toBe(true);
    expect(isActivePath('/appareils-compatibles/', '/abonnement-iptv/')).toBe(false);
    expect(isActivePath('/assistance/', '/')).toBe(false);
  });

  it('Test 4: No unpublished guide or legal route exists in navigation items', () => {
    const forbiddenHrefs = [
      '/guides/',
      '/guides/installer-iptv-android-tv/',
      '/guides/installer-iptv-samsung/',
      '/guides/installer-iptv-lg/',
      '/guides/installer-iptv-fire-tv/',
      '/guides/configurer-iptv-smarters/',
      '/guides/configurer-tivimate/',
      '/mentions-legales/',
      '/cgv/',
      '/politique-de-confidentialite/',
    ];

    const currentHrefs = MAIN_NAV_ITEMS.map((i) => i.href);
    for (const forbidden of forbiddenHrefs) {
      expect(currentHrefs).not.toContain(forbidden);
    }
  });

  it('Test 5: Confirmed routes list contains valid and verified routes', () => {
    expect(CONFIRMED_ROUTES).toContain('/');
    expect(CONFIRMED_ROUTES).toContain('/abonnement-iptv/');
    expect(CONFIRMED_ROUTES).toContain('/appareils-compatibles/');
    expect(CONFIRMED_ROUTES).toContain('/assistance/');
  });
});
