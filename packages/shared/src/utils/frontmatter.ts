import { Note, LentaFrontmatter, ParsedMarkdownNote } from '../types';
import { NoteType } from '../constants';

export class LentaFrontmatterUtil {
  /**
   * Serializes a Note entity into a Markdown string with YAML frontmatter.
   * `lenta_id` is the primary identifier.
   */
  public static serializeNoteToMarkdown(note: Note): string {
    const lines: string[] = ['---'];

    // Strict Directive: lenta_id is the primary unique identifier
    lines.push(`lenta_id: "${note.id}"`);
    lines.push(`title: "${note.title.replace(/"/g, '\\"')}"`);

    if (note.feed?.slug) {
      lines.push(`feed: "${note.feed.slug}"`);
    }

    lines.push(`type: "${note.type}"`);
    lines.push(`start_date: "${note.startDate}"`);

    if (note.endDate) {
      lines.push(`end_date: "${note.endDate}"`);
    } else {
      lines.push(`end_date: null`);
    }

    // Folders
    const primaryFolder = note.folders?.find((f) => f.isPrimary)?.folder?.path || note.folders?.[0]?.folder?.path;
    if (primaryFolder) {
      lines.push(`primary_folder: "${primaryFolder}"`);
    }

    if (note.folders && note.folders.length > 0) {
      const folderPaths = Array.from(new Set(note.folders.map((f) => f.folder?.path || '').filter(Boolean)));
      if (folderPaths.length > 0) {
        lines.push(`folders:`);
        folderPaths.forEach((fp) => lines.push(`  - "${fp}"`));
      }
    }

    // Taxonomy tags
    if (note.tags && note.tags.length > 0) {
      const taxonomyPaths = note.tags.map((t) => t.path);
      lines.push(`taxonomy:`);
      taxonomyPaths.forEach((tp) => lines.push(`  - "${tp}"`));
    }

    // Hashtags
    if (note.hashtags && note.hashtags.length > 0) {
      const hashtags = note.hashtags.map((h) => h.name.replace(/^#/, ''));
      lines.push(`tags:`);
      hashtags.forEach((ht) => lines.push(`  - "${ht}"`));
    }

    // Links
    if (note.links && note.links.length > 0) {
      lines.push(`links:`);
      note.links.forEach((l) => {
        lines.push(`  - url: "${l.url}"`);
        if (l.title) lines.push(`    title: "${l.title.replace(/"/g, '\\"')}"`);
        if (l.isSource) lines.push(`    is_source: true`);
      });
    }

    // Images
    const mainImg = note.images?.find((img) => img.isMain) || note.images?.[0];
    if (mainImg?.url) {
      lines.push(`cover_image: "${mainImg.url}"`);
    }

    if (note.icon) {
      lines.push(`icon: "${note.icon}"`);
    }

    lines.push(`updated_at: "${note.updatedAt}"`);
    lines.push(`deleted: ${Boolean(note.deletedAt)}`);
    lines.push('---');
    lines.push('');

    // Body
    const desc = note.description || '';
    if (desc.trim().startsWith('# ')) {
      lines.push(desc.trim());
    } else {
      lines.push(`# ${note.title}`);
      lines.push('');
      if (desc.trim()) {
        lines.push(desc.trim());
      }
    }

    return lines.join('\n');
  }

  /**
   * Parses Markdown file content, extracting YAML frontmatter and note body.
   */
  public static parseMarkdown(content: string): ParsedMarkdownNote {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const frontmatter: LentaFrontmatter = {};
    let body = content;

    if (frontmatterMatch) {
      const yamlBlock = frontmatterMatch[1];
      body = content.replace(/^---\r?\n[\s\S]*?\r?\n---(\r?\n)?/, '').trim();
      this.parseYamlBlock(yamlBlock, frontmatter);
    }

    const inlineTags = this.extractInlineTags(body);
    const frontmatterTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    const allTags = Array.from(new Set([...frontmatterTags, ...inlineTags])).filter(Boolean);

    // lenta_id is the primary truth, fallback to id if lenta_id missing
    const lentaId = frontmatter.lenta_id || frontmatter.id || undefined;

    let title = frontmatter.title || '';
    if (!title) {
      const h1Match = body.match(/^#\s+(.+)$/m);
      if (h1Match) {
        title = h1Match[1].trim();
      }
    }

    return {
      frontmatter,
      body,
      title: title || 'Untitled Note',
      hashtags: allTags,
      lentaId,
    };
  }

  /**
   * Computes the vault relative path for a Lenta note.
   */
  public static getNoteVaultPath(note: Note, rootFolder = 'Lenta'): string {
    const cleanTitle = note.title.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Untitled';
    const primaryFolder = note.folders?.find((f) => f.isPrimary)?.folder?.path || note.folders?.[0]?.folder?.path;

    const parts: string[] = [rootFolder];

    if (primaryFolder) {
      parts.push(primaryFolder.replace(/^\/+|\/+$/g, ''));
    } else if (note.feed?.slug) {
      parts.push(`Feeds/${note.feed.slug}`);
    }

    return `${parts.join('/')}/${cleanTitle}.md`;
  }

  private static parseYamlBlock(yaml: string, target: Record<string, any>): void {
    const lines = yaml.split(/\r?\n/);
    let currentKey: string | null = null;
    let currentArray: any[] | null = null;
    let currentObject: Record<string, any> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const isSubItem = line.startsWith('    - ') || line.startsWith('    ');
      const isListItem = line.startsWith('  - ') || line.startsWith('- ');

      if (isListItem && currentKey) {
        const itemVal = trimmed.replace(/^-\s*/, '').trim();
        const colonIdx = itemVal.indexOf(':');

        if (colonIdx > 0) {
          // Object item in array
          const k = itemVal.slice(0, colonIdx).trim();
          const v = itemVal.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          currentObject = { [k]: v === 'true' ? true : v === 'false' ? false : v };
          if (!Array.isArray(target[currentKey])) target[currentKey] = [];
          target[currentKey].push(currentObject);
        } else {
          // Scalar item in array
          const clean = itemVal.replace(/^['"]|['"]$/g, '');
          if (!Array.isArray(target[currentKey])) target[currentKey] = [];
          target[currentKey].push(clean);
          currentObject = null;
        }
      } else if (isSubItem && currentObject) {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
          const k = trimmed.slice(0, colonIdx).trim();
          const v = trimmed.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          currentObject[k] = v === 'true' ? true : v === 'false' ? false : v;
        }
      } else {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
          const key = trimmed.slice(0, colonIdx).trim();
          let value = trimmed.slice(colonIdx + 1).trim();

          if (value === 'null') {
            target[key] = null;
            currentKey = null;
          } else if (value === 'true') {
            target[key] = true;
            currentKey = null;
          } else if (value === 'false') {
            target[key] = false;
            currentKey = null;
          } else if (value.startsWith('[') && value.endsWith(']')) {
            target[key] = value
              .slice(1, -1)
              .split(',')
              .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
              .filter(Boolean);
            currentKey = null;
          } else if (value === '') {
            target[key] = [];
            currentKey = key;
          } else {
            target[key] = value.replace(/^['"]|['"]$/g, '');
            currentKey = null;
          }
          currentObject = null;
        }
      }
    }
  }

  public static extractInlineTags(text: string): string[] {
    const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]+)(?=\s|$|[.,;:!?])/g;
    const tags: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(text)) !== null) {
      const tag = match[1];
      if (!/^\d+$/.test(tag)) {
        tags.push(tag);
      }
    }
    return tags;
  }
}
