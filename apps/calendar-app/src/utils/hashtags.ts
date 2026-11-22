/**
 * Matches machine-generated user-UUID hashtags such as
 * `#user1f3e6a64-721c-4d1d-8d52-6c3f4e30d30b` or `user:1f3e6a64-...`
 * that carry no useful meaning for end users in the UI.
 */
const UNINFORMATIVE_HASHTAG_RE =
  /^#?user:?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true if a hashtag should be hidden from UI lists and cards. */
export function isUninformativeHashtag(tag: string): boolean {
  return UNINFORMATIVE_HASHTAG_RE.test(tag.trim());
}

/** Filters out uninformative machine-generated hashtags from a list of tags or tag objects. */
export function filterVisibleHashtags<T extends string | { name: string }>(
  tags: readonly T[] | undefined | null,
): T[] {
  if (!tags || tags.length === 0) return [];
  return tags.filter((tag) => {
    const raw = typeof tag === 'string' ? tag : tag.name;
    return !isUninformativeHashtag(raw);
  });
}
