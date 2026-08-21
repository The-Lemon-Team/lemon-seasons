/**
 * Utility for producing clean, high-density text snippets from raw Markdown descriptions.
 */
export function truncateMarkdown(
  markdown?: string | null,
  maxLength = 180,
  options?: { preserveHeadings?: boolean }
): string {
  if (!markdown) return '';

  let text = markdown;

  // 1. Remove YAML frontmatter if present
  text = text.replace(/^---[\s\S]*?---\s*/, '');

  // 2. Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');

  // 3. Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // 4. Remove image embeds: ![[image.png]] or ![alt](url)
  text = text.replace(/!\[\[.*?\]\]/g, '');
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');

  // 5. Convert links [text](url) or [[page|text]] or [[page]] to plain text
  text = text.replace(/\[\[.*?\|(.*?)\]\]/g, '$1');
  text = text.replace(/\[\[(.*?)\]\]/g, '$1');
  text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');

  // 6. Remove headings hashes if not preserving
  if (!options?.preserveHeadings) {
    text = text.replace(/^#{1,6}\s+/gm, '');
  }

  // 7. Remove blockquotes and list markers
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/^[\*\-+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');

  // 8. Collapse whitespace and newlines
  text = text.replace(/\s+/g, ' ').trim();

  if (text.length <= maxLength) {
    return text;
  }

  // Truncate at last whole word
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return `${truncated.slice(0, lastSpace)}…`;
  }

  return `${truncated}…`;
}
