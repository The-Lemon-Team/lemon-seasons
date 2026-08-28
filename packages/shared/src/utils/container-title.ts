/**
 * Resolves the display title for a container according to title priority:
 * 1. container.title (if present & non-empty)
 * 2. container.name (if present, non-empty, and not equal to container.id)
 * 3. container.description (if present, non-empty, and not equal to container.id)
 * 4. Human-formatted fallback based on container ID pattern (UUID, feed-, cont-, lenta_obs_)
 * 5. container.id / fallback string
 */
export function getContainerDisplayTitle(container?: {
  title?: string;
  name?: string;
  description?: string;
  id?: string;
} | null): string {
  if (!container) return 'Untitled Container';

  // 1. Explicit title property
  if (container.title && container.title.trim()) {
    return container.title.trim();
  }

  const id = container.id || '';

  // 2. Explicit name property (if present & not equal to raw UUID/id)
  if (container.name && container.name.trim() && container.name.trim() !== id) {
    return container.name.trim();
  }

  // 3. Fallback description property
  if (container.description && container.description.trim() && container.description.trim() !== id) {
    return container.description.trim();
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
    return `Obsidian Vault (${id.slice(0, 8)})`;
  }

  if (container.name && container.name.trim()) {
    return container.name.trim();
  }

  return id || 'Untitled Container';
}
