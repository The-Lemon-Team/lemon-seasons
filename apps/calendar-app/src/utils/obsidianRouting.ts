export interface ObsidianRouteInfo {
  containerId: string | null;
  tab: 'files' | 'history' | 'folders' | 'settings';
  folderPath: string;
  filePath: string | null;
}

/**
 * Parses the current pathname into structured Obsidian route parameters.
 * Supports:
 *   /obsidian
 *   /obsidian/:containerId
 *   /obsidian/:containerId/files
 *   /obsidian/:containerId/files/:folderPath
 *   /obsidian/:containerId/files/:filePath (if last segment has an extension like .md)
 *   /obsidian/:containerId/history
 *   /obsidian/:containerId/folders
 *   /obsidian/:containerId/settings
 */
export function parseObsidianRoute(pathname: string = window.location.pathname): ObsidianRouteInfo {
  try {
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    if (!cleanPath) {
      return { containerId: null, tab: 'files', folderPath: '', filePath: null };
    }

    const rawParts = cleanPath.split('/');
    const parts = rawParts.map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });

    if (parts[0] !== 'obsidian') {
      return { containerId: null, tab: 'files', folderPath: '', filePath: null };
    }

    const containerId = parts[1] || null;
    if (!containerId) {
      return { containerId: null, tab: 'files', folderPath: '', filePath: null };
    }

    const tabCandidate = parts[2] || 'files';
    let tab: 'files' | 'history' | 'folders' | 'settings' = 'files';
    let subparts: string[] = [];

    if (tabCandidate === 'history' || tabCandidate === 'folders' || tabCandidate === 'settings') {
      tab = tabCandidate;
      subparts = parts.slice(3);
    } else if (tabCandidate === 'files') {
      tab = 'files';
      subparts = parts.slice(3);
    } else {
      // Direct path after containerId
      tab = 'files';
      subparts = parts.slice(2);
    }

    let folderPath = '';
    let filePath: string | null = null;

    if (subparts.length > 0) {
      const fullSubpath = subparts.join('/');
      const last = subparts[subparts.length - 1];
      if (last.toLowerCase().endsWith('.md') || last.includes('.')) {
        filePath = fullSubpath;
        folderPath = subparts.slice(0, -1).join('/');
      } else {
        folderPath = fullSubpath;
      }
    }

    return { containerId, tab, folderPath, filePath };
  } catch {
    return { containerId: null, tab: 'files', folderPath: '', filePath: null };
  }
}

/**
 * Builds a canonical URL for an Obsidian container route.
 */
export function buildObsidianUrl({
  containerId,
  tab = 'files',
  folderPath = '',
  filePath = null,
}: {
  containerId?: string | null;
  tab?: 'files' | 'history' | 'folders' | 'settings';
  folderPath?: string;
  filePath?: string | null;
}): string {
  if (!containerId) return '/obsidian';
  const prefix = `/obsidian/${encodeURIComponent(containerId)}`;
  if (tab !== 'files') {
    return `${prefix}/${tab}`;
  }
  if (filePath) {
    const encodedFilePath = filePath
      .split('/')
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    return `${prefix}/files/${encodedFilePath}`;
  }
  if (folderPath) {
    const encodedFolderPath = folderPath
      .split('/')
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    return `${prefix}/files/${encodedFolderPath}`;
  }
  return `${prefix}/files`;
}

/**
 * Programmatically navigates to an Obsidian route without full page reload.
 */
export function navigateObsidian(params: {
  containerId?: string | null;
  tab?: 'files' | 'history' | 'folders' | 'settings';
  folderPath?: string;
  filePath?: string | null;
  replace?: boolean;
}) {
  const newUrl = buildObsidianUrl(params);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentUrl !== newUrl) {
    if (params.replace) {
      window.history.replaceState(null, '', newUrl);
    } else {
      window.history.pushState(null, '', newUrl);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
