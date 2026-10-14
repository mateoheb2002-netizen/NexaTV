// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Ensure confirmed production WhatsApp contact phone number is available for static build
if (!process.env.PUBLIC_WHATSAPP_PHONE) {
  process.env.PUBLIC_WHATSAPP_PHONE = '33601384612';
}

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://nexatv.fr',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx()],
  build: {
    format: 'directory',
  },
  vite: {
    define: {
      'import.meta.env.PUBLIC_WHATSAPP_PHONE': JSON.stringify(
        process.env.PUBLIC_WHATSAPP_PHONE || '33601384612'
      ),
    },
  },
});
