# NexaTV — Plateforme Statique SEO-First

Socle technique pour le projet NexaTV, conçu selon une architecture statique Astro pilotée par les tests (TDD) pour le marché de la France métropolitaine.

## Spécifications Architecturales

- **Framework** : [Astro v7.3.8](https://astro.build/)
- **Mode de rendu** : Static HTML pré-rendu (`output: "static"`, `trailingSlash: "always"`)
- **Typage** : TypeScript 5.8 en mode strict (`astro/tsconfigs/strict`)
- **Contenu** : Markdown / MDX (`@astrojs/mdx`)
- **Styles** : CSS Vanilla allégé (`src/styles/tokens.css` et `src/styles/global.css`) avec pile typographique système (aucun appel CDN externe)
- **Modèle d'interaction** : Site statique pur (zéro backend runtime, zéro base de données, zéro panier/checkout, conversion WhatsApp externe)

## Structure des Répertoires

```text
src/
├── components/          # Composants UI réutilisables (statiques)
├── content/             # Collections de contenu Astro
│   ├── blog/            # Articles de blog (MD/MDX)
│   └── guides/          # Guides d'installation et de configuration (MD/MDX)
├── data/                # Données statiques locales et schémas
├── layouts/             # Gabarits HTML de base (lang="fr-FR", métadonnées SEO)
├── pages/               # Routage statique par fichiers
├── styles/              # Design tokens et feuille de style globale (polices système)
└── utils/               # Utilitaires TypeScript (canonicalisation URL, etc.)
tests/
├── unit/                # Tests unitaires de logique métier et utilitaires
├── integration/         # Tests d'intégration et de conformité structurelle
└── e2e/                 # Tests de validation du rendu et du build de production
```

## Commandes et Scripts Disponibles

```bash
# Développement local
npm run dev

# Vérification du typage TypeScript
npm run check

# Compilation statique pour CDN
npm run build

# Prévisualisation locale du build statique
npm run preview

# Exécution de la suite de tests
npm test

# Mode observateur pour les tests (TDD)
npm run test:watch

# Rapport de couverture de code
npm run test:coverage
```

## Décisions d'Implémentation Documentées

1. **Astro 7 & TypeScript 5.8** : Utilisation des versions stables et mutuellement compatibles avec versions rigoureusement épinglées dans `package.json` et verrouillées dans `package-lock.json`.
2. **Polices système** : Utilisation exclusive d'une pile système (`-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`, etc.) pour garantir des performances optimales, la neutralité RGPD et l'absence de requêtes vers des CDN distants.
3. **Routage avec Trailing Slash** : `trailingSlash: "always"` configuré dans Astro et validé unitairement par `src/utils/url.ts` pour une cohérence SEO totale.
4. **Zéro framework client** : Aucun framework JS lourd (React, Vue, Svelte) n'est embarqué afin de préserver l'hyper-légèreté du HTML généré.
5. **Accessibilité & Navigation Responsive (WCAG 2.2 AA)** : Modèle de disclosure HTML natif (`<details><summary>`) pour le menu mobile opérable au clavier et fonctionnant sans JavaScript, lien d'évitement (`.skip-link`) vers `#main-content`, indicateurs de focus visibles (`:focus-visible`) et indication d'état d'activité accessible (`aria-current="page"`).
6. **Structure de la Page d'Accueil** : Respect strict des 8 sections du PRD (Hero avec H1 unique, Aperçu des abonnements, Compatibilité appareils, Vérification du contenu, Guide de choix, Assistance et conditions, FAQ indexable `<details><summary>`, CTA final WhatsApp). Zéro allégation illégale, zéro faux avis ou fausse promesse technique.
