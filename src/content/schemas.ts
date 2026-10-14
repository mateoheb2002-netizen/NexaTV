import { z } from 'astro/zod';

export type ContentStatus = 'draft' | 'published';

/**
 * Base article schema contract for all NexaTV editorial and guide content.
 * Enforces real dates, required titles, descriptions and categories.
 */
export const baseArticleSchema = z
  .object({
    title: z.string().min(5, 'Le titre doit comporter au moins 5 caractères.'),
    description: z.string().min(10, 'La description doit comporter au moins 10 caractères.'),
    slug: z.string().min(2, 'Le slug est obligatoire.'),
    status: z.enum(['draft', 'published']),
    publishedAt: z.coerce.date().nullable(),
    updatedAt: z.coerce.date().nullable().optional(),
    category: z.string().min(2, 'La catégorie est obligatoire.'),
    author: z.string().optional(),
    verifiedDeviceModel: z.string().optional(),
    verifiedOSVersion: z.string().optional(),
    verifiedApplication: z.string().optional(),
  })
  .refine(
    (data) => {
      // Rule: Published content must have a valid publication date
      if (data.status === 'published' && !data.publishedAt) {
        return false;
      }
      return true;
    },
    {
      message: 'Un article avec le statut "published" doit obligatoirement avoir une date de publication (publishedAt) non nulle.',
      path: ['publishedAt'],
    }
  );

/**
 * Specific schema for device installation and troubleshooting guides.
 * Prevents premature publication of guides whose technical validation is incomplete.
 */
export const guideSchema = baseArticleSchema
  .extend({
    verifiedDeviceFamily: z.string().optional(),
    hasReproducibleSteps: z.boolean().optional(),
    hasApprovedEvidence: z.boolean().optional(),
    officialDocUrl: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'published') {
        if (!data.verifiedApplication || data.verifiedApplication.trim().length === 0) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'Un guide d\'appareil publié doit obligatoirement spécifier l\'application vérifiée (verifiedApplication).',
      path: ['verifiedApplication'],
    }
  )
  .refine(
    (data) => {
      if (data.status === 'published') {
        if (!data.verifiedOSVersion || data.verifiedOSVersion.trim().length === 0) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'Un guide d\'appareil publié doit obligatoirement spécifier la version du système d\'exploitation vérifiée (verifiedOSVersion).',
      path: ['verifiedOSVersion'],
    }
  )
  .refine(
    (data) => {
      if (data.status === 'published') {
        if (!data.hasReproducibleSteps) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'Un guide d\'appareil publié doit contenir des étapes reproductibles validées (hasReproducibleSteps: true).',
      path: ['hasReproducibleSteps'],
    }
  )
  .refine(
    (data) => {
      if (data.status === 'published') {
        if (!data.hasApprovedEvidence) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'Un guide d\'appareil publié doit disposer d\'une preuve de test approuvée (hasApprovedEvidence: true).',
      path: ['hasApprovedEvidence'],
    }
  );

export const blogSchema = baseArticleSchema;

export type BaseArticleFrontmatter = z.infer<typeof baseArticleSchema>;
export type GuideFrontmatter = z.infer<typeof guideSchema>;
export type BlogFrontmatter = z.infer<typeof blogSchema>;
