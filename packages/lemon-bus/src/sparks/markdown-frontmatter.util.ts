export interface ParsedMarkdownDocument {
  frontmatter: Record<string, any>;
  body: string;
  title: string | null;
  hashtags: string[];
}

/**
 * Lightweight, dependency-free Markdown + YAML frontmatter parser
 * usable in Node, Edge Functions, Supabase workers, and browsers.
 */
export function parseSparkMarkdown(raw: string): ParsedMarkdownDocument {
  const normalized = (raw || '').replace(/\r\n/g, '\n');
  let frontmatter: Record<string, any> = {};
  let body = normalized;

  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (fmMatch) {
    frontmatter = parseSimpleYamlBlock(fmMatch[1]);
    body = fmMatch[2] || '';
  }

  let title: string | null =
    typeof frontmatter.title === 'string' && frontmatter.title.trim()
      ? frontmatter.title.trim()
      : null;

  if (!title) {
    const h1Match = body.match(/^#\s+(.+)$/m);
    if (h1Match && h1Match[1]) {
      title = h1Match[1].trim();
    }
  }

  const inlineHashtags = extractInlineHashtags(body);
  const fmTags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean)
    : typeof frontmatter.tags === 'string'
    ? frontmatter.tags
        .split(/[,\s]+/)
        .map((t) => t.replace(/^#/, '').trim())
        .filter(Boolean)
    : [];

  const hashtags = Array.from(new Set([...fmTags, ...inlineHashtags]));

  return {
    frontmatter,
    body: body.trim(),
    title,
    hashtags,
  };
}

function parseSimpleYamlBlock(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentList: any[] | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && currentKey && currentList) {
      const val = stripQuotes(trimmed.slice(2).trim());
      currentList.push(coerceScalar(val));
      continue;
    }

    const colonIdx = rawLine.indexOf(':');
    if (colonIdx === -1) continue;

    const key = rawLine.slice(0, colonIdx).trim();
    const rawVal = rawLine.slice(colonIdx + 1).trim();

    if (!rawVal) {
      currentKey = key;
      currentList = [];
      result[key] = currentList;
      continue;
    }

    currentKey = null;
    currentList = null;

    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      const inner = rawVal.slice(1, -1).trim();
      result[key] = inner
        ? inner.split(',').map((item) => coerceScalar(stripQuotes(item.trim())))
        : [];
    } else {
      result[key] = coerceScalar(stripQuotes(rawVal));
    }
  }

  return result;
}

function stripQuotes(val: string): string {
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    return val.slice(1, -1);
  }
  return val;
}

function coerceScalar(val: string): any {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(val) && val.length < 15) {
    return Number(val);
  }
  return val;
}

function extractInlineHashtags(markdownBody: string): string[] {
  const withoutCode = markdownBody.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');
  const matches = withoutCode.match(/(?:^|\s)#([a-zA-Zа-яА-ЯёЁ0-9_-]{2,40})/g) || [];
  return matches
    .map((m) => m.trim().replace(/^#/, '').toLowerCase())
    .filter((tag) => !/^\d+$/.test(tag));
}
