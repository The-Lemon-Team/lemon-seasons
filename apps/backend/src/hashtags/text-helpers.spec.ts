import { describe, expect, it } from 'vitest';
import { HashtagsService } from './hashtags.service';
import { FoldersService } from '../folders/folders.service';

describe('HashtagsService (pure helpers)', () => {
  describe('Hashtags › normalizeName', () => {
    it.each([
      ['#AI', 'ai'],
      ['##Double', 'double'],
      ['  Spaced  ', 'spaced'],
      ['#Новости', 'новости'],
      ['snake_case-kebab', 'snake_case-kebab'],
      ['tag!@$%^&*()', 'tag'],
      ['with space', 'withspace'],
      ['#2026', '2026'],
      ['', ''],
    ])('%j → %j', (raw, expected) => {
      expect(HashtagsService.normalizeName(raw)).toBe(expected);
    });

    it('is safe for nullish input', () => {
      expect(HashtagsService.normalizeName(undefined as any)).toBe('');
      expect(HashtagsService.normalizeName(null as any)).toBe('');
    });
  });

  describe('Hashtags › extractFromText', () => {
    it('returns [] for empty input', () => {
      expect(HashtagsService.extractFromText()).toEqual([]);
      expect(HashtagsService.extractFromText('')).toEqual([]);
    });

    it('extracts and normalises tags, de-duplicating them', () => {
      expect(HashtagsService.extractFromText('Hello #AI and #ai plus #Новости')).toEqual(['ai', 'новости']);
    });

    it('does not treat markdown headings as tags', () => {
      expect(HashtagsService.extractFromText('# Heading\n## Another\ntext #real')).toEqual(['real']);
    });

    it('ignores # glued to a word (urls, anchors)', () => {
      expect(HashtagsService.extractFromText('see https://x.com/page#section and issue#42')).toEqual([]);
    });

    it('finds a tag at the very start of the text and after newlines', () => {
      expect(HashtagsService.extractFromText('#first\n#second')).toEqual(['first', 'second']);
    });
  });
});

describe('FoldersService (pure helpers)', () => {
  describe('Folders › normalizePath', () => {
    it.each([
      ['Spark/AI', 'Spark/AI'],
      ['/Spark/AI/', 'Spark/AI'],
      ['\\Spark\\AI\\', 'Spark/AI'],
      ['Spark//AI///Deep', 'Spark/AI/Deep'],
      ['  Spark/AI  ', 'Spark/AI'],
      ['/', ''],
      ['', ''],
    ])('%j → %j', (raw, expected) => {
      expect(FoldersService.normalizePath(raw)).toBe(expected);
    });

    it('is idempotent', () => {
      const once = FoldersService.normalizePath('\\a//b/');
      expect(FoldersService.normalizePath(once)).toBe(once);
    });

    it('is safe for nullish input', () => {
      expect(FoldersService.normalizePath(undefined as any)).toBe('');
    });
  });

  describe('Folders › getFolderName', () => {
    it.each([
      ['Spark/AI', 'AI'],
      ['Single', 'Single'],
      ['a/b/c ', 'c'],
      ['', 'Folder'],
      ['a/', 'Folder'],
    ])('%j → %j', (path, expected) => {
      expect(FoldersService.getFolderName(path)).toBe(expected);
    });
  });
});
