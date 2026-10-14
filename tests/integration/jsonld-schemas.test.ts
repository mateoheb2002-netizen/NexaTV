import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateProductOffersSchema,
  generateArticleSchema,
  generateBreadcrumbListSchema,
  generateFAQPageSchema,
  validateSchemaIntegrity,
  type VerifiedOrganizationData,
} from '../../src/utils/jsonld';
import { PLANS } from '../../src/data/plans';

const projectRoot = path.resolve(__dirname, '../../');
const distDir = path.join(projectRoot, 'dist');

describe('Structured Data JSON-LD (schema.org conformance & defensiveness)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('Test 1: Generated JSON parses successfully from build output', () => {
    const htmlFiles = [
      'index.html',
      'abonnement-iptv/index.html',
      'assistance/index.html',
      'assistance/iptv-buffering/index.html',
      'blog/comment-choisir-abonnement-iptv/index.html',
    ];

    for (const relFile of htmlFiles) {
      const filePath = path.join(distDir, relFile);
      expect(fs.existsSync(filePath), `${relFile} must exist in dist/`).toBe(true);

      const html = fs.readFileSync(filePath, 'utf-8');
      const jsonLdMatches = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

      expect(jsonLdMatches, `Page ${relFile} must have JSON-LD script tag`).not.toBeNull();
      for (const tag of jsonLdMatches!) {
        const jsonContent = tag.replace(/<script\b[^>]*>|<\/script>/gi, '').trim();
        expect(() => JSON.parse(jsonContent), `JSON-LD in ${relFile} must be valid JSON`).not.toThrow();
        const parsed = JSON.parse(jsonContent);
        expect(parsed['@context']).toBe('https://schema.org');
      }
    }
  });

  it('Test 2: WebSite URL matches production configuration', () => {
    process.env.PUBLIC_SITE_URL = 'https://nexatv.fr';

    const schema = generateWebSiteSchema({
      siteUrl: 'https://nexatv.fr',
      siteName: 'NexaTV',
    });

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebSite');
    expect(schema.name).toBe('NexaTV');
    expect(schema.url).toBe('https://nexatv.fr/');
  });

  it('Test 3: No Organization schema is emitted without sufficient identity data', () => {
    // Empty, undefined, or missing legal identity data
    expect(generateOrganizationSchema(null)).toBeNull();
    expect(generateOrganizationSchema(undefined)).toBeNull();

    const incompleteOrg: VerifiedOrganizationData = {
      legalName: '',
      url: 'https://nexatv.fr/',
    };
    expect(generateOrganizationSchema(incompleteOrg)).toBeNull();

    // When valid and sufficient verified data is supplied
    const validOrg: VerifiedOrganizationData = {
      legalName: 'NexaTV Media SAS',
      url: 'https://nexatv.fr/',
      email: 'contact@nexatv.fr',
    };
    const schema = generateOrganizationSchema(validOrg);
    expect(schema).not.toBeNull();
    expect(schema!['@type']).toBe('Organization');
    expect(schema!.legalName).toBe('NexaTV Media SAS');
  });

  it('Test 4: Offer schema, when enabled, contains the correct confirmed price and EUR currency', () => {
    const productSchema = generateProductOffersSchema({
      siteUrl: 'https://nexatv.fr',
      plans: PLANS,
      currency: 'EUR',
    });

    expect(productSchema['@context']).toBe('https://schema.org');
    expect(productSchema['@type']).toBe('Product');
    expect(productSchema.name).toContain('NexaTV');
    expect(Array.isArray(productSchema.offers)).toBe(true);
    expect(productSchema.offers).toHaveLength(3);

    // Verify each plan corresponds strictly to src/data/plans.ts
    const plan3m = productSchema.offers.find((o: any) => o.name.includes('Découverte') || o.name.includes('3 mois'));
    expect(plan3m).toBeDefined();
    expect(plan3m.price).toBe(12);
    expect(plan3m.priceCurrency).toBe('EUR');

    const plan6m = productSchema.offers.find((o: any) => o.name.includes('Standard') || o.name.includes('6 mois'));
    expect(plan6m).toBeDefined();
    expect(plan6m.price).toBe(24);
    expect(plan6m.priceCurrency).toBe('EUR');

    const plan12m = productSchema.offers.find((o: any) => o.name.includes('Annuel') || o.name.includes('12 mois'));
    expect(plan12m).toBeDefined();
    expect(plan12m.price).toBe(35);
    expect(plan12m.priceCurrency).toBe('EUR');

    // Never fabricates fake availability or physical shipping
    for (const offer of productSchema.offers) {
      expect(offer.shippingDetails).toBeUndefined();
    }
  });

  it('Test 5: Article schema uses real published dates', () => {
    const articleDate = new Date('2026-10-10T00:00:00.000Z');
    const articleSchema = generateArticleSchema({
      title: 'Comment bien choisir son abonnement IPTV en France',
      description: 'Guide comparatif objectif pour choisir son abonnement IPTV.',
      canonicalUrl: 'https://nexatv.fr/blog/comment-choisir-abonnement-iptv/',
      publishedAt: articleDate,
      author: 'Équipe NexaTV',
      category: "Guide d'achat",
    });

    expect(articleSchema['@context']).toBe('https://schema.org');
    expect(articleSchema['@type']).toBe('Article');
    expect(articleSchema.headline).toBe('Comment bien choisir son abonnement IPTV en France');
    expect(articleSchema.datePublished).toBe(articleDate.toISOString());
    expect(articleSchema.author).toEqual({
      '@type': 'Organization',
      name: 'Équipe NexaTV',
    });
  });

  it('Test 6: BreadcrumbList matches visible links', () => {
    const breadcrumbs = [
      { label: 'Accueil', href: '/' },
      { label: 'Assistance', href: '/assistance/' },
      { label: 'Résoudre le buffering' },
    ];

    const breadcrumbSchema = generateBreadcrumbListSchema(breadcrumbs, 'https://nexatv.fr');
    expect(breadcrumbSchema['@context']).toBe('https://schema.org');
    expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');
    expect(breadcrumbSchema.itemListElement).toHaveLength(3);

    expect(breadcrumbSchema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Accueil',
      item: 'https://nexatv.fr/',
    });

    expect(breadcrumbSchema.itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'Assistance',
      item: 'https://nexatv.fr/assistance/',
    });

    expect(breadcrumbSchema.itemListElement[2]).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: 'Résoudre le buffering',
    });
  });

  it('Test 7: FAQPage contains only visible FAQ questions', () => {
    const sampleFaqs = [
      {
        question: 'Comment choisir entre 3 et 12 mois ?',
        answer: 'La formule 3 mois offre un coût d entrée réduit...',
      },
      {
        question: 'Le paiement est-il automatique ?',
        answer: 'Non, aucun renouvellement automatique n est appliqué.',
      },
    ];

    const faqSchema = generateFAQPageSchema(sampleFaqs);
    expect(faqSchema['@context']).toBe('https://schema.org');
    expect(faqSchema['@type']).toBe('FAQPage');
    expect(faqSchema.mainEntity).toHaveLength(2);

    expect(faqSchema.mainEntity[0].name).toBe('Comment choisir entre 3 et 12 mois ?');
    expect(faqSchema.mainEntity[0].acceptedAnswer.text).toContain('coût d entrée réduit');
  });

  it('Test 8: No AggregateRating or Review appears without evidence', () => {
    const allHtml = fs.readdirSync(distDir, { recursive: true })
      .filter((file) => typeof file === 'string' && file.endsWith('.html'))
      .map((file) => fs.readFileSync(path.join(distDir, file as string), 'utf-8'))
      .join('\n');

    expect(allHtml).not.toMatch(/"@type"\s*:\s*"AggregateRating"/i);
    expect(allHtml).not.toMatch(/"@type"\s*:\s*"Review"/i);
    expect(allHtml).not.toMatch(/"aggregateRating"/i);
    expect(allHtml).not.toMatch(/"ratingValue"/i);
  });

  it('Test 9: Duplicate schema identifiers (@id) are not generated', () => {
    const htmlFiles = [
      'index.html',
      'abonnement-iptv/index.html',
      'assistance/index.html',
      'assistance/iptv-buffering/index.html',
      'blog/comment-choisir-abonnement-iptv/index.html',
    ];

    for (const relFile of htmlFiles) {
      const html = fs.readFileSync(path.join(distDir, relFile), 'utf-8');
      const jsonLdMatches = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

      if (jsonLdMatches) {
        const ids = new Set<string>();
        for (const tag of jsonLdMatches) {
          const jsonContent = tag.replace(/<script\b[^>]*>|<\/script>/gi, '').trim();
          const parsed = JSON.parse(jsonContent);

          const schemas = Array.isArray(parsed) ? parsed : [parsed];
          for (const s of schemas) {
            if (s['@id']) {
              expect(ids.has(s['@id']), `Duplicate @id ${s['@id']} in ${relFile}`).toBe(false);
              ids.add(s['@id']);
            }
          }
        }
      }
    }
  });

  it('Test 10: Eligible schemas pass validation checks without assuming rich-result eligibility', () => {
    const validation = validateSchemaIntegrity({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Quelle est la vitesse requise ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Au moins 10 à 15 Mbps.',
          },
        },
      ],
    });

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    // Guarantees distinction between valid schema and rich snippet eligibility
    expect(validation.richResultGuaranteed).toBe(false);
  });
});
