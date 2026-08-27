import { LentaContainerSummaryDto } from '../types';

export function isContainerPublic(c: {
  id?: string;
  name?: string;
  isPublic?: boolean;
  visibility?: 'public' | 'private';
  privacy?: 'private' | 'public';
}): boolean {
  if (c.privacy === 'private' || c.visibility === 'private' || c.isPublic === false) {
    return false;
  }
  if (c.privacy === 'public' || c.visibility === 'public' || c.isPublic === true) {
    return true;
  }
  const lowerId = (c.id || '').toLowerCase();
  const lowerName = (c.name || '').toLowerCase();

  const isPublicKw =
    lowerId === 'main-git-vault' ||
    lowerId === 'simple-notes' ||
    lowerId.startsWith('feed-') ||
    lowerId.includes('pub') ||
    lowerName.includes('pub');

  return isPublicKw;
}
