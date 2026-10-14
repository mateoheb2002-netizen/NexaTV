import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');
const distIndexPath = path.join(projectRoot, 'dist/index.html');

describe('Static Build HTML Entrypoint Verification (e2e/smoke)', () => {
  it('1. Verifies that dist/index.html exists and is generated as static HTML', () => {
    expect(fs.existsSync(distIndexPath), 'dist/index.html should exist after build').toBe(true);
  });

  it('2. Verifies that dist/index.html contains valid HTML5 doctype and fr-FR language attribute', () => {
    expect(fs.existsSync(distIndexPath), 'dist/index.html must exist before checking content').toBe(true);
    const html = fs.readFileSync(distIndexPath, 'utf-8');
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html[^>]*lang=["']fr(-FR)?["']/i);
  });

  it('3. Verifies content is inspectable in static HTML without client-side JavaScript execution', () => {
    expect(fs.existsSync(distIndexPath), 'dist/index.html must exist before checking content').toBe(true);
    const html = fs.readFileSync(distIndexPath, 'utf-8');
    expect(html).toMatch(/<h1[^>]*>NexaTV\s*:\s*votre abonnement IPTV en France dès 12 €<\/h1>/);
    expect(html).toContain('<meta name="description"');
  });

  it('4. Verifies no client-side framework scripts or external analytics are bundled in entrypoint', () => {
    expect(fs.existsSync(distIndexPath), 'dist/index.html must exist before checking content').toBe(true);
    const html = fs.readFileSync(distIndexPath, 'utf-8');
    expect(html).not.toMatch(/google-analytics\.com/);
    expect(html).not.toMatch(/googletagmanager\.com/);
    expect(html).not.toMatch(/react(-dom)?/i);
  });

  it('5. Verifies all required landmarks and skip link are present in compiled output', () => {
    expect(fs.existsSync(distIndexPath), 'dist/index.html must exist before checking content').toBe(true);
    const html = fs.readFileSync(distIndexPath, 'utf-8');

    // Skip link
    expect(html).toMatch(/<a\b[^>]*href="#main-content"[^>]*class="skip-link"/);

    // Landmarks
    expect(html).toContain('<header class="site-header">');
    expect(html).toContain('<main id="main-content" tabindex="-1">');
    expect(html).toContain('<footer class="site-footer">');

    // Active navigation state on Accueil
    expect(html).toMatch(/<a\b[^>]*href="\/"[^>]*aria-current="page"/);

    // Mobile disclosure
    expect(html).toContain('<details class="mobile-nav-details">');
    expect(html).toContain('<summary class="mobile-nav-summary"');
  });

  it('6. Verifies that dist/abonnement-iptv/index.html exists and is generated as static HTML', () => {
    const distPricingHtmlPath = path.join(projectRoot, 'dist/abonnement-iptv/index.html');
    expect(fs.existsSync(distPricingHtmlPath), 'dist/abonnement-iptv/index.html should exist after build').toBe(true);
    const html = fs.readFileSync(distPricingHtmlPath, 'utf-8');

    // Language and doctype
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html[^>]*lang=["']fr(-FR)?["']/i);

    // Exactly one H1
    const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches![0]).toMatch(/Abonnement IPTV/i);

    // Active navigation state on Abonnements
    expect(html).toMatch(/<a\b[^>]*href="\/abonnement-iptv\/"[^>]*aria-current="page"/);

    // Check all three plans are rendered
    expect(html).toContain('Découverte');
    expect(html).toContain('Standard');
    expect(html).toContain('Annuel');
    expect(html).toMatch(/12\s*€/);
    expect(html).toMatch(/24\s*€/);
    expect(html).toMatch(/35\s*€/);
    expect(html).toContain('Meilleur tarif mensuel NexaTV');

    // Check standardized button labels
    expect(html).toContain('Choisir 3 mois');
    expect(html).toContain('Choisir 6 mois');
    expect(html).toContain('Choisir 12 mois');

    // No client JS framework
    expect(html).not.toMatch(/react(-dom)?/i);
    expect(html).not.toMatch(/vue(\.runtime)?/i);
  });

  it('7. Verifies that dist/appareils-compatibles/index.html exists and is generated as static HTML', () => {
    const distCompatHtmlPath = path.join(projectRoot, 'dist/appareils-compatibles/index.html');
    expect(fs.existsSync(distCompatHtmlPath), 'dist/appareils-compatibles/index.html should exist after build').toBe(true);
    const html = fs.readFileSync(distCompatHtmlPath, 'utf-8');

    // Language and doctype
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html[^>]*lang=["']fr(-FR)?["']/i);

    // Exactly one H1
    const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches![0]).toMatch(/Compatibilité des appareils/i);

    // Active navigation state on Appareils
    expect(html).toMatch(/<a\b[^>]*href="\/appareils-compatibles\/"[^>]*aria-current="page"/);

    // All four device families appear
    expect(html).toContain('Samsung Smart TV');
    expect(html).toContain('LG Smart TV');
    expect(html).toContain('Android TV / Google TV');
    expect(html).toContain('Amazon Fire TV');

    // Truthful verification badges and CTA buttons
    expect(html).toContain('Vérification requise');
    expect(html).toContain('Vérifier cet appareil');

    // Reachable pricing route
    expect(html).toContain('href="/abonnement-iptv/"');

    // No client JS framework
    expect(html).not.toMatch(/react(-dom)?/i);
    expect(html).not.toMatch(/vue(\.runtime)?/i);
  });

  it('8. Verifies that dist/assistance/index.html exists and is generated as static HTML', () => {
    const distAssistanceHtmlPath = path.join(projectRoot, 'dist/assistance/index.html');
    expect(fs.existsSync(distAssistanceHtmlPath), 'dist/assistance/index.html should exist after build').toBe(true);
    const html = fs.readFileSync(distAssistanceHtmlPath, 'utf-8');

    // Language and doctype
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html[^>]*lang=["']fr(-FR)?["']/i);

    // Exactly one H1
    const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches![0]).toMatch(/Assistance et support technique NexaTV/i);

    // Active navigation state on Assistance
    expect(html).toMatch(/<a\b[^>]*href="\/assistance\/"[^>]*aria-current="page"/);

    // Verify all 6 required sections
    expect(html).toContain('assistance-intro-section');
    expect(html).toContain('assistance-installation-section');
    expect(html).toContain('assistance-troubleshooting-section');
    expect(html).toContain('assistance-subscription-section');
    expect(html).toContain('assistance-contact-section');
    expect(html).toContain('assistance-faq-section');

    // Technical support CTA with technical_support intent
    expect(html).toContain('data-cta-intent="technical_support"');
    expect(html).toContain('data-cta-source="support"');

    // Self-service troubleshooting in static HTML without requiring JS
    expect(html).toMatch(/Ethernet/i);
    expect(html).toMatch(/buffer/i);
    expect(html).toMatch(/tampon/i);

    // No client JS framework
    expect(html).not.toMatch(/react(-dom)?/i);
    expect(html).not.toMatch(/vue(\.runtime)?/i);
  });

  it('9. Verifies that MobileStickyCTA is rendered with progressive enhancement fallback in compiled HTML', () => {
    const distIndexPath = path.join(projectRoot, 'dist/index.html');
    const html = fs.readFileSync(distIndexPath, 'utf-8');

    // Sticky CTA container exists with initial hidden state
    expect(html).toContain('id="mobile-sticky-cta-bar"');
    expect(html).toContain('data-sticky-visible="false"');
    expect(html).toContain('aria-hidden="true"');

    // Contextual sourceSection is mobile_sticky
    expect(html).toContain('data-cta-source="mobile_sticky"');
  });

  it('10. Verifies that published blog article compiles to static HTML with unique H1 and breadcrumbs', () => {
    const distArticlePath = path.join(projectRoot, 'dist/blog/comment-choisir-abonnement-iptv/index.html');
    expect(fs.existsSync(distArticlePath), 'Published blog article route must exist in dist/').toBe(true);

    const html = fs.readFileSync(distArticlePath, 'utf-8');

    // Language and doctype
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html[^>]*lang=["']fr(-FR)?["']/i);

    // Exactly one H1
    const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches![0]).toMatch(/Comment bien choisir son abonnement IPTV/i);

    // Breadcrumbs present with semantic nav
    expect(html).toMatch(/<nav\b[^>]*aria-label=["']Fil d'Ariane["']/);
    expect(html).toContain('Accueil');

    // Real publication date is rendered
    expect(html).toMatch(/<time datetime="2026-10-10/);
    expect(html).toMatch(/10 octobre 2026/);

    // Contextual internal links present in compiled HTML
    expect(html).toContain('href="/abonnement-iptv/"');
    expect(html).toContain('href="/appareils-compatibles/"');
    expect(html).toContain('href="/assistance/"');

    // Required comparison criteria rendered in static HTML
    expect(html).toMatch(/prix (total|seul)/i);
    expect(html).toMatch(/droits territoriaux|diffusion autorisée/i);
    expect(html).toMatch(/catalogue de chaînes|bouquets/i);
    expect(html).toMatch(/compatibilité des appareils/i);
    expect(html).toMatch(/connexions simultanées/i);
    expect(html).toMatch(/mentions légales/i);
    expect(html).toMatch(/reconduction tacite/i);
    expect(html).toMatch(/support technique/i);

    // No client framework JS
    expect(html).not.toMatch(/react(-dom)?/i);
    expect(html).not.toMatch(/vue(\.runtime)?/i);
  });

  it('11. Verifies that draft content is strictly excluded from compiled routes', () => {
    const distDraftGuidePath = path.join(projectRoot, 'dist/guides/installer-iptv-samsung/index.html');
    expect(fs.existsSync(distDraftGuidePath), 'Draft content must NOT generate a route in dist/').toBe(false);
  });

  it('12. Verifies that troubleshooting article compiles to static HTML under /assistance/iptv-buffering/ with no duplicates', () => {
    const distBufferingPath = path.join(projectRoot, 'dist/assistance/iptv-buffering/index.html');
    expect(fs.existsSync(distBufferingPath), 'dist/assistance/iptv-buffering/index.html must exist after build').toBe(true);

    const html = fs.readFileSync(distBufferingPath, 'utf-8');

    // Language and doctype
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html[^>]*lang=["']fr(-FR)?["']/i);

    // Exactly one H1
    const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches![0]).toMatch(/IPTV qui coupe ou bloque/i);

    // Breadcrumbs contain /assistance/ link
    expect(html).toContain('href="/assistance/"');

    // Steps render in sequence and without client JS execution
    expect(html).toMatch(/Étape 1\s*:\s*Vérifier la connectivité/i);
    expect(html).toMatch(/Étape 2\s*:\s*Éliminer les interférences Wi-Fi/i);
    expect(html).toMatch(/Étape 3\s*:\s*Redémarrer l['’]application/i);
    expect(html).toMatch(/Étape 4\s*:\s*Vérifier les mises à jour/i);
    expect(html).toMatch(/Étape 5\s*:\s*Adapter les contraintes matérielles/i);
    expect(html).toMatch(/Étape 6\s*:\s*Comparer avec un autre équipement/i);
    expect(html).toMatch(/Étape 7\s*:\s*Contacter l['’]assistance technique/i);

    // Technical support CTA intent
    expect(html).toContain('data-cta-intent="technical_support"');
    expect(html).toContain('data-cta-source="support"');

    // No duplicate route under /blog/
    const duplicateBlogPath = path.join(projectRoot, 'dist/blog/iptv-buffering/index.html');
    expect(fs.existsSync(duplicateBlogPath), 'Duplicate route under /blog/ must NOT exist').toBe(false);

    // No client framework JS
    expect(html).not.toMatch(/react(-dom)?/i);
    expect(html).not.toMatch(/vue(\.runtime)?/i);
  });

  it('13. Verifies that dist/404.html exists, has noindex, and contains functional recovery links', () => {
    const dist404Path = path.join(projectRoot, 'dist/404.html');
    expect(fs.existsSync(dist404Path), 'dist/404.html must exist after build').toBe(true);

    const html = fs.readFileSync(dist404Path, 'utf-8');

    // Language and doctype
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html[^>]*lang=["']fr(-FR)?["']/i);

    // Robots noindex
    expect(html).toMatch(/<meta[^>]*name=["']robots["'][^>]*content=["']noindex/i);

    // Recovery links to homepage, pricing, assistance
    expect(html).toMatch(/<a\b[^>]*href="\/"[^>]*>/);
    expect(html).toMatch(/<a\b[^>]*href="\/abonnement-iptv\/"[^>]*>/);
    expect(html).toMatch(/<a\b[^>]*href="\/assistance\/"[^>]*>/);

    // No client framework JS
    expect(html).not.toMatch(/react(-dom)?/i);
    expect(html).not.toMatch(/vue(\.runtime)?/i);
  });
});

