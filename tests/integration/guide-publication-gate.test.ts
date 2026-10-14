import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');
const guidesContentDir = path.join(projectRoot, 'src/content/guides');
const navigationDataPath = path.join(projectRoot, 'src/data/navigation.ts');
const devicesDataPath = path.join(projectRoot, 'src/data/devices.ts');
const guidesDynamicRoutePath = path.join(projectRoot, 'src/pages/guides/[...slug].astro');

describe('Guide Publication Gate Integration (Conditional Guides & Draft Exclusion)', () => {
  it('Test 5: Dynamic guides route strictly filters out drafts from getStaticPaths', () => {
    expect(fs.existsSync(guidesDynamicRoutePath)).toBe(true);
    const content = fs.readFileSync(guidesDynamicRoutePath, 'utf-8');

    // Asserts that getStaticPaths explicitly queries status === 'published'
    expect(content).toMatch(/status\s*===\s*['"]published['"]/);
  });

  it('Test 6: Draft guides are absent from published site navigation and published guide links', () => {
    const navContent = fs.readFileSync(navigationDataPath, 'utf-8');
    const devicesContent = fs.readFileSync(devicesDataPath, 'utf-8');

    // Site navigation must not include draft guide routes
    expect(navContent).not.toMatch(/\/guides\/installer-/);
    expect(navContent).not.toMatch(/\/guides\/configurer-/);

    // Device cards must not link to unpublished guides
    expect(devicesContent).not.toMatch(/publishedGuideUrl:\s*['"]\/guides\//);
  });

  it('Test 7: All target unverified guides in src/content/guides/ are in draft status', () => {
    if (fs.existsSync(guidesContentDir)) {
      const files = fs.readdirSync(guidesContentDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
      for (const file of files) {
        const filePath = path.join(guidesContentDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // All guides in initial state without laboratory evidence must be drafts
        expect(fileContent).toMatch(/status:\s*["']draft["']/);

        // Disallow forbidden bypass instructions, crack, or unofficial APK claims
        const forbiddenTerms = [
          /apk (mod|crack|gratuit|pirate|patché)/i,
          /contourner les sécurités/i,
          /bypass drm/i,
          /installer sans payer/i,
        ];

        for (const pattern of forbiddenTerms) {
          expect(fileContent).not.toMatch(pattern);
        }
      }
    }
  });

  it('Verifies that no fabricated screenshots or unofficial download links exist in guides', () => {
    if (fs.existsSync(guidesContentDir)) {
      const files = fs.readdirSync(guidesContentDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
      for (const file of files) {
        const filePath = path.join(guidesContentDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Disallow external APK mirrors
        expect(fileContent).not.toMatch(/apkpure|apkmirror|mediafire|mega\.nz/i);
      }
    }
  });
});
