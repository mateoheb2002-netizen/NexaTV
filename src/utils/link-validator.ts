/**
 * Build-time Internal Link & Route Validation Engine for NexaTV.
 *
 * Verifies that all internal HTML links resolve to existing compiled pages,
 * ensures anchor fragments (#id) point to valid section IDs,
 * detects accidental links to draft/unpublished guides,
 * and cleanly distinguishes external WhatsApp conversions from internal navigation.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface LinkValidationError {
  readonly sourceFile: string;
  readonly targetHref: string;
  readonly reason: string;
}

export interface LinkValidationResult {
  readonly isValid: boolean;
  readonly checkedLinksCount: number;
  readonly errors: ReadonlyArray<LinkValidationError>;
}

export interface LinkValidationOptions {
  distDir: string;
  knownDrafts?: string[];
}

const DEFAULT_KNOWN_DRAFTS = [
  'installer-iptv-samsung',
  'installer-iptv-android-tv',
  'installer-iptv-fire-tv',
  'installer-iptv-lg',
  'configurer-iptv-smarters',
  'configurer-tivimate',
];

/**
 * Recursively retrieves all HTML files from a directory.
 */
function findHtmlFiles(dir: string, baseDir: string = dir): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const htmlFiles: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      htmlFiles.push(...findHtmlFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(path.relative(baseDir, fullPath));
    }
  }

  return htmlFiles;
}

/**
 * Validates all internal links across compiled HTML pages.
 */
export function validateInternalLinks(options: LinkValidationOptions): LinkValidationResult {
  const { distDir, knownDrafts = DEFAULT_KNOWN_DRAFTS } = options;
  const errors: LinkValidationError[] = [];
  let checkedLinksCount = 0;

  if (!fs.existsSync(distDir)) {
    return {
      isValid: false,
      checkedLinksCount: 0,
      errors: [
        {
          sourceFile: distDir,
          targetHref: '',
          reason: `Le répertoire cible n'existe pas: ${distDir}`,
        },
      ],
    };
  }

  const htmlFiles = findHtmlFiles(distDir);
  const fileContentsCache = new Map<string, string>();

  function getFileContent(relPath: string): string | null {
    if (fileContentsCache.has(relPath)) {
      return fileContentsCache.get(relPath)!;
    }
    const fullPath = path.join(distDir, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      fileContentsCache.set(relPath, content);
      return content;
    }
    return null;
  }

  for (const htmlFile of htmlFiles) {
    const content = getFileContent(htmlFile);
    if (!content) continue;

    // Extract all <a href="..."> links
    const linkMatches = content.matchAll(/<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>/gi);

    for (const match of linkMatches) {
      const rawHref = match[1].trim();
      checkedLinksCount++;

      // 1. Skip external protocols (WhatsApp, mailto, tel, external http/https)
      if (
        rawHref.startsWith('https://wa.me') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:')
      ) {
        continue;
      }

      // External HTTP(S) links pointing to third parties
      if (
        (rawHref.startsWith('http://') || rawHref.startsWith('https://')) &&
        !rawHref.includes('nexatv.fr') &&
        !rawHref.includes('localhost')
      ) {
        continue;
      }

      // 2. Normalize link to pathname and fragment
      let cleanHref = rawHref;
      if (cleanHref.startsWith('http://') || cleanHref.startsWith('https://')) {
        try {
          const parsed = new URL(cleanHref);
          cleanHref = `${parsed.pathname}${parsed.hash}`;
        } catch {
          // If unparseable URL, flag as broken
          errors.push({
            sourceFile: htmlFile,
            targetHref: rawHref,
            reason: `URL absolue invalide: ${rawHref}`,
          });
          continue;
        }
      }

      const [targetPath, fragment] = cleanHref.split('#');

      // 3. Draft Guide Detection
      for (const draftSlug of knownDrafts) {
        if (targetPath.includes(draftSlug) || rawHref.includes(draftSlug)) {
          errors.push({
            sourceFile: htmlFile,
            targetHref: rawHref,
            reason: `Lien interdit vers un guide en brouillon non publié: ${rawHref}`,
          });
          break;
        }
      }

      // 4. Target File Resolution
      let targetFileRel: string;
      if (!targetPath || targetPath === '') {
        // Same-page fragment link (e.g. #offres or #main-content)
        targetFileRel = htmlFile;
      } else {
        const normalizedPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
        if (normalizedPath === '' || normalizedPath === '/') {
          targetFileRel = 'index.html';
        } else if (normalizedPath.endsWith('.html') || normalizedPath.endsWith('.xml') || normalizedPath.endsWith('.txt')) {
          targetFileRel = normalizedPath;
        } else {
          // Directory format with trailing slash
          const cleanDir = normalizedPath.endsWith('/') ? normalizedPath.slice(0, -1) : normalizedPath;
          targetFileRel = `${cleanDir}/index.html`;
        }
      }

      const targetContent = getFileContent(targetFileRel);
      if (targetContent === null) {
        errors.push({
          sourceFile: htmlFile,
          targetHref: rawHref,
          reason: `Page cible introuvable (404) pour le lien: ${rawHref} (recherche: ${targetFileRel})`,
        });
        continue;
      }

      // 5. Fragment Anchor Resolution
      if (fragment && fragment.trim() !== '') {
        const idPattern = new RegExp(`\\bid=["']${fragment}["']`, 'i');
        const namePattern = new RegExp(`\\bname=["']${fragment}["']`, 'i');

        if (!idPattern.test(targetContent) && !namePattern.test(targetContent)) {
          errors.push({
            sourceFile: htmlFile,
            targetHref: rawHref,
            reason: `Ancre #${fragment} introuvable dans la page cible ${targetFileRel}`,
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    checkedLinksCount,
    errors,
  };
}
