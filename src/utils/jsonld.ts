/**
 * Structured Data JSON-LD engine for NexaTV.
 *
 * Implements schema.org vocabulary strictly aligned with visible content.
 * Strictly adheres to project constraints:
 * - No fake ratings or reviews (AggregateRating / Review)
 * - No invented organization legal identities without evidence
 * - No fabricated product availability or shipping
 * - No guaranteed rich-result claims
 */

import type { Plan } from '../data/plans';
import { ensureTrailingSlash } from './url';

export interface VerifiedOrganizationData {
  legalName: string;
  url: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface WebSiteSchemaOptions {
  siteUrl: string;
  siteName?: string;
}

export interface ProductOffersSchemaOptions {
  siteUrl: string;
  plans: readonly Plan[];
  currency?: string;
}

export interface ArticleSchemaOptions {
  title: string;
  description: string;
  canonicalUrl: string;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  author?: string;
  category?: string;
}

export interface BreadcrumbItemInput {
  label: string;
  href?: string;
}

export interface FAQItemInput {
  question: string;
  answer: string;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  richResultGuaranteed: false;
}

/**
 * Generates WebSite schema.
 */
export function generateWebSiteSchema(options: WebSiteSchemaOptions): Record<string, any> {
  const cleanUrl = ensureTrailingSlash(options.siteUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${cleanUrl}#website`,
    url: cleanUrl,
    name: options.siteName || 'NexaTV',
    inLanguage: 'fr-FR',
  };
}

/**
 * Generates Organization schema only when verified legal identity data is present.
 * Returns null if data is insufficient to prevent emitting fabricated entities.
 */
export function generateOrganizationSchema(
  orgData?: VerifiedOrganizationData | null
): Record<string, any> | null {
  if (!orgData || !orgData.legalName || orgData.legalName.trim() === '' || !orgData.url) {
    return null;
  }

  const cleanUrl = ensureTrailingSlash(orgData.url);
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${cleanUrl}#organization`,
    name: orgData.legalName,
    legalName: orgData.legalName,
    url: cleanUrl,
  };

  if (orgData.email) {
    schema.email = orgData.email;
  }
  if (orgData.phone) {
    schema.telephone = orgData.phone;
  }
  if (orgData.address) {
    schema.address = orgData.address;
  }

  return schema;
}

/**
 * Generates Product / Offer schema strictly from confirmed plans.
 * Never includes fake availability, ratings, or shipping info.
 */
export function generateProductOffersSchema(
  options: ProductOffersSchemaOptions
): Record<string, any> {
  const cleanUrl = ensureTrailingSlash(options.siteUrl);
  const currency = options.currency || 'EUR';

  const offers = options.plans.map((plan) => {
    return {
      '@type': 'Offer',
      '@id': `${cleanUrl}abonnement-iptv/#offer-${plan.id}`,
      name: `Formule ${plan.displayName} (${plan.durationMonths} mois)`,
      price: plan.amountEUR,
      priceCurrency: currency,
      url: `${cleanUrl}abonnement-iptv/`,
      category: 'TelevisionSubscription',
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${cleanUrl}abonnement-iptv/#product`,
    name: 'Abonnement IPTV NexaTV',
    description:
      "Formules d'abonnement IPTV en France métropolitaine sans engagement et sans reconduction tacite.",
    offers,
  };
}

/**
 * Generates Article schema using real editorial publication dates.
 */
export function generateArticleSchema(options: ArticleSchemaOptions): Record<string, any> {
  const cleanUrl = ensureTrailingSlash(options.canonicalUrl);
  const publishedDate = options.publishedAt instanceof Date
    ? options.publishedAt.toISOString()
    : options.publishedAt || null;

  const modifiedDate = options.updatedAt instanceof Date
    ? options.updatedAt.toISOString()
    : options.updatedAt || publishedDate;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${cleanUrl}#article`,
    headline: options.title,
    description: options.description,
    url: cleanUrl,
    inLanguage: 'fr-FR',
    ...(publishedDate ? { datePublished: publishedDate } : {}),
    ...(modifiedDate ? { dateModified: modifiedDate } : {}),
    author: {
      '@type': 'Organization',
      name: options.author || 'Équipe NexaTV',
    },
    publisher: {
      '@type': 'Organization',
      name: 'NexaTV',
    },
  };
}

/**
 * Generates BreadcrumbList schema matching visible breadcrumb navigation.
 */
export function generateBreadcrumbListSchema(
  items: BreadcrumbItemInput[],
  siteUrl: string
): Record<string, any> {
  const cleanSiteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

  const itemListElement = items.map((item, index) => {
    const element: Record<string, any> = {
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
    };

    if (item.href) {
      if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
        element.item = ensureTrailingSlash(item.href);
      } else {
        const cleanPath = item.href.startsWith('/') ? item.href : `/${item.href}`;
        element.item = ensureTrailingSlash(`${cleanSiteUrl}${cleanPath}`);
      }
    }

    return element;
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
}

/**
 * Generates FAQPage schema corresponding strictly to visible FAQs.
 */
export function generateFAQPageSchema(faqs: FAQItemInput[]): Record<string, any> {
  const mainEntity = faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

/**
 * Validates schema integrity and asserts that rich-result eligibility
 * is never falsely guaranteed (since display is at the search engine's sole discretion).
 */
export function validateSchemaIntegrity(schema: Record<string, any>): SchemaValidationResult {
  const errors: string[] = [];

  if (schema['@context'] !== 'https://schema.org') {
    errors.push('Le @context doit être strictement "https://schema.org".');
  }

  if (!schema['@type']) {
    errors.push('Le @type est obligatoire.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    richResultGuaranteed: false,
  };
}
