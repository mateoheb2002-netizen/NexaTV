/**
 * Legal Guardrails & Commercial Release Readiness Engine for NexaTV.
 *
 * Enforces strict compliance with French consumer protection laws (LCEN, Code de la consommation):
 * - Blocks commercial production release when critical legal information is absent
 * - Strictly forbids generating fake SIREN/SIRET, placeholder CGV, or fictional legal notices
 * - Differentiates isolated preview/testing builds from certified production release
 * - Ensures that only fully approved legal routes appear in site navigation
 */

import { isValidWhatsAppPhone } from './whatsapp';

export interface SellerIdentityConfig {
  readonly legalName?: string;
  readonly businessRegistrationNumber?: string; // SIREN / SIRET / RCS
  readonly vatNumber?: string;
  readonly physicalAddress?: string;
  readonly legalRepresentative?: string;
  readonly contactEmail?: string;
  readonly isVerified: boolean;
}

export interface DistributionRightsConfig {
  readonly hasFrenchDistributionAuthorization: boolean;
  readonly licensedTerritory?: string;
  readonly rightsHolderAgreementRef?: string;
  readonly isVerified: boolean;
}

export interface ContractualTermsConfig {
  readonly termsOfSaleApproved: boolean; // CGV
  readonly withdrawalPolicyApproved: boolean; // Droit de rétractation
  readonly refundPolicyApproved: boolean; // Remboursement
  readonly privacyPolicyApproved: boolean; // RGPD / Politique de confidentialité
  readonly priceAndTaxDisclosuresApproved: boolean; // Mention TTC / TVA
  readonly paymentProcedureDisclosed: boolean; // Procédure manuelle WhatsApp
  readonly renewalConditionsDisclosed: boolean; // Sans reconduction tacite
  readonly isVerified: boolean;
}

export interface LegalRouteItem {
  readonly label: string;
  readonly route: string;
  readonly isApproved: boolean;
  readonly contentSnippet?: string;
}

export interface CommercialReadinessConfig {
  readonly environment: 'development' | 'preview' | 'production';
  readonly sellerIdentity: SellerIdentityConfig;
  readonly distributionRights: DistributionRightsConfig;
  readonly contractualTerms: ContractualTermsConfig;
  readonly whatsAppPhone?: string;
  readonly confirmedDomain?: string;
  readonly legalRoutes?: readonly LegalRouteItem[];
}

export interface CommercialReadinessReport {
  readonly isReadyForProductionRelease: boolean;
  readonly isPreviewAllowed: boolean;
  readonly environment: 'development' | 'preview' | 'production';
  readonly satisfiedConditions: readonly string[];
  readonly missingCriticalRequirements: readonly string[];
  readonly warnings: readonly string[];
  readonly approvedLegalRoutes: readonly LegalRouteItem[];
}

const PLACEHOLDER_PATTERNS = [
  /lorem\s+ipsum/i,
  /à\s+remplir|a\s+remplir/i,
  /\btodo\b/i,
  /nom_a_definir|nom\s+à\s+définir/i,
  /votre_societe|votre\s+société/i,
  /\bxxx\b/i,
  /à\s+venir|a\s+venir\s+prochainement/i,
  /00000000000000|000000000/, // fake SIREN / SIRET
  /00\s*00\s*00\s*00\s*00/, // fake phone
];

/**
 * Checks whether text content contains placeholder or dummy data.
 */
