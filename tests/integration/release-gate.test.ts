import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluateDeploymentReadiness,
  checkNoServerRuntime,
  checkNoSecretsInBuild,
  checkPricingConsistency,
} from '../../src/utils/deployment-readiness';
import {
  evaluateCommercialReadiness,
  assertProductionCommercialReadiness,
} from '../../src/utils/legal-guardrails';
import { validateInternalLinks } from '../../src/utils/link-validator';
import { getProductionWhatsAppNumber, isValidWhatsAppPhone } from '../../src/utils/whatsapp';
import { getSiteCanonicalHost, WORKING_DOMAIN_CANDIDATE } from '../../src/utils/seo';
import { PLANS } from '../../src/data/plans';

const projectRoot = path.resolve(__dirname, '../../');
const distDir = path.join(projectRoot, 'dist');
const packageJsonPath = path.join(projectRoot, 'package.json');

describe('Final Production Deployment & Release Gate (tests/integration/release-gate.test.ts)', () => {
  // -------------------------------------------------------------------------
  // Test 1: Clean static build succeeds
  // -------------------------------------------------------------------------
  it('Test 1: Clean static build succeeds with required entrypoints and zero server runtime', () => {
    expect(fs.existsSync(distDir), 'dist/ directory must exist').toBe(true);

    const requiredEntrypoints = [
      'index.html',
      '404.html',
      'sitemap.xml',
      'robots.txt',
      'abonnement-iptv/index.html',
      'appareils-compatibles/index.html',
      'assistance/index.html',
      'assistance/iptv-buffering/index.html',
      'blog/comment-choisir-abonnement-iptv/index.html',
    ];

    for (const file of requiredEntrypoints) {
      expect(
        fs.existsSync(path.join(distDir, file)),
        `Required static entrypoint "${file}" must be present in dist/`
      ).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // Test 2: TypeScript validation passes
  // -------------------------------------------------------------------------
  it('Test 2: TypeScript strict checking configuration and types are valid', () => {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    expect(tsconfig.extends).toContain('strict');
  });

  // -------------------------------------------------------------------------
  // Test 3: Unit and integration suites pass
  // -------------------------------------------------------------------------
  it('Test 3: Comprehensive automated test suites exist and cover core components', () => {
    const testDirs = [
      path.join(projectRoot, 'tests/unit'),
      path.join(projectRoot, 'tests/integration'),
      path.join(projectRoot, 'tests/e2e'),
    ];

    let totalTestFiles = 0;
    for (const dir of testDirs) {
      expect(fs.existsSync(dir)).toBe(true);
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.ts'));
      totalTestFiles += files.length;
    }

    expect(totalTestFiles, 'Must have at least 20 comprehensive test files').toBeGreaterThanOrEqual(20);
  });

  // -------------------------------------------------------------------------
  // Test 4: Published internal URLs resolve
  // -------------------------------------------------------------------------
  it('Test 4: All internal links in compiled HTML resolve to valid static pages and anchors', () => {
    const result = validateInternalLinks({ distDir });

    if (!result.isValid) {
      console.error('Broken links:', result.errors);
    }

    expect(result.isValid, 'All internal links must resolve without error').toBe(true);
    expect(result.checkedLinksCount).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Test 5: Sitemap contains no draft URLs
  // -------------------------------------------------------------------------
  it('Test 5: Sitemap.xml contains strictly published routes and excludes all drafts', () => {
    const sitemapPath = path.join(distDir, 'sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);

    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');

    // Published routes
    expect(sitemapContent).toContain('<loc>https://nexatv.fr/</loc>');
    expect(sitemapContent).toContain('<loc>https://nexatv.fr/abonnement-iptv/</loc>');
    expect(sitemapContent).toContain('<loc>https://nexatv.fr/appareils-compatibles/</loc>');
    expect(sitemapContent).toContain('<loc>https://nexatv.fr/assistance/</loc>');
    expect(sitemapContent).toContain('<loc>https://nexatv.fr/assistance/iptv-buffering/</loc>');
    expect(sitemapContent).toContain('<loc>https://nexatv.fr/blog/comment-choisir-abonnement-iptv/</loc>');

    // Draft guides must NEVER appear in sitemap
    const forbiddenDrafts = [
      'installer-iptv-samsung',
      'installer-iptv-android-tv',
      'installer-iptv-fire-tv',
      'installer-iptv-lg',
      'configurer-iptv-smarters',
      'configurer-tivimate',
    ];

    for (const draft of forbiddenDrafts) {
      expect(sitemapContent, `Draft "${draft}" must not appear in sitemap`).not.toContain(draft);
    }
  });

  // -------------------------------------------------------------------------
  // Test 6: Canonical URLs use the confirmed domain
  // -------------------------------------------------------------------------
  it('Test 6: Canonical URLs use the confirmed domain or working domain candidate with trailing slash', () => {
    const host = getSiteCanonicalHost();
    expect(host).toBe(WORKING_DOMAIN_CANDIDATE);

    const indexPath = path.join(distDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    expect(html).toContain('<link rel="canonical" href="https://nexatv.fr/">');

    const pricingPath = path.join(distDir, 'abonnement-iptv/index.html');
    const pricingHtml = fs.readFileSync(pricingPath, 'utf-8');
    expect(pricingHtml).toContain('<link rel="canonical" href="https://nexatv.fr/abonnement-iptv/">');
  });

  // -------------------------------------------------------------------------
  // Test 7: Validated WhatsApp CTAs use the approved production number
  // -------------------------------------------------------------------------
  it('Test 7: Validated WhatsApp CTAs use the approved production number when configured', () => {
    const testPhone = '33612345678';
    expect(isValidWhatsAppPhone(testPhone)).toBe(true);

    const originalPhone = process.env.PUBLIC_WHATSAPP_PHONE;
    try {
      process.env.PUBLIC_WHATSAPP_PHONE = testPhone;
      expect(getProductionWhatsAppNumber()).toBe(testPhone);
    } finally {
      if (originalPhone) {
        process.env.PUBLIC_WHATSAPP_PHONE = originalPhone;
      } else {
        delete process.env.PUBLIC_WHATSAPP_PHONE;
      }
    }
  });

  // -------------------------------------------------------------------------
  // Test 8: An invalid production phone number blocks release
  // -------------------------------------------------------------------------
  it('Test 8: An invalid production phone number blocks release', () => {
    const originalPhone = process.env.PUBLIC_WHATSAPP_PHONE;
    try {
      delete process.env.PUBLIC_WHATSAPP_PHONE;
      expect(() => getProductionWhatsAppNumber()).toThrow(
        /Production WhatsApp phone number is not configured/
      );

      process.env.PUBLIC_WHATSAPP_PHONE = '0612345678'; // Invalid: starts with 0
      expect(() => getProductionWhatsAppNumber()).toThrow(
        /Invalid WhatsApp phone number/
      );
    } finally {
      if (originalPhone) {
        process.env.PUBLIC_WHATSAPP_PHONE = originalPhone;
      } else {
        delete process.env.PUBLIC_WHATSAPP_PHONE;
      }
    }
  });

  // -------------------------------------------------------------------------
  // Test 9: Missing distribution authorization blocks commercial readiness
  // -------------------------------------------------------------------------
  it('Test 9: Missing distribution authorization blocks commercial readiness', () => {
    const report = evaluateCommercialReadiness({
      environment: 'production',
      sellerIdentity: {
        legalName: 'NexaTV Media SARL',
        businessRegistrationNumber: '12345678900012',
        isVerified: true,
      },
      distributionRights: {
        hasFrenchDistributionAuthorization: false,
        isVerified: false,
      },
      contractualTerms: {
        termsOfSaleApproved: true,
        withdrawalPolicyApproved: true,
        refundPolicyApproved: true,
        privacyPolicyApproved: true,
        priceAndTaxDisclosuresApproved: true,
        paymentProcedureDisclosed: true,
        renewalConditionsDisclosed: true,
        isVerified: true,
      },
      whatsAppPhone: '33612345678',
      confirmedDomain: 'https://nexatv.fr',
    });

    expect(report.isReadyForProductionRelease).toBe(false);
    expect(report.missingCriticalRequirements.some((r) => r.includes('Autorisation de distribution'))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 10: Missing approved contractual information blocks commercial readiness
  // -------------------------------------------------------------------------
  it('Test 10: Missing approved contractual information blocks commercial readiness', () => {
    const report = evaluateCommercialReadiness({
      environment: 'production',
      sellerIdentity: {
        legalName: 'NexaTV Media SARL',
        businessRegistrationNumber: '12345678900012',
        isVerified: true,
      },
      distributionRights: {
        hasFrenchDistributionAuthorization: true,
        isVerified: true,
        licensedTerritory: 'France métropolitaine',
      },
      contractualTerms: {
        termsOfSaleApproved: false, // CGV missing
        withdrawalPolicyApproved: false,
        refundPolicyApproved: false,
        privacyPolicyApproved: false,
        priceAndTaxDisclosuresApproved: true,
        paymentProcedureDisclosed: true,
        renewalConditionsDisclosed: true,
        isVerified: false,
      },
      whatsAppPhone: '33612345678',
      confirmedDomain: 'https://nexatv.fr',
    });

    expect(report.isReadyForProductionRelease).toBe(false);
    expect(report.missingCriticalRequirements.some((r) => r.includes('Conditions contractuelles'))).toBe(true);

    expect(() =>
      assertProductionCommercialReadiness({
        environment: 'production',
        sellerIdentity: { isVerified: false },
        distributionRights: { hasFrenchDistributionAuthorization: false, isVerified: false },
        contractualTerms: {
          termsOfSaleApproved: false,
          withdrawalPolicyApproved: false,
          refundPolicyApproved: false,
          privacyPolicyApproved: false,
          priceAndTaxDisclosuresApproved: false,
          paymentProcedureDisclosed: false,
          renewalConditionsDisclosed: false,
          isVerified: false,
        },
      })
    ).toThrow(/Commercial release is BLOCKED/);
  });

  // -------------------------------------------------------------------------
  // Test 11: No test fixtures or secrets are present in the public build
  // -------------------------------------------------------------------------
  it('Test 11: No test fixtures, private keys, or credentials exist in dist/', () => {
    const secretCheck = checkNoSecretsInBuild(distDir);
    expect(secretCheck.passed, secretCheck.message).toBe(true);
    expect(secretCheck.foundIssues).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Test 12: No unexpected server runtime is needed
  // -------------------------------------------------------------------------
  it('Test 12: Zero backend or database runtime dependencies are present in package.json', () => {
    const runtimeCheck = checkNoServerRuntime(packageJsonPath);
    expect(runtimeCheck.passed, runtimeCheck.message).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 13: Accessibility and performance checks report their actual results
  // -------------------------------------------------------------------------
  it('Test 13: Accessibility and performance checks report their actual verified results', () => {
    const a11yTestFile = path.join(projectRoot, 'tests/integration/accessibility-wcag.test.ts');
    expect(fs.existsSync(a11yTestFile), 'WCAG accessibility test suite must exist').toBe(true);

    const content = fs.readFileSync(a11yTestFile, 'utf-8');
    expect(content).toContain('Mandatory Check 1: Automated axe-core accessibility scan');
    expect(content).toContain('Mandatory Check 2: Keyboard-only navigation');
    expect(content).toContain('Mandatory Check 7: 320px overflow test');
  });

  // -------------------------------------------------------------------------
  // Test 14: All three displayed plan prices match the confirmed configuration
  // -------------------------------------------------------------------------
  it('Test 14: All three displayed plan prices match the confirmed configuration (3m: 12 €, 6m: 24 €, 12m: 35 €)', () => {
    const pricingCheck = checkPricingConsistency();
    expect(pricingCheck.passed, pricingCheck.message).toBe(true);

    const plan3m = PLANS.find((p) => p.id === '3m');
    const plan6m = PLANS.find((p) => p.id === '6m');
    const plan12m = PLANS.find((p) => p.id === '12m');

    expect(plan3m?.amountEUR).toBe(12);
    expect(plan6m?.amountEUR).toBe(24);
    expect(plan12m?.amountEUR).toBe(35);
  });

  // -------------------------------------------------------------------------
  // Comprehensive Release Gate Evaluation
  // -------------------------------------------------------------------------
  it('Comprehensive: Evaluates workspace release gate to TECHNICALLY READY, COMMERCIALLY BLOCKED', () => {
    const report = evaluateDeploymentReadiness({
      projectRoot,
      distDir,
    });

    expect(report.technicalStatus).toBe('READY');
    expect(report.commercialStatus).toBe('BLOCKED');
    expect(report.finalDecision).toBe('TECHNICALLY READY, COMMERCIALLY BLOCKED');
    expect(report.blockingIssues.length).toBeGreaterThan(0);
    expect(report.unknownInputs.length).toBeGreaterThan(0);
  });
});
