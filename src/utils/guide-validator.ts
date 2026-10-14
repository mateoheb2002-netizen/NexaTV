/**
 * Deterministic publication readiness gate for NexaTV guides.
 *
 * Rules:
 * - A guide can ONLY be published if it has tested device, OS version, application,
 *   reproducible steps, and approved lab evidence.
 * - All unverified or untested guides must strictly remain in 'draft' status.
 * - Never assume application support merely because an OS supports IPTV players generally.
 */

export interface GuideValidationInput {
  title?: string;
  description?: string;
  slug?: string;
  status?: 'draft' | 'published';
  publishedAt?: Date | string | null;
  category?: string;
  verifiedDeviceModel?: string;
  verifiedDeviceFamily?: string;
  verifiedOSVersion?: string;
  verifiedApplication?: string;
  hasReproducibleSteps?: boolean;
  hasApprovedEvidence?: boolean;
  officialDocUrl?: string;
}

export interface GuideValidationResult {
  canPublish: boolean;
  errors: string[];
  missingEvidence: string[];
}

export function validateGuideReadiness(input: GuideValidationInput): GuideValidationResult {
  const errors: string[] = [];
  const missingEvidence: string[] = [];

  if (input.status === 'published') {
    if (!input.verifiedApplication || input.verifiedApplication.trim() === '') {
      errors.push("L'application vérifiée (verifiedApplication) est obligatoire pour publier un guide.");
      missingEvidence.push('verifiedApplication');
    }

    if (!input.verifiedOSVersion || input.verifiedOSVersion.trim() === '') {
      errors.push("La version du système d'exploitation vérifiée (verifiedOSVersion) est obligatoire pour publier un guide.");
      missingEvidence.push('verifiedOSVersion');
    }

    if (!input.hasReproducibleSteps) {
      errors.push("Les étapes d'installation reproductibles et documentées (hasReproducibleSteps: true) sont requises pour publier un guide.");
      missingEvidence.push('hasReproducibleSteps');
    }

    if (!input.hasApprovedEvidence) {
      errors.push("Une preuve de validation technique approuvée (hasApprovedEvidence: true) est obligatoire pour publier un guide.");
      missingEvidence.push('hasApprovedEvidence');
    }

    if (!input.publishedAt) {
      errors.push("Une date de publication réelle non nulle (publishedAt) est obligatoire pour publier un guide.");
      missingEvidence.push('publishedAt');
    }
  }

  return {
    canPublish: errors.length === 0 && input.status === 'published',
    errors,
    missingEvidence,
  };
}