export function isPlaceholderLegalContent(text: string): boolean {
  if (!text || text.trim() === '') {
    return false;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Returns only verified and approved legal routes, filtering out placeholders.
 */
export function getApprovedLegalRoutes(
  config: CommercialReadinessConfig
): readonly LegalRouteItem[] {
  if (!config.legalRoutes || config.legalRoutes.length === 0) {
    return [];
  }

  return config.legalRoutes.filter((item) => {
    if (!item.isApproved) return false;
    if (item.contentSnippet && isPlaceholderLegalContent(item.contentSnippet)) {
      return false;
    }
    return true;
  });
}

/**
 * Evaluates commercial release readiness.
 * Identifies satisfied requirements and actionable missing blockers.
 */
export function evaluateCommercialReadiness(
  config: CommercialReadinessConfig
): CommercialReadinessReport {
  const satisfiedConditions: string[] = [];
  const missingCriticalRequirements: string[] = [];
  const warnings: string[] = [];

  // 1. Seller Identity Validation
  if (
    config.sellerIdentity.isVerified &&
    config.sellerIdentity.legalName &&
    config.sellerIdentity.businessRegistrationNumber
  ) {
    if (isPlaceholderLegalContent(config.sellerIdentity.legalName) || isPlaceholderLegalContent(config.sellerIdentity.businessRegistrationNumber)) {
      missingCriticalRequirements.push('Identité légale du vendeur : détection de valeurs fictives ou placeholders.');
    } else {
      satisfiedConditions.push(`Identité légale vérifiée : ${config.sellerIdentity.legalName} (SIREN/SIRET ${config.sellerIdentity.businessRegistrationNumber})`);
    }
  } else {
    missingCriticalRequirements.push(
      'Identité légale du vendeur non vérifiée (Raison sociale / SIREN / RCS manquant). Requis par la LCEN avant commercialisation.'
    );
  }

  // 2. French Distribution Authorizations Validation
  if (
    config.distributionRights.isVerified &&
    config.distributionRights.hasFrenchDistributionAuthorization
  ) {
    satisfiedConditions.push(
      `Autorisation de distribution vérifiée pour le territoire : ${config.distributionRights.licensedTerritory || 'France'}`
    );
  } else {
    missingCriticalRequirements.push(
      'Autorisation de distribution et droits de diffusion pour la France non vérifiés. Preuve contractuelle requise.'
    );
  }

  // 3. Contractual Terms (CGV, Rétractation, Confidentialité)
  if (
    config.contractualTerms.isVerified &&
    config.contractualTerms.termsOfSaleApproved &&
    config.contractualTerms.withdrawalPolicyApproved &&
    config.contractualTerms.privacyPolicyApproved
  ) {
    satisfiedConditions.push('Conditions contractuelles, politique de rétractation et confidentialité validées.');
  } else {
    missingCriticalRequirements.push(
      'Conditions contractuelles et mentions de rétractation / CGV / confidentialité obligatoires non validées.'
    );
  }

  // 4. Commercial WhatsApp Number
  if (config.whatsAppPhone && isValidWhatsAppPhone(config.whatsAppPhone)) {
    satisfiedConditions.push(`Canal commercial WhatsApp configuré : +${config.whatsAppPhone}`);
  } else {
    missingCriticalRequirements.push(
      'Numéro WhatsApp commercial de production manquant ou non configuré.'
    );
  }

  // 5. Placeholder Legal Routes Check
  if (config.legalRoutes && config.legalRoutes.length > 0) {
    const hasPlaceholders = config.legalRoutes.some(
      (r) => r.contentSnippet && isPlaceholderLegalContent(r.contentSnippet)
    );
    if (hasPlaceholders) {
      missingCriticalRequirements.push(
        'Contenu légal fictif ou temporaire (placeholder) détecté dans les routes légales.'
      );
    }
  }

  // 6. Transparent pricing and renewal conditions (already implemented in NexaTV codebase)
  if (config.contractualTerms.renewalConditionsDisclosed) {
    satisfiedConditions.push('Absence de reconduction tacite et tarification forfaitaire affichée.');
  }

  const approvedLegalRoutes = getApprovedLegalRoutes(config);
  if (approvedLegalRoutes.length > 0) {
    satisfiedConditions.push(
      `Pages légales approuvées pour publication : ${approvedLegalRoutes.map((r) => r.label).join(', ')}`
    );
  }

  return {
    isReadyForProductionRelease: missingCriticalRequirements.length === 0,
    isPreviewAllowed: true, // Always allows previewing and compiling in dev/test
    environment: config.environment,
    satisfiedConditions,
    missingCriticalRequirements,
    warnings,
    approvedLegalRoutes,
  };
}

/**
 * Asserts production release readiness.
 * Throws a fatal exception if any critical requirements are missing.
 */
export function assertProductionCommercialReadiness(
  config: CommercialReadinessConfig
): void {
  const report = evaluateCommercialReadiness(config);
  if (!report.isReadyForProductionRelease) {
    throw new Error(
      `Commercial release is BLOCKED. Mandatory legal and commercial requirements are missing:\n- ${report.missingCriticalRequirements.join(
        '\n- '
      )}`
    );
  }
}

/**
 * Default current configuration reflecting the actual workspace status.
 * All unresolved legal questions are honestly represented as unverified.
 */
export const CURRENT_WORKSPACE_LEGAL_CONFIG: CommercialReadinessConfig = {
  environment: (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' && process.env?.PUBLIC_PRODUCTION_RELEASE === 'true')
    ? 'production'
    : 'preview',
  sellerIdentity: {
    isVerified: false,
  },
  distributionRights: {
    hasFrenchDistributionAuthorization: false,
    isVerified: false,
  },
  contractualTerms: {
    termsOfSaleApproved: false,
    withdrawalPolicyApproved: false,
    refundPolicyApproved: false,
    privacyPolicyApproved: false,
    priceAndTaxDisclosuresApproved: true,
    paymentProcedureDisclosed: true,
    renewalConditionsDisclosed: true,
    isVerified: false,
  },
  whatsAppPhone: typeof process !== 'undefined' ? process.env?.PUBLIC_WHATSAPP_PHONE : undefined,
  confirmedDomain: typeof process !== 'undefined' ? process.env?.PUBLIC_SITE_URL : undefined,
  legalRoutes: [],
};
