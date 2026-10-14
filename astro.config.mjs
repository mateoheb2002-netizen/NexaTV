// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://nexatv.fr',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx()],
  build: {
    format: 'directory',
  },
});
