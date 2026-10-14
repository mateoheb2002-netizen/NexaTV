import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');
const distDir = path.join(projectRoot, 'dist');
const TARGET_PHONE = '33601384612';

describe('Active WhatsApp CTAs Integration Test (Target: +330601384612 -> 33601384612)', () => {
  it('Test 1: Homepage (dist/index.html) has active WhatsApp CTAs for all plans and intents', () => {
    const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

    // Expected target base
    expect(html).toContain(`https://wa.me/${TARGET_PHONE}?text=`);

    // Verify all 3 plan CTAs point to the target phone
    expect(html).toContain(`data-cta-intent="pricing_3m"`);
    expect(html).toContain(`data-cta-intent="pricing_6m"`);
    expect(html).toContain(`data-cta-intent="pricing_12m"`);

    // Verify all CTAs are active and configured
    expect(html).not.toContain('data-cta-status="unconfigured"');
    expect(html).not.toContain('aria-disabled="true"');
  });

  it('Test 2: Pricing page (dist/abonnement-iptv/index.html) has active WhatsApp CTAs for all plans', () => {
    const html = fs.readFileSync(path.join(distDir, 'abonnement-iptv/index.html'), 'utf-8');

    expect(html).toContain(`https://wa.me/${TARGET_PHONE}?text=`);
    expect(html).toContain(`data-cta-intent="pricing_3m"`);
    expect(html).toContain(`data-cta-intent="pricing_6m"`);
    expect(html).toContain(`data-cta-intent="pricing_12m"`);
    expect(html).not.toContain('data-cta-status="unconfigured"');
  });

  it('Test 3: Devices page (dist/appareils-compatibles/index.html) drives device checks to WhatsApp', () => {
    const html = fs.readFileSync(path.join(distDir, 'appareils-compatibles/index.html'), 'utf-8');

    expect(html).toContain(`https://wa.me/${TARGET_PHONE}?text=`);
    expect(html).toContain(`data-cta-intent="device_check"`);
    expect(html).not.toContain('data-cta-status="unconfigured"');
  });

  it('Test 4: Assistance hub (dist/assistance/index.html) drives technical support to WhatsApp', () => {
    const html = fs.readFileSync(path.join(distDir, 'assistance/index.html'), 'utf-8');

    expect(html).toContain(`https://wa.me/${TARGET_PHONE}?text=`);
    expect(html).toContain(`data-cta-intent="technical_support"`);
    expect(html).not.toContain('data-cta-status="unconfigured"');
  });

  it('Test 5: Educational article and guide drive questions to WhatsApp', () => {
    const articleHtml = fs.readFileSync(
      path.join(distDir, 'blog/comment-choisir-abonnement-iptv/index.html'),
      'utf-8'
    );
    expect(articleHtml).toContain(`https://wa.me/${TARGET_PHONE}?text=`);
    expect(articleHtml).toContain(`data-cta-intent="article_question"`);
    expect(articleHtml).not.toContain('data-cta-status="unconfigured"');

    const guideHtml = fs.readFileSync(
      path.join(distDir, 'assistance/iptv-buffering/index.html'),
      'utf-8'
    );
    expect(guideHtml).toContain(`https://wa.me/${TARGET_PHONE}?text=`);
    expect(guideHtml).toContain(`data-cta-intent="technical_support"`);
    expect(guideHtml).not.toContain('data-cta-status="unconfigured"');
  });

  it('Test 6: 404 error page (dist/404.html) includes active support WhatsApp link', () => {
    const html = fs.readFileSync(path.join(distDir, '404.html'), 'utf-8');

    expect(html).toContain(`https://wa.me/${TARGET_PHONE}?text=`);
    expect(html).toContain(`data-cta-intent="technical_support"`);
    expect(html).not.toContain('data-cta-status="unconfigured"');
  });

  it('Test 7: Every HTML page contains zero disabled or unconfigured WhatsApp CTA', () => {
    const htmlFiles = [
      'index.html',
      'abonnement-iptv/index.html',
      'appareils-compatibles/index.html',
      'assistance/index.html',
      'blog/comment-choisir-abonnement-iptv/index.html',
      'assistance/iptv-buffering/index.html',
      '404.html',
    ];

    for (const relPath of htmlFiles) {
      const fullPath = path.join(distDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      expect(content).not.toContain('data-cta-status="unconfigured"');
      expect(content).not.toContain('aria-disabled="true"');
      expect(content).toContain(`href="https://wa.me/${TARGET_PHONE}`);
    }
  });

  it('Test 8: astro.config.mjs ensures fallback to approved production WhatsApp phone number', async () => {
    const configPath = path.join(projectRoot, 'astro.config.mjs');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain(TARGET_PHONE);
    expect(content).toContain('PUBLIC_WHATSAPP_PHONE');
  });
});

