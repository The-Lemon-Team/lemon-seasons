/**
 * Smart Routing Utility:
 * Suggests default virtual folder hierarchy paths based on TaxonomyNode dot paths
 * WITHOUT creating any database-level foreign key or relational constraint.
 */
export function suggestFolderPathFromTaxonomyPath(taxonomyPath: string): string {
  if (!taxonomyPath) return '';

  const clean = taxonomyPath.trim().replace(/^\.+|\.+$/g, '');
  if (!clean) return '';

  // Split by dot (e.g., 'tech.apple.keynote')
  const segments = clean.split('.');

  // Convert each segment into a title-cased folder name (e.g. 'Tech', 'Apple', 'Keynote')
  const folderSegments = segments.map((seg) => {
    const word = seg.trim();
    if (!word) return '';
    // Capitalize first letter of words or hyphenated parts
    return word
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('-');
  }).filter(Boolean);

  return folderSegments.join('/');
}

export function normalizeFolderPath(rawPath: string): string {
  if (!rawPath) return '';
  return rawPath
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}

export function getFolderNameFromPath(normalizedPath: string): string {
  const parts = normalizedPath.split('/');
  return parts[parts.length - 1] || 'Folder';
}

/**
 * Canonical normalization for slug matching across hyphens, underscores, whitespace, and case.
 * e.g. "the_lemon_team" -> "thelemonteam"
 * e.g. "the-lemon-team" -> "thelemonteam"
 */
export function normalizeSlug(slug?: string | null): string {
  if (!slug) return '';
  return slug.toLowerCase().trim().replace(/[\s\-_]+/g, '');
}

/**
 * Checks whether two slugs match symmetrically, ignoring differences between hyphens, underscores, and case.
 */
export function slugsMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return normalizeSlug(a) === normalizeSlug(b);
}

/**
 * Returns candidate string variants for a given slug to support queries, lookups,
 * and Prisma filters across underscores and hyphens.
 * e.g. "the-lemon-team" -> ["the-lemon-team", "the_lemon_team", "thelemonteam"]
 */
export function getCandidateSlugVariants(slug?: string | null): string[] {
  if (!slug) return [];
  const trimmed = slug.trim();
  const lower = trimmed.toLowerCase();
  const hyphen = lower.replace(/_/g, '-');
  const underscore = lower.replace(/-/g, '_');
  const compressed = lower.replace(/[\s\-_]+/g, '');
  return Array.from(new Set([trimmed, lower, hyphen, underscore, compressed].filter(Boolean)));
}

