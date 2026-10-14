/**
 * Production Deployment & Commercial Release Gate Engine for NexaTV.
 *
 * Implements strict verification of static assets, architectural constraints,
 * security guardrails, and commercial authorization prior to production deployment.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PLANS } from '../data/plans';
import {
  evaluateCommercialReadiness,
  CURRENT_WORKSPACE_LEGAL_CONFIG,
  type CommercialReadinessConfig,
  type CommercialReadinessReport,
} from './legal-guardrails';
import { validateInternalLinks, type LinkValidationResult } from './link-validator';

export interface DeploymentReadinessOptions {
  projectRoot: string;
  distDir?: string;
  legalConfig?: CommercialReadinessConfig;
  selectedHost?: 'cloudflare' | 'netlify';
}

export interface DeploymentCheckResult {
  readonly id: string;
  readonly name: string;
  readonly passed: boolean;
  readonly message: string;
  readonly isCritical: boolean;
  readonly category: 'technical' | 'security' | 'commercial' | 'legal';
}

export interface DeploymentReadinessReport {
  readonly timestamp: string;
  readonly technicalStatus: 'READY' | 'FAILED';
  readonly commercialStatus: 'READY' | 'BLOCKED';
  readonly finalDecision:
    | 'READY FOR AUTHORIZED DEPLOYMENT'
    | 'TECHNICALLY READY, COMMERCIALLY BLOCKED'
    | 'BLOCKED';
  readonly selectedHost: 'cloudflare' | 'netlify' | 'UNKNOWN — NEEDS USER INPUT';
  readonly checks: readonly DeploymentCheckResult[];
  readonly commercialReport: CommercialReadinessReport;
  readonly linkValidation: LinkValidationResult;
  readonly blockingIssues: readonly string[];
  readonly satisfiedRequirements: readonly string[];
  readonly unknownInputs: readonly string[];
}

const UNWANTED_BACKEND_DEPENDENCIES = [
  'express',
  'fastify',
  'koa',
  'prisma',
  '@prisma/client',
  'mongoose',
  'sequelize',
  'typeorm',
  'pg',
  'mysql',
  'mysql2',
  'mongodb',
  'redis',
  'ioredis',
  'stripe',
  '@stripe/stripe-js',
  '@astrojs/node',
];

const SECRET_PATTERNS = [
  /PRIVATE_KEY/i,
  /SECRET_KEY/i,
  /API_SECRET/i,
  /DATABASE_URL/i,
  /STRIPE_SECRET/i,
  /AWS_SECRET_ACCESS_KEY/i,
  /PASSWORD\s*[:=]/i,
  /TEST_SECRET_TOKEN/i,
];

/**
 * Validates package.json dependencies to ensure no server runtime or backend leaked in.
 */
export function checkNoServerRuntime(packageJsonPath: string): { passed: boolean; message: string } {
  if (!fs.existsSync(packageJsonPath)) {
    return { passed: false, message: 'package.json not found' };
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  const detectedUnwanted = Object.keys(allDeps).filter((dep) =>
    UNWANTED_BACKEND_DEPENDENCIES.includes(dep)
  );

  if (detectedUnwanted.length > 0) {
    return {
      passed: false,
      message: `Unwanted server runtime dependencies detected: ${detectedUnwanted.join(', ')}`,
    };
  }

  return {
    passed: true,
    message: 'Zero server runtime or database dependencies detected (pure static architecture).',
  };
}

/**
 * Checks that no test secrets, test fixtures, or sensitive tokens are shipped in dist/.
 */
export function checkNoSecretsInBuild(distDir: string): { passed: boolean; message: string; foundIssues: string[] } {
  const foundIssues: string[] = [];

  if (!fs.existsSync(distDir)) {
    return { passed: false, message: 'dist/ directory does not exist', foundIssues: ['dist_missing'] };
  }

  // Check forbidden files in dist
  const forbiddenFiles = ['.env', '.env.local', '.env.production', 'id_rsa', 'credentials.json'];
  for (const file of forbiddenFiles) {
    if (fs.existsSync(path.join(distDir, file))) {
      foundIssues.push(`Sensitive file "${file}" found in dist/`);
    }
  }

  // Scan text files in dist for secret patterns
  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && /\.(html|js|css|json|txt)$/i.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(content)) {
            foundIssues.push(`Potential secret matching ${pattern} found in ${path.basename(fullPath)}`);
          }
        }
      }
    }
  }

  scanDir(distDir);

  if (foundIssues.length > 0) {
    return {
      passed: false,
      message: `Secrets or forbidden files detected in public build: ${foundIssues.join('; ')}`,
      foundIssues,
    };
  }

  return {
    passed: true,
    message: 'No secrets, private keys, or test credentials detected in public build output.',
    foundIssues: [],
  };
}

