import { describe, it, expect } from 'vitest';
import { baseArticleSchema, guideSchema } from '../../src/content/schemas';

describe('Content Collections Schema Validation (src/content.config.ts)', () => {
  it('Test 1: Valid published content passes schema validation', () => {
    const validArticle = {
      title: 'Comment choisir un abonnement IPTV fiable en France',
      description: 'Guide complet pour évaluer la qualité, la légalité et le tarif d’un abonnement IPTV.',
      slug: 'comment-choisir-abonnement-iptv',
      status: 'published',
      publishedAt: new Date('2026-10-10T10:00:00Z'),
      updatedAt: null,
      category: 'Conseils',
    };

    const parsed = baseArticleSchema.safeParse(validArticle);
    expect(parsed.success).toBe(true);
  });

  it('Test 2: Missing title or description fails validation', () => {
    const missingTitle = {
      description: 'Une description sans titre.',
      slug: 'article-sans-titre',
      status: 'draft',
      publishedAt: null,
      updatedAt: null,
      category: 'Conseils',
    };

    const missingDesc = {
      title: 'Un titre sans description',
      slug: 'article-sans-desc',
      status: 'draft',
      publishedAt: null,
      updatedAt: null,
      category: 'Conseils',
    };

    expect(baseArticleSchema.safeParse(missingTitle).success).toBe(false);
    expect(baseArticleSchema.safeParse(missingDesc).success).toBe(false);
  });

  it('Test 8: Published status with null publishedAt date is rejected', () => {
    const publishedWithoutDate = {
      title: 'Article publié sans date réelle',
      description: 'Cet article prétend être publié sans date horodatée valide.',
      slug: 'article-sans-date',
      status: 'published',
      publishedAt: null, // Null date should fail when status is published
      updatedAt: null,
      category: 'Conseils',
    };

    const result = baseArticleSchema.safeParse(publishedWithoutDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('publishedAt');
    }
  });

  it('Test 9: Invalid or incomplete device-guide metadata prevents publication', () => {
    // Guide claims publication with device model but lacks OS version or application
    const incompleteDeviceGuide = {
      title: 'Installer IPTV sur Samsung Smart TV',
      description: 'Procédure pas à pas pour configurer votre téléviseur Samsung.',
      slug: 'installer-iptv-samsung',
      status: 'published',
      publishedAt: new Date('2026-10-12T10:00:00Z'),
      updatedAt: null,
      category: 'Tutoriels',
      verifiedDeviceModel: 'Samsung QN90A',
      // Missing verifiedOSVersion and verifiedApplication
    };

    const result = guideSchema.safeParse(incompleteDeviceGuide);
    expect(result.success).toBe(false);

    // Completely verified device guide succeeds
    const completeDeviceGuide = {
      title: 'Installer IPTV sur Samsung Smart TV',
      description: 'Procédure pas à pas pour configurer votre téléviseur Samsung.',
      slug: 'installer-iptv-samsung',
      status: 'published',
      publishedAt: new Date('2026-10-12T10:00:00Z'),
      updatedAt: null,
      category: 'Tutoriels',
      verifiedDeviceModel: 'Samsung QN90A',
      verifiedOSVersion: 'Tizen 6.5',
      verifiedApplication: 'Lecteur certifié v2.1',
      hasReproducibleSteps: true,
      hasApprovedEvidence: true,
    };

    expect(guideSchema.safeParse(completeDeviceGuide).success).toBe(true);
  });

  it('Drafts allow null dates and partial technical metadata during editorial preparation', () => {
    const draftGuide = {
      title: 'Guide en cours de rédaction',
      description: 'Description temporaire pour le travail éditorial en cours.',
      slug: 'guide-brouillon',
      status: 'draft',
      publishedAt: null,
      updatedAt: null,
      category: 'Brouillons',
      verifiedDeviceModel: 'Modèle à tester',
    };

    const result = guideSchema.safeParse(draftGuide);
    expect(result.success).toBe(true);
  });
});
