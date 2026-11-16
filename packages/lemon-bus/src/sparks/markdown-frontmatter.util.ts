export interface ExtractedRelatedNoteItem {
  raw: string;
  cleanTitle: string;
  alias?: string;
  role?: 'parent' | 'podcast' | 'knowledge_graph' | 'related' | string;
  relation?: string;
  isParent?: boolean;
  isVaultDoc?: boolean;
}

export interface ExtractedRelatedLinksResult {
  links: string[];
  cleanedBody: string;
  rawRelatedSection?: string;
  extractedSourceLink?: string;
  richItems: ExtractedRelatedNoteItem[];
}

export interface ParsedMarkdownDocument {
  frontmatter: Record<string, any>;
  body: string;
  title: string | null;
  hashtags: string[];
}

export const RELATED_SECTION_REGEX =
  /(?:(?:\r?\n|^)---)?\s*(?:(?:\r?\n|^)##\s*🔗?\s*(?:Связанные\s+(?:записи|файлы|заметки|материалы(?:[^\r\n]*)?)|Источники\s+и\s+(?:связи|материалы(?:[^\r\n]*)?)|Связи(?:\s*\(Граф\s+знаний\))?|Полный\s+перечень\s+заметок\s+выпуска))[\s\S]*$/i;

/**
 * Extracts wikilinks and trailing related/sources sections from Spark Markdown.
 * Preserves semantic roles (`parent`, `podcast`, `knowledge_graph`, `related`)
 * and strips the trailing section from `cleanedBody`.
 */
export function extractSparkRelatedLinks(
  body: string,
  frontmatter?: Record<string, any>,
): ExtractedRelatedLinksResult {
  const linksSet = new Set<string>();
  const richItems: ExtractedRelatedNoteItem[] = [];
  let extractedSourceLink: string | undefined = undefined;

  const pushLink = (
    rawLink: string,
    opts: { role?: string; relation?: string; isParent?: boolean } = {},
  ) => {
    const clean = rawLink.replace(/^\[\[|\]\]$/g, '').trim();
    if (!clean || clean.toLowerCase().includes('другая заметка') || linksSet.has(clean)) {
      return;
    }
    linksSet.add(clean);
    const pipeIdx = clean.indexOf('|');
    const targetName = pipeIdx >= 0 ? clean.slice(0, pipeIdx).trim() : clean;
    const alias = pipeIdx >= 0 ? clean.slice(pipeIdx + 1).trim() : undefined;
    const cleanTitle = targetName
      .replace(/^\d{2}\.\d{2}\.\d{2,4}\s*[-_—–]?\s*/, '')
      .replace(/^\d{4}-\d{2}-\d{2}\s*[-_—–]?\s*/, '')
      .trim();

    richItems.push({
      raw: clean,
      cleanTitle: cleanTitle || targetName,
      alias,
      role: opts.role || 'related',
      relation: opts.relation,
      isParent: opts.isParent,
      isVaultDoc: targetName.startsWith('00 - ') || targetName.toLowerCase().includes('источники'),
    });
  };

  const fmLinks = [
    ...(Array.isArray(frontmatter?.related_notes) ? frontmatter.related_notes : []),
    ...(Array.isArray(frontmatter?.related_files) ? frontmatter.related_files : []),
  ];
  for (const raw of fmLinks) {
    if (typeof raw === 'string') {
      pushLink(raw, { role: 'related' });
    }
  }

  let cleanedBody = body || '';
  let rawRelatedSection: string | undefined = undefined;

  const match = cleanedBody.match(RELATED_SECTION_REGEX);
  if (match) {
    rawRelatedSection = match[0].trim();
    cleanedBody = cleanedBody.replace(RELATED_SECTION_REGEX, '').trim();

    const sectionTextWithoutComments = rawRelatedSection.replace(/<!--[\s\S]*?-->/g, '');
    const lines = sectionTextWithoutComments.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const sourceMatch = line.match(
        /(?:Первоисточник|Ссылка\s+на\s+первоисточник|Источник):\s*(?:\[(.*?)\]\((https?:\/\/[^\s\)]+)\)|(https?:\/\/[^\s\)]+))/i,
      );
      if (sourceMatch && !extractedSourceLink) {
        extractedSourceLink = sourceMatch[2] || sourceMatch[3];
      }

      const wikiMatches = [...line.matchAll(/\[\[(.*?)\]\]/g)];
      if (wikiMatches.length === 0) continue;

      let role = 'related';
      let relation: string | undefined = undefined;
      let isParent = false;

      if (/Сводный\s+выпуск|Сводка/i.test(line)) {
        role = 'parent';
        isParent = true;
      } else if (/Сценарий\s+подкаста|Подкаст/i.test(line)) {
        role = 'podcast';
      } else {
        const kgMatch = line.match(/Связано\s+с\s+([^:]+):/i);
        if (kgMatch) {
          role = 'knowledge_graph';
          relation = kgMatch[1].trim();
        }
      }

      for (const m of wikiMatches) {
        pushLink(m[1], { role, relation, isParent });
      }
    }
  }

  return {
    links: Array.from(linksSet),
    cleanedBody,
    rawRelatedSection,
    extractedSourceLink,
    richItems,
  };
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
  let currentObject: Record<string, any> | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && currentKey && currentList) {
      const itemBody = trimmed.slice(2).trim();
      const objMatch = itemBody.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (objMatch) {
        currentObject = {
          [objMatch[1]]: coerceScalar(stripQuotes(objMatch[2].trim())),
        };
        currentList.push(currentObject);
      } else {
        currentObject = null;
        currentList.push(coerceScalar(stripQuotes(itemBody)));
      }
      continue;
    }

    const isIndentedProperty = /^\s{2,}/.test(rawLine) && currentObject !== null;
    if (isIndentedProperty && currentObject) {
      const subMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (subMatch) {
        currentObject[subMatch[1]] = coerceScalar(stripQuotes(subMatch[2].trim()));
        continue;
      }
    }

    const colonIdx = rawLine.indexOf(':');
    if (colonIdx === -1) continue;

    const key = rawLine.slice(0, colonIdx).trim();
    const rawVal = rawLine.slice(colonIdx + 1).trim();

    if (!rawVal) {
      currentKey = key;
      currentList = [];
      currentObject = null;
      result[key] = currentList;
      continue;
    }

    currentKey = null;
    currentList = null;
    currentObject = null;

    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      const inner = rawVal.slice(1, -1).trim();
      result[key] = inner
        ? inner
            .split(',')
            .map((item) => coerceScalar(stripQuotes(item.trim())))
            .filter((v) => v !== '')
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
