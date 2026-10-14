import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { guideSchema, blogSchema } from './content/schemas';

export * from './content/schemas';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: guideSchema,
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: blogSchema,
});

export const collections = { guides, blog };
