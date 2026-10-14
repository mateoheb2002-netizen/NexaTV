import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');

describe('Scaffold Acceptance & Smoke Tests (Integration)', () => {
  it('1. Enforces TypeScript strict checking configuration', () => {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath), 'tsconfig.json must exist').toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    const isStrict =
      tsconfig.extends === 'astro/tsconfigs/strict' ||
      tsconfig.compilerOptions?.strict === true;
    expect(isStrict, 'tsconfig must extend strict or set strict: true').toBe(true);
  });

  it('2. Configures static prerendering and trailingSlash: "always" in astro.config.mjs', () => {
    const astroConfigPath = path.join(projectRoot, 'astro.config.mjs');
    expect(fs.existsSync(astroConfigPath), 'astro.config.mjs must exist').toBe(true);

    const content = fs.readFileSync(astroConfigPath, 'utf-8');
    expect(content).toMatch(/output:\s*['"]static['"]/);
    expect(content).toMatch(/trailingSlash:\s*['"]always['"]/);
  });

  it('3. Creates required architectural directories', () => {
    const requiredDirs = [
      'src/components',
      'src/content/guides',
      'src/content/blog',
      'src/data',
      'src/layouts',
      'src/pages',
      'src/styles',
      'src/utils',
      'tests/unit',
      'tests/integration',
      'tests/e2e',
    ];

    for (const relDir of requiredDirs) {
      const fullPath = path.join(projectRoot, relDir);
      expect(fs.existsSync(fullPath), `Directory ${relDir} should exist`).toBe(true);
    }
  });

  it('4. Configures correct fr/fr-FR language attribute in base layout', () => {
    const layoutPath = path.join(projectRoot, 'src/layouts/Layout.astro');
    expect(fs.existsSync(layoutPath), 'src/layouts/Layout.astro must exist').toBe(true);

    const content = fs.readFileSync(layoutPath, 'utf-8');
    expect(content).toMatch(/<html[^>]*lang=["']fr(-FR)?["']/i);
  });

  it('5. Ensures absence of backend, database, checkout, or server runtime dependencies', () => {
    const pkgPath = path.join(projectRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const forbiddenBackend = [
      '@astrojs/node',
      '@astrojs/deno',
      'express',
      'fastify',
      'prisma',
      '@prisma/client',
      'mongoose',
      'pg',
      'mysql2',
      'stripe',
      '@supabase/supabase-js',
      'firebase',
    ];

    for (const dep of forbiddenBackend) {
      expect(allDeps[dep], `Forbidden backend dependency "${dep}" found`).toBeUndefined();
    }
  });

  it('6. Ensures no unnecessary client framework dependencies (React, Vue, Svelte)', () => {
    const pkgPath = path.join(projectRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const forbiddenFrameworks = [
      'react',
      'react-dom',
      '@astrojs/react',
      'vue',
      '@astrojs/vue',
      'svelte',
      '@astrojs/svelte',
      'solid-js',
      '@astrojs/solid-js',
    ];

    for (const dep of forbiddenFrameworks) {
      expect(allDeps[dep], `Forbidden framework dependency "${dep}" found`).toBeUndefined();
    }
  });

  it('7. Uses lightweight CSS preferring system fonts (no Google Fonts / remote fonts CDN)', () => {
    const globalCssPath = path.join(projectRoot, 'src/styles/global.css');
    expect(fs.existsSync(globalCssPath), 'src/styles/global.css must exist').toBe(true);

    const tokensCssPath = path.join(projectRoot, 'src/styles/tokens.css');
    const combinedCss =
      (fs.existsSync(globalCssPath) ? fs.readFileSync(globalCssPath, 'utf-8') : '') +
      (fs.existsSync(tokensCssPath) ? fs.readFileSync(tokensCssPath, 'utf-8') : '');

    expect(combinedCss).not.toMatch(/fonts\.googleapis\.com/);
    expect(combinedCss).toMatch(/system-ui|-apple-system|BlinkMacSystemFont/);
  });

  it('8. Enforces pinned dependency versions (no ^ or ~ in package.json)', () => {
    const pkgPath = path.join(projectRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    for (const [dep, version] of Object.entries(allDeps)) {
      expect(version, `Dependency "${dep}" must be pinned`).not.toMatch(/^[\^~]/);
    }
  });
});
