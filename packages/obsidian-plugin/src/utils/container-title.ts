/**
 * Resolves the display title for a container according to title priority:
 * 1. container.title (if present & non-empty)
 * 2. container.name (if present, non-empty, and not equal to container.id)
 * 3. container.description (if present, non-empty, and not equal to container.id)
 * 4. Human-formatted fallback based on container ID pattern (UUID, feed-, cont-, lenta_obs_)
 * 5. container.id / fallback string
 *
 * Supports both object signature `getContainerDisplayTitle(container)`
 * and legacy two-argument signature `getContainerDisplayTitle(id, name)`.
 */
export function getContainerDisplayTitle(
  containerOrId?: {
    title?: string;
    name?: string;
    description?: string;
    id?: string;
  } | string | null,
  fallbackName?: string
): string {
  if (!containerOrId) return fallbackName || 'Untitled Container';

  let id = '';
  let title = '';
  let name = '';
  let description = '';

  if (typeof containerOrId === 'string') {
    id = containerOrId.trim();
    name = fallbackName ? fallbackName.trim() : '';
  } else if (typeof containerOrId === 'object') {
    id = containerOrId.id ? containerOrId.id.trim() : '';
    title = containerOrId.title ? containerOrId.title.trim() : '';
    name = containerOrId.name ? containerOrId.name.trim() : (fallbackName ? fallbackName.trim() : '');
    description = containerOrId.description ? containerOrId.description.trim() : '';
  }

  // 1. Explicit title property
  if (title) {
    return title;
  }

  // 2. Explicit name property (if present & not equal to raw UUID/id and not generic "Untitled Container")
  if (name && name !== id && name.toLowerCase() !== 'untitled container') {
    return name;
  }

  // 3. Fallback description property
  if (description && description !== id && description.toLowerCase() !== 'untitled container') {
    return description;
  }

  // 4. Formatted title from ID patterns
  if (id.startsWith('feed-')) {
    const slug = id.replace('feed-', '');
    return `Feed: ${slug.charAt(0).toUpperCase() + slug.slice(1)}`;
  }
  if (id.startsWith('cont-')) {
    const clean = id.replace('cont-', '');
    return `Vault Container (${clean.slice(0, 14)})`;
  }
  if (id.startsWith('lenta_obs_')) {
    const clean = id.replace('lenta_obs_', '');
    return `Obsidian Vault (${clean.slice(0, 14)})`;
  }

  // Check for standard UUID (8-4-4-4-12) or long hash string (>16 chars)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) || id.length > 20) {
    if (name && name !== id) {
      return name;
    }
    return `Obsidian Vault (${id.slice(0, 8)})`;
  }

  if (name) {
    return name;
  }

  return id || 'Untitled Container';
}
