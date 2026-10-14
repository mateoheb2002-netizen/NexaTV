import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DEVICE_FAMILIES } from '../../src/data/devices';

const projectRoot = path.resolve(__dirname, '../../');
const compatibilityAstroPath = path.join(projectRoot, 'src/pages/appareils-compatibles.astro');
const deviceCardPath = path.join(projectRoot, 'src/components/DeviceCard.astro');
const globalCssPath = path.join(projectRoot, 'src/styles/global.css');

describe('Device Compatibility Hub (src/pages/appareils-compatibles.astro & src/components/DeviceCard.astro)', () => {
  const content = fs.readFileSync(compatibilityAstroPath, 'utf-8');
  const deviceCardContent = fs.readFileSync(deviceCardPath, 'utf-8');
  const globalCss = fs.readFileSync(globalCssPath, 'utf-8');
  const combinedContent = `${content}\n${deviceCardContent}`;

  it('Test 1: All four device families appear', () => {
    expect(fs.existsSync(compatibilityAstroPath), 'src/pages/appareils-compatibles.astro must exist').toBe(true);
    expect(fs.existsSync(deviceCardPath), 'src/components/DeviceCard.astro must exist').toBe(true);

    // Verify page maps over centralized catalogue
    expect(content).toMatch(/import\s+.*DEVICE_FAMILIES.*from\s+['"].*devices['"]/);
    expect(content).toContain('{DEVICE_FAMILIES.map');

    // Verify all 4 required device families are present in data contract
    const familyNames = DEVICE_FAMILIES.map(d => d.deviceFamily);
    expect(familyNames).toContain('Samsung Smart TV');
    expect(familyNames).toContain('LG Smart TV');
    expect(familyNames).toContain('Android TV / Google TV');
    expect(familyNames).toContain('Amazon Fire TV');
  });

  it('Test 2: Unknown compatibility states use verification language ("Vérifier cet appareil")', () => {
    // Both in DeviceCard and in the page CTA
    expect(deviceCardContent).toContain('Vérifier cet appareil');
    expect(deviceCardContent).toContain('Vérification requise');
    expect(content).toContain('Vérifier mon appareil');
  });

  it('Test 3: No "Compatible NexaTV" claim appears without approved evidence', () => {
    const forbiddenClaims = [
      /compatible nexatv/i,
      /100%\s*compatible/i,
      /compatibilité garantie/i,
      /toutes les smart tv sont compatibles/i,
    ];

    for (const pattern of forbiddenClaims) {
      expect(combinedContent).not.toMatch(pattern);
    }
  });

  it('Test 4: Unpublished guides are not linked', () => {
    // Ensure no links to unpublished guides
    const guideLinks = combinedContent.match(/href=["']\/guides\/[^"']+["']/g);
    if (guideLinks) {
      for (const linkMatch of guideLinks) {
        const route = linkMatch.replace(/href=["']|["']/g, '');
        // Any linked guide must exist in src/content/guides or src/pages
        const guideFileMd = path.join(projectRoot, 'src/content', route.replace(/\/$/, '') + '.md');
        const guideFileMdx = path.join(projectRoot, 'src/content', route.replace(/\/$/, '') + '.mdx');
        const guideFileAstro = path.join(projectRoot, 'src/pages', route.replace(/\/$/, '') + '.astro');
        const exists = fs.existsSync(guideFileMd) || fs.existsSync(guideFileMdx) || fs.existsSync(guideFileAstro);
        expect(exists, `Linked guide route ${route} must physically exist`).toBe(true);
      }
    }

    // Verify fallback note for pending guides is rendered when publishedGuideUrl is absent
    expect(deviceCardContent).toContain('Guide d\'installation officiel en cours de validation technique');
  });

  it('Test 5: Verification CTA generates the correct message type (device_check)', () => {
    expect(content).toMatch(/intent=["']device_check["']/);
    expect(deviceCardContent).toMatch(/intent=["']device_check["']/);
    expect(deviceCardContent).toMatch(/device=\{device\.deviceFamily\}/);
    expect(deviceCardContent).toMatch(/sourceSection=["']compatibility["']/);
  });

  it('Test 6: Pricing page is reachable from the compatibility hub', () => {
    expect(content).toMatch(/href=["']\/abonnement-iptv\/["']/);
  });

  it('Test 7: Mobile cards do not overflow', () => {
    // Devices grid uses responsive layout
    expect(content).toMatch(/device-card|devices-grid/);
    expect(globalCss).toMatch(/minmax\((2[4-8]0px|100%),/);
  });

  it('Test 8: Each card has accessible heading and link structure', () => {
    // DeviceCard component imported and used
    expect(content).toContain('DeviceCard');
    // DeviceCard uses semantic article, heading and accessible CTA
    expect(deviceCardContent).toMatch(/<article\b[^>]*class=["']device-card["']/);
    expect(deviceCardContent).toMatch(/<h3\b[^>]*class=["']device-title["']/);

    // Page has exactly one H1
    const h1Matches = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches![0]).toMatch(/compatibilité/i);
  });

  it('Explains how to identify device model, OS, and player vs service compatibility', () => {
    // Explains model check
    expect(content).toMatch(/modèle|référence/i);
    // Explains OS check
    expect(content).toMatch(/système d['’]exploitation|version/i);
    // Explains player vs service compatibility
    expect(content).toMatch(/lecteur/i);
    expect(content).toMatch(/flux/i);
  });
});