/**
 * Validates that all published pricing plans consistently reflect the approved business contract.
 */
export function checkPricingConsistency(): { passed: boolean; message: string } {
  const plan3m = PLANS.find((p) => p.id === '3m');
  const plan6m = PLANS.find((p) => p.id === '6m');
  const plan12m = PLANS.find((p) => p.id === '12m');

  if (!plan3m || plan3m.amountEUR !== 12 || plan3m.durationMonths !== 3) {
    return { passed: false, message: 'Plan 3m must be strictly 3 months at 12 €' };
  }
  if (!plan6m || plan6m.amountEUR !== 24 || plan6m.durationMonths !== 6) {
    return { passed: false, message: 'Plan 6m must be strictly 6 months at 24 €' };
  }
  if (!plan12m || plan12m.amountEUR !== 35 || plan12m.durationMonths !== 12) {
    return { passed: false, message: 'Plan 12m must be strictly 12 months at 35 €' };
  }

  return {
    passed: true,
    message: 'All 3 subscription plans match the validated business contract (3m: 12 €, 6m: 24 €, 12m: 35 €).',
  };
}

/**
 * Runs the comprehensive production release gate evaluation.
 */
export function evaluateDeploymentReadiness(
  options: DeploymentReadinessOptions
): DeploymentReadinessReport {
  const distDir = options.distDir || path.join(options.projectRoot, 'dist');
  const packageJsonPath = path.join(options.projectRoot, 'package.json');
  const legalConfig = options.legalConfig || CURRENT_WORKSPACE_LEGAL_CONFIG;

  const checks: DeploymentCheckResult[] = [];
  const satisfiedRequirements: string[] = [];
  const blockingIssues: string[] = [];
  const unknownInputs: string[] = [];

  // Check 1: Static build output existence
  const hasDist = fs.existsSync(distDir);
  const hasIndex = fs.existsSync(path.join(distDir, 'index.html'));
  const has404 = fs.existsSync(path.join(distDir, '404.html'));
  const hasSitemap = fs.existsSync(path.join(distDir, 'sitemap.xml'));
  const hasRobots = fs.existsSync(path.join(distDir, 'robots.txt'));

  const staticBuildPassed = hasDist && hasIndex && has404 && hasSitemap && hasRobots;
  checks.push({
    id: 'clean_static_build',
    name: 'Static Build Artifacts Verification',
    passed: staticBuildPassed,
    message: staticBuildPassed
      ? 'Clean static build verified with all mandatory entrypoints (index.html, 404.html, sitemap.xml, robots.txt).'
      : 'Static build incomplete. Missing required entrypoints in dist/.',
    isCritical: true,
    category: 'technical',
  });
  if (staticBuildPassed) satisfiedRequirements.push('Génération statique complète dans dist/');
  else blockingIssues.push('Génération statique incomplète dans dist/');

  // Check 2: No server runtime
  const serverRuntimeCheck = checkNoServerRuntime(packageJsonPath);
  checks.push({
    id: 'no_server_runtime',
    name: 'Zero Server Runtime Architecture',
    passed: serverRuntimeCheck.passed,
    message: serverRuntimeCheck.message,
    isCritical: true,
    category: 'technical',
  });
  if (serverRuntimeCheck.passed) satisfiedRequirements.push(serverRuntimeCheck.message);
  else blockingIssues.push(serverRuntimeCheck.message);

  // Check 3: No secrets in build output
  const secretCheck = checkNoSecretsInBuild(distDir);
  checks.push({
    id: 'no_secrets_in_build',
    name: 'Security & Secret Leak Prevention',
    passed: secretCheck.passed,
    message: secretCheck.message,
    isCritical: true,
    category: 'security',
  });
  if (secretCheck.passed) satisfiedRequirements.push(secretCheck.message);
  else blockingIssues.push(secretCheck.message);

  // Check 4: Internal links and draft protection
  const linkValidation = validateInternalLinks({ distDir });
  checks.push({
    id: 'internal_links_valid',
    name: 'Internal Link & Route Validation',
    passed: linkValidation.isValid,
    message: linkValidation.isValid
      ? `All ${linkValidation.checkedLinksCount} internal links and section fragments resolve without broken routes or leaked drafts.`
      : `${linkValidation.errors.length} broken link(s) detected.`,
    isCritical: true,
    category: 'technical',
  });
  if (linkValidation.isValid) satisfiedRequirements.push('Validation des liens internes et exclusion des brouillons');
  else blockingIssues.push('Présence de liens internes brisés ou pointant vers des brouillons');

  // Check 5: Pricing consistency
  const pricingCheck = checkPricingConsistency();
  checks.push({
    id: 'pricing_consistency',
    name: 'Commercial Pricing Contract Verification',
    passed: pricingCheck.passed,
    message: pricingCheck.message,
    isCritical: true,
    category: 'commercial',
  });
  if (pricingCheck.passed) satisfiedRequirements.push(pricingCheck.message);
  else blockingIssues.push(pricingCheck.message);

  // Check 6: Legal & Commercial readiness assessment
  const commercialReport = evaluateCommercialReadiness(legalConfig);

  // Record known / unknown inputs
  if (!legalConfig.confirmedDomain) {
    unknownInputs.push('Nom de domaine définitif en production (PUBLIC_SITE_URL)');
  }
  if (!legalConfig.whatsAppPhone) {
    unknownInputs.push('Numéro commercial WhatsApp (PUBLIC_WHATSAPP_PHONE)');
  }
  if (!legalConfig.distributionRights.isVerified) {
    unknownInputs.push('Autorisation et droits de distribution pour la France métropolitaine');
  }
  if (!legalConfig.sellerIdentity.isVerified) {
    unknownInputs.push('Identité légale de l\'éditeur (Raison sociale, SIREN/SIRET, LCEN)');
  }
  if (!legalConfig.contractualTerms.isVerified) {
    unknownInputs.push('Conditions contractuelles approuvées (CGV, politique de rétractation et remboursement)');
  }
  if (!options.selectedHost) {
    unknownInputs.push('Hébergeur CDN définitif choisi (Cloudflare Pages ou Netlify)');
  }

  // Aggregate commercial blockers
  for (const missing of commercialReport.missingCriticalRequirements) {
    blockingIssues.push(`Bloqueur commercial : ${missing}`);
    checks.push({
      id: `legal_${missing.substring(0, 20).replace(/\s+/g, '_')}`,
      name: 'Exigence légale / commerciale',
      passed: false,
      message: missing,
      isCritical: true,
      category: 'legal',
    });
  }

  const technicalPassed = checks
    .filter((c) => c.category === 'technical' || c.category === 'security')
    .every((c) => c.passed);

  const commercialPassed = commercialReport.isReadyForProductionRelease;

  let finalDecision: DeploymentReadinessReport['finalDecision'];
  if (technicalPassed && commercialPassed) {
    finalDecision = 'READY FOR AUTHORIZED DEPLOYMENT';
  } else if (technicalPassed && !commercialPassed) {
    finalDecision = 'TECHNICALLY READY, COMMERCIALLY BLOCKED';
  } else {
    finalDecision = 'BLOCKED';
  }

  return {
    timestamp: new Date().toISOString(),
    technicalStatus: technicalPassed ? 'READY' : 'FAILED',
    commercialStatus: commercialPassed ? 'READY' : 'BLOCKED',
    finalDecision,
    selectedHost: options.selectedHost || 'UNKNOWN — NEEDS USER INPUT',
    checks,
    commercialReport,
    linkValidation,
    blockingIssues,
    satisfiedRequirements,
    unknownInputs,
  };
}
