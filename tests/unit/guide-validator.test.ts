import { describe, it, expect } from 'vitest';
import { validateGuideReadiness } from '../../src/utils/guide-validator';
import { guideSchema } from '../../src/content/schemas';

describe('Guide Publication Readiness Gate (src/utils/guide-validator.ts & guideSchema)', () => {
  const completeApprovedGuide = {
    title: 'Installer un lecteur IPTV sur Samsung Smart TV (Tizen)',
    description: 'Procédure testée et vérifiée en laboratoire sur Samsung Tizen 6.5.',
    slug: 'installer-iptv-samsung',
    status: 'published' as const,
    publishedAt: new Date('2026-10-14T00:00:00Z'),
    updatedAt: null,
    category: 'Guides TV',
    verifiedDeviceModel: 'Samsung QN90A',
    verifiedDeviceFamily: 'Samsung Smart TV',
    verifiedOSVersion: 'Tizen 6.5',
    verifiedApplication: 'Lecteur certifié v2.1',
    hasReproducibleSteps: true,
    hasApprovedEvidence: true,
  };

  it('Test 1: Guide without verified application cannot publish', () => {
    const withoutApp = {
      ...completeApprovedGuide,
      verifiedApplication: '',
    };

    const validationResult = validateGuideReadiness(withoutApp);
    expect(validationResult.canPublish).toBe(false);
    expect(validationResult.missingEvidence).toContain('verifiedApplication');

    // Also fails zod guideSchema
    const schemaResult = guideSchema.safeParse(withoutApp);
    expect(schemaResult.success).toBe(false);
  });

  it('Test 2: Guide missing OS information cannot publish', () => {
    const withoutOS = {
      ...completeApprovedGuide,
      verifiedOSVersion: '',
    };

    const validationResult = validateGuideReadiness(withoutOS);
    expect(validationResult.canPublish).toBe(false);
    expect(validationResult.missingEvidence).toContain('verifiedOSVersion');

    const schemaResult = guideSchema.safeParse(withoutOS);
    expect(schemaResult.success).toBe(false);
  });

  it('Test 3: Guide missing reproducible steps cannot publish', () => {
    const withoutSteps = {
      ...completeApprovedGuide,
      hasReproducibleSteps: false,
    };

    const validationResult = validateGuideReadiness(withoutSteps);
    expect(validationResult.canPublish).toBe(false);
    expect(validationResult.missingEvidence).toContain('hasReproducibleSteps');

    const schemaResult = guideSchema.safeParse(withoutSteps);
    expect(schemaResult.success).toBe(false);
  });

  it('Test 4: Guide with complete approved evidence is eligible for publication', () => {
    const validationResult = validateGuideReadiness(completeApprovedGuide);
    expect(validationResult.canPublish).toBe(true);
    expect(validationResult.errors).toHaveLength(0);

    const schemaResult = guideSchema.safeParse(completeApprovedGuide);
    expect(schemaResult.success).toBe(true);
  });

  it('Unverified guides remain drafts without triggering errors', () => {
    const draftGuide = {
      title: 'Guide en cours de test',
      description: 'Documentation préliminaire non encore validée par le laboratoire.',
      slug: 'guide-test',
      status: 'draft' as const,
      publishedAt: null,
      updatedAt: null,
      category: 'Brouillons',
      verifiedDeviceFamily: 'LG Smart TV',
      hasApprovedEvidence: false,
    };

    // A draft does not claim publication readiness
    const validationResult = validateGuideReadiness(draftGuide);
    expect(validationResult.canPublish).toBe(false);

    // Schema accepts drafts with partial evidence
    const schemaResult = guideSchema.safeParse(draftGuide);
    expect(schemaResult.success).toBe(true);
  });
});
