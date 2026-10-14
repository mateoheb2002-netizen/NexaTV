# NexaTV — Guide pour Agents et Développeurs

## Contexte Métier
- **Projet** : NexaTV
- **Marché cible** : France métropolitaine (`fr-FR`, EUR)
- **Modèle économique** : B2C avec conversion externe vers WhatsApp
- **Type d'application** : Site statique SEO-first (aucun backend, aucune base de données, aucun checkout en ligne)

## Principes Directeurs
1. **Rendu statique pur** : Tout le contenu doit être compilé en HTML statique pur (`dist/`). Aucune fonction runtime serverless/SSR obligatoire.
2. **Performance et sobriété** : Aucun framework JS client lourd (pas de React, pas de Vue). Utiliser du CSS Vanilla modulaire avec des polices système.
3. **Conformité SEO** : URLs avec trailing slash obligatoire (`trailingSlash: 'always'`), balises canoniques, balises sémantiques uniques (`h1`, `title`, `meta description`).
4. **Discipline TDD (RED → GREEN → REFACTOR)** : Tout nouveau composant ou fonctionnalité doit être précédé de tests unitaires, d'intégration ou E2E.
5. **Respect des contraintes légales** : Ne fabriquer aucune mention légale fictive, aucune allégation commerciale ou tarifaire non validée.

## Commandes Essentielles
- `npm test` : Exécuter la suite complète de tests Vitest.
- `npm run check` : Vérifier la conformité TypeScript en mode strict.
- `npm run build` : Compiler les routes statiques dans `dist/`.
- `npm run dev` : Démarrer le serveur de développement local.

## Contrat de Données des Abonnements (`src/data/plans.ts`)
- **Source unique de vérité** : Tout composant, page ou message WhatsApp doit importer les données depuis `src/data/plans.ts`. Aucun montant en dur dans les composants.
- **Formules validées** :
  - `3m` : Découverte (3 mois, 12 €, équiv. 4 €/mois)
  - `6m` : Standard (6 mois, 24 €, équiv. 4 €/mois)
  - `12m` : Annuel (12 mois, 35 €, équiv. ~2,92 €/mois, économie de 13 € vs 4x 3 mois)
- **Règles d'allégations** :
  - Le plan 12m peut être qualifié de « Meilleur tarif mensuel NexaTV ».
  - Interdiction formelle de le nommer « Le plus populaire » ou d'inventer des fausses promotions / fausse urgence.

## Contrat du Moteur WhatsApp (`src/utils/whatsapp.ts`)
- **Format du lien** : `https://wa.me/{internationalDigits}?text={encodedMessage}`
- **Validation numéro** : Regex stricte `^[1-9]\d{7,14}$` (chiffres internationaux uniquement, aucun `+`, aucun espace, aucun 0 initial).
- **Sécurité et conformité** :
  - Interdiction absolue d'inclure des mots de passe, identifiants de streaming, coordonnées bancaires, tokens ou données personnelles.
  - Interdiction d'inventer un numéro de production : `getProductionWhatsAppNumber()` lève une exception si `PUBLIC_WHATSAPP_PHONE` n'est pas configuré.
  - Utilisation de messages contextualisés polis en français pour les intentions validées : `general_information`, `pricing_3m`, `pricing_6m`, `pricing_12m`, `device_check`, `technical_support`, `article_question`, `faq_question`.
  - Les messages commerciaux de tarification doivent obligatoirement utiliser les libellés, durées et prix de `src/data/plans.ts`.

## Composant WhatsApp CTA (`src/components/WhatsAppCTA.astro`)
- **Propriétés typées** : `intent` (intention validée), `label` (libellé en français), `sourceSection` (section source : hero, pricing, compatibility, support, blog, faq, mobile_sticky), `planId` optionnel (`3m`, `6m`, `12m`), `className`, `variant` (`primary`, `secondary`, `outline`).
- **Comportement défensif** : Si aucun numéro de téléphone valide n'est configuré (ex. variable `PUBLIC_WHATSAPP_PHONE` absente), le composant rend un lien inerte sécurisé avec `aria-disabled="true"` et `data-cta-status="unconfigured"`, empêchant tout lien brisé ou fictif.
- **Accessibilité & SEO** : Balise sémantique `<a>` avec `target="_blank"` et `rel="noopener noreferrer"`, focus visible, fonctionne 100 % sans JavaScript.
- **Attributs pour instrumentation analytics** : `data-cta-intent`, `data-cta-source`, `data-cta-plan`, `data-cta-status`.

## Arbitrages et Inconnues en Attente (User Input Requis)
- Fournisseur d'hébergement CDN (Cloudflare Pages, Vercel, Netlify, GitHub Pages)
- Nom de domaine définitif en production
- Numéro commercial WhatsApp (`PUBLIC_WHATSAPP_PHONE`)
- Données d'identification légale de l'éditeur (LCEN / Arcom)
- Limites de connexions simultanées
- Catalogue officiel des chaînes et bouquets
- Conditions d'activation, politique de renouvellement et de remboursement


