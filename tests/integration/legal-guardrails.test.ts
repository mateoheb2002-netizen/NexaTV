import { describe, it, expect } from 'vitest';
import {
  evaluateCommercialReadiness,
  assertProductionCommercialReadiness,
  isPlaceholderLegalContent,
  getApprovedLegalRoutes,
  type CommercialReadinessConfig,
} from '../../src/utils/legal-guardrails';

describe('Commercial Readiness & Legal Guardrails (src/utils/legal-guardrails.ts)', () => {
  // A complete, fully approved legal configuration for testing green paths
  const completeApprovedConfig: CommercialReadinessConfig = {
    environment: 'production',
    sellerIdentity: {
      legalName: 'NexaTV Diffusion SAS',
      businessRegistrationNumber: '98765432100012', // Real valid format SIRET
      vatNumber: 'FR12987654321',
      physicalAddress: '10 Rue de la Paix, 75002 Paris, France',
      contactEmail: 'contact@nexatv.fr',
      legalRepresentative: 'Directeur de publication',
      isVerified: true,
    },
    distributionRights: {
      hasFrenchDistributionAuthorization: true,
      licensedTerritory: 'France métropolitaine',
      rightsHolderAgreementRef: 'AGR-FR-2026-NEXA',
      isVerified: true,
    },
    contractualTerms: {
      termsOfSaleApproved: true,
      withdrawalPolicyApproved: true,
      refundPolicyApproved: true,
      privacyPolicyApproved: true,
      priceAndTaxDisclosuresApproved: true,
      paymentProcedureDisclosed: true,
      renewalConditionsDisclosed: true,
      isVerified: true,
    },
    whatsAppPhone: '33612345678',
    confirmedDomain: 'https://nexatv.fr',
    legalRoutes: [
      {
        label: 'Mentions légales',
        route: '/mentions-legales/',
        isApproved: true,
        contentSnippet: 'Éditeur : NexaTV Diffusion SAS au capital de 50 000 €...',
      },
      {
        label: 'Conditions Générales de Vente',
        route: '/cgv/',
        isApproved: true,
        contentSnippet: 'Conditions contractuelles régissant les forfaits NexaTV...',
      },
      {
        label: 'Politique de confidentialité',
        route: '/confidentialite/',
        isApproved: true,
        contentSnippet: 'Traitement des données personnelles conformément au RGPD...',
      },
    ],
  };

  it('Test 1: Missing seller identity causes release-readiness failure', () => {
    const configWithMissingSeller: CommercialReadinessConfig = {
      ...completeApprovedConfig,
      sellerIdentity: {
        legalName: undefined,
        businessRegistrationNumber: undefined,
        isVerified: false,
      },
    };

    const report = evaluateCommercialReadiness(configWithMissingSeller);
    expect(report.isReadyForProductionRelease).toBe(false);
    expect(report.missingCriticalRequirements.some((req) => req.includes('Identité légale'))).toBe(true);

    expect(() => assertProductionCommercialReadiness(configWithMissingSeller)).toThrow(/Identité légale/i);
  });

  it('Test 2: Unverified French distribution authorization causes failure', () => {
    const configWithMissingRights: CommercialReadinessConfig = {
      ...completeApprovedConfig,
      distributionRights: {
        hasFrenchDistributionAuthorization: false,
        isVerified: false,
      },
    };

    const report = evaluateCommercialReadiness(configWithMissingRights);
    expect(report.isReadyForProductionRelease).toBe(false);
    expect(report.missingCriticalRequirements.some((req) => req.includes('distribution') || req.includes('droits'))).toBe(true);

    expect(() => assertProductionCommercialReadiness(configWithMissingRights)).toThrow(/distribution|droits/i);
  });

  it('Test 3: Missing applicable contractual information causes failure', () => {
    const configWithMissingContracts: CommercialReadinessConfig = {
      ...completeApprovedConfig,
      contractualTerms: {
        ...completeApprovedConfig.contractualTerms,
        termsOfSaleApproved: false, // CGV not approved
        isVerified: false,
      },
    };

    const report = evaluateCommercialReadiness(configWithMissingContracts);
    expect(report.isReadyForProductionRelease).toBe(false);
    expect(report.missingCriticalRequirements.some((req) => req.includes('contractuelles') || req.includes('CGV'))).toBe(true);

    expect(() => assertProductionCommercialReadiness(configWithMissingContracts)).toThrow(/contractuelles|CGV/i);
  });

  it('Test 4: Missing production WhatsApp number causes failure', () => {
    const configWithoutPhone: CommercialReadinessConfig = {
      ...completeApprovedConfig,
      whatsAppPhone: undefined,
    };

    const report = evaluateCommercialReadiness(configWithoutPhone);
    expect(report.isReadyForProductionRelease).toBe(false);
    expect(report.missingCriticalRequirements.some((req) => req.includes('WhatsApp'))).toBe(true);

    expect(() => assertProductionCommercialReadiness(configWithoutPhone)).toThrow(/WhatsApp/i);
  });

  it('Test 5: Placeholder legal content cannot pass as approved content', () => {
    const placeholderSnippets = [
      'Lorem ipsum dolor sit amet...',
      'TODO: Remplir les mentions légales ici',
      'Société NOM_A_DEFINIR au capital de XXX euros',
      'Mentions légales à venir prochainement',
      'SIRET: 00000000000000',
    ];

    for (const snippet of placeholderSnippets) {
      expect(isPlaceholderLegalContent(snippet)).toBe(true);
    }

    const configWithPlaceholderRoute: CommercialReadinessConfig = {
      ...completeApprovedConfig,
      legalRoutes: [
        {
          label: 'Mentions légales',
          route: '/mentions-legales/',
          isApproved: true,
          contentSnippet: 'TODO: Remplir les mentions légales ici avant publication',
        },
      ],
    };

    const report = evaluateCommercialReadiness(configWithPlaceholderRoute);
    expect(report.isReadyForProductionRelease).toBe(false);
    expect(report.missingCriticalRequirements.some((req) => req.includes('placeholder') || req.includes('fictif'))).toBe(true);
  });

  it('Test 6: Approved legal routes appear in footer navigation when provided', () => {
    const routes = getApprovedLegalRoutes(completeApprovedConfig);
    expect(routes.length).toBe(3);
    expect(routes[0].label).toBe('Mentions légales');
    expect(routes[0].route).toBe('/mentions-legales/');
    expect(routes[1].label).toBe('Conditions Générales de Vente');
    expect(routes[2].label).toBe('Politique de confidentialité');

    // When routes are unapproved, they must NOT be returned
    const unapprovedConfig: CommercialReadinessConfig = {
      ...completeApprovedConfig,
      legalRoutes: [
        {
          label: 'Mentions légales fictives',
          route: '/mentions-legales/',
          isApproved: false,
        },
      ],
    };

    const emptyRoutes = getApprovedLegalRoutes(unapprovedConfig);
    expect(emptyRoutes).toHaveLength(0);
  });

  it('Test 7: Preview builds remain technically testable without falsely reporting commercial readiness', () => {
    // Current default pre-production state
    const currentPreProductionConfig: CommercialReadinessConfig = {
      environment: 'preview',
      sellerIdentity: { isVerified: false },
      distributionRights: { hasFrenchDistributionAuthorization: false, isVerified: false },
      contractualTerms: {
        termsOfSaleApproved: false,
        withdrawalPolicyApproved: false,
        refundPolicyApproved: false,
        privacyPolicyApproved: false,
        priceAndTaxDisclosuresApproved: false,
        paymentProcedureDisclosed: true, // Visible on WhatsApp CTA
        renewalConditionsDisclosed: true, // Visible: no automatic renewal
        isVerified: false,
      },
      whatsAppPhone: undefined,
      confirmedDomain: undefined,
    };

    const report = evaluateCommercialReadiness(currentPreProductionConfig);

    // Technically testable in preview
    expect(report.isPreviewAllowed).toBe(true);

    // But strictly BLOCKED for commercial production release
    expect(report.isReadyForProductionRelease).toBe(false);
    expect(report.missingCriticalRequirements.length).toBeGreaterThanOrEqual(4);

    // Preview assertions do not throw
    expect(() => evaluateCommercialReadiness(currentPreProductionConfig)).not.toThrow();
  });

  it('Test 8: Complete approved configuration passes readiness validation', () => {
    const report = evaluateCommercialReadiness(completeApprovedConfig);

    expect(report.isReadyForProductionRelease).toBe(true);
    expect(report.missingCriticalRequirements).toHaveLength(0);
    expect(report.satisfiedConditions.length).toBeGreaterThanOrEqual(6);
    expect(() => assertProductionCommercialReadiness(completeApprovedConfig)).not.toThrow();
  });
});
