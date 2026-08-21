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
