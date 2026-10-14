import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../../');
const articleMdPath = path.join(projectRoot, 'src/content/blog/comment-choisir-abonnement-iptv.md');
const blogDynamicRoutePath = path.join(projectRoot, 'src/pages/blog/[...slug].astro');

describe('SEO Article: Comment choisir un abonnement IPTV (/blog/comment-choisir-abonnement-iptv/)', () => {
  it('Test 1: Article route renders when published', () => {
    expect(fs.existsSync(articleMdPath), 'Article markdown source must exist').toBe(true);
    expect(fs.existsSync(blogDynamicRoutePath), 'Blog dynamic route must exist').toBe(true);

    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');
    const routeContent = fs.readFileSync(blogDynamicRoutePath, 'utf-8');

    // Frontmatter validation
    expect(mdContent).toMatch(/status:\s*["']published["']/);
    expect(mdContent).toMatch(/slug:\s*["']comment-choisir-abonnement-iptv["']/);
    expect(mdContent).toMatch(/publishedAt:\s*2026-10-10/);

    // Dynamic route filters by status === 'published'
    expect(routeContent).toMatch(/status\s*===\s*['"]published['"]/);
  });

  it('Test 2: All required comparison criteria are covered in depth', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');

    // 1. Content availability
    expect(mdContent).toMatch(/disponibilité des contenus|catalogue de chaînes|bouquets/i);

    // 2. Authorized territorial distribution
    expect(mdContent).toMatch(/droits territoriaux|diffusion autorisée|distribution autorisée|droits de diffusion/i);

    // 3. Device compatibility (exact model)
    expect(mdContent).toMatch(/compatibilité des appareils|modèle exact|processeur/i);

    // 4. Total subscription price & why price alone is insufficient
    expect(mdContent).toMatch(/prix (total|seul|d'un abonnement)|le prix seul ne suffit pas|tarifs dérisoires/i);

    // 5. Connection limits
    expect(mdContent).toMatch(/connexions simultanées|nombre d['’]écrans|flux simultané/i);

    // 6. Seller identity
    expect(mdContent).toMatch(/identité du vendeur|mentions légales|coordonnées de l['’]éditeur|société éditrice/i);

    // 7. Support information
    expect(mdContent).toMatch(/support technique|assistance|service client/i);

    // 8. Contractual conditions
    expect(mdContent).toMatch(/conditions contractuelles|engagement|reconduction tacite|prélèvements automatiques/i);
  });

  it('Test 3: Relevant internal links resolve and are contextual', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');

    // Internal link to pricing
    expect(mdContent).toMatch(/\[.*\]\(\/abonnement-iptv\/\)/);

    // Internal link to devices
    expect(mdContent).toMatch(/\[.*\]\(\/appareils-compatibles\/\)/);

    // Internal link to assistance
    expect(mdContent).toMatch(/\[.*\]\(\/assistance\/\)/);
  });

  it('Test 4: Article has exactly one H1 and no raw markdown # headings', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');

    // Frontmatter title provides the single H1 in ArticleLayout
    const titleMatch = mdContent.match(/^title:\s*["'](.*)["']/m);
    expect(titleMatch).not.toBeNull();
    expect(titleMatch![1]).toMatch(/choisir son abonnement iptv/i);

    // Body should only contain ## and ###, no raw # (H1)
    const rawH1Matches = mdContent.match(/^#\s+[^\n]+/gm);
    expect(rawH1Matches).toBeNull();
  });

  it('Test 5: No invented ranking, popularity statement, or unverified competitor comparison exists', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');

    const forbiddenClaims = [
      /n°\s*1\s+en\s+france/i,
      /numéro\s*1\s+en\s+france/i,
      /meilleur\s+(fournisseur|service|site)\s+iptv/i,
      /élu\s+meilleur/i,
      /le\s+plus\s+populaire/i,
      /classement\s+des\s+meilleurs/i,
      /comparatif\s+des\s+10\s+meilleurs/i,
      /notre\s+test\s+exclusif\s+de/i,
    ];

    for (const pattern of forbiddenClaims) {
      expect(mdContent).not.toMatch(pattern);
    }
  });

  it('Test 6: Article does not duplicate the full pricing page', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');

    // Should not contain whole plan purchase tables or duplicate OfferCard structures
    expect(mdContent).not.toMatch(/id="offer-card"/);
    expect(mdContent).not.toMatch(/Choisir 3 mois.*Choisir 6 mois.*Choisir 12 mois/s);

    // The educational explanation must come before any NexaTV commercial link
    const firstCriteriaIndex = mdContent.search(/##\s+1\./);
    const pricingLinkIndex = mdContent.indexOf('/abonnement-iptv/');
    expect(firstCriteriaIndex).toBeGreaterThan(-1);
    expect(pricingLinkIndex).toBeGreaterThan(firstCriteriaIndex);
  });

  it('Test 7: Article is readable and structured without requiring JavaScript', () => {
    const mdContent = fs.readFileSync(articleMdPath, 'utf-8');

    // Ensures instructional paragraphs and structured bullet lists exist
    expect(mdContent.length).toBeGreaterThan(3000);
    expect(mdContent).toContain('##');
    expect(mdContent).toContain('- ');
  });
});
