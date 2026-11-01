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

/**
 * Strips duplicate title headers, frontmatter metadata blockquotes,
 * horizontal rules, and boilerplate section headers from note markdown.
 */
export function cleanNoteMarkdown(
  markdown?: string | null,
  options?: { title?: string | null }
): string {
  if (!markdown) return '';

  let text = markdown;

  // 1. Remove YAML frontmatter if present
  text = text.replace(/^---[\s\S]*?---\s*/mu, '');

  // 2. Strip leading heading if it duplicates or matches the note title
  if (options?.title) {
    const escaped = options.title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`^#+\\s*${escaped}\\s*[\\r\\n]*`, 'iu'), '');
  }
  // Strip generic top-level # title if present
  text = text.replace(/^#\s+[^\r\n]+[\r\n]*/u, '');

  // 3. Remove metadata blockquote lines (Источники, Тип записи, Резонанс, Оценка, Links, etc.)
  text = text.replace(
    /^>\s*\**\s*(?:Источники|Тип записи|Индекс резонанса|Резонанс|Оценка|Автор|Куратор|Теги|Категория)[^:\r\n]*:?\**[^\r\n]*\r?\n?/gmiu,
    ''
  );
  // Also strip any standalone blockquote lines that just refer to frontmatter or technical metadata
  text = text.replace(/^>\s*(?:см\.?\s*`?links`?|см\.?\s*frontmatter|тип записи|источники)[^\r\n]*\r?\n?/gmiu, '');

  // 4. Remove leading horizontal rules
  text = text.replace(/^---+\s*[\r\n]*/gmu, '');

  // 5. Remove leading section banners like "## 📌 Суть события" or "## Суть события"
  text = text.replace(
    /^##+\s*(?:[📌🔎🧭💡⚡✨]|\p{Extended_Pictographic})?\s*(?:Суть(?:\s*события)?|Ключевые факты|Главное|Детали|Контекст)[^\r\n]*\r?\n?/gmiu,
    ''
  );

  return text.trim();
}

/**
 * Extracts a clean, high-density snippet for cards and previews,
 * prioritizing note.summary if available, or cleaning raw markdown.
 */
export function extractCleanSnippet(
  markdown?: string | null,
  maxLength = 220,
  options?: {
    summary?: string | null;
    title?: string | null;
  }
): string {
  // If clean summary is available and informative, check if it contains raw markdown
  if (options?.summary && options.summary.trim().length > 10) {
    let summaryTrimmed = options.summary.trim();

    // If summary contains raw markdown headers, blockquotes, or dividers, sanitize it first
    if (
      summaryTrimmed.startsWith('#') ||
      summaryTrimmed.startsWith('>') ||
      summaryTrimmed.startsWith('---') ||
      summaryTrimmed.includes('\n## ') ||
      summaryTrimmed.includes('\n---')
    ) {
      summaryTrimmed = cleanNoteMarkdown(summaryTrimmed, { title: options?.title });
    }

    if (summaryTrimmed.length > 10) {
      if (summaryTrimmed.length <= maxLength) return summaryTrimmed;
      const truncated = summaryTrimmed.slice(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      return lastSpace > maxLength * 0.7 ? `${truncated.slice(0, lastSpace)}…` : `${truncated}…`;
    }
  }

  const cleaned = cleanNoteMarkdown(markdown, { title: options?.title });
  return truncateMarkdown(cleaned, maxLength);
}

