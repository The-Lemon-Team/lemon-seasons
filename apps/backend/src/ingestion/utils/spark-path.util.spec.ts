import { describe, expect, it } from 'vitest';
import { toCanonicalSparkPath } from './spark-path.util';

describe('toCanonicalSparkPath', () => {
  it('normalizes Windows Google Drive paths to canonical spark/<rel> paths', () => {
    expect(
      toCanonicalSparkPath(
        'C:\\Users\\Ilege\\Мой диск\\spark\\AI\\01.11.26 - Digest.md',
        'C:/Users/Ilege/Мой диск/spark',
      ),
    ).toBe('spark/AI/01.11.26 - Digest.md');
  });

  it('normalizes Docker /app/sparks paths to the exact same canonical spark/<rel> path', () => {
    expect(
      toCanonicalSparkPath('/app/sparks/AI/01.11.26 - Digest.md', '/app/sparks'),
    ).toBe('spark/AI/01.11.26 - Digest.md');
  });

  it('normalizes paths even when watchedDir is omitted', () => {
    expect(
      toCanonicalSparkPath('C:\\Users\\Ilege\\Мой диск\\spark\\changelogsfeed\\google\\02.11.26 - Release.md'),
    ).toBe('spark/changelogsfeed/google/02.11.26 - Release.md');
    expect(
      toCanonicalSparkPath('/app/sparks/changelogsfeed/google/02.11.26 - Release.md'),
    ).toBe('spark/changelogsfeed/google/02.11.26 - Release.md');
  });

  it('is idempotent on already-canonical spark/ paths', () => {
    expect(toCanonicalSparkPath('spark/31.10.26 - A.md')).toBe('spark/31.10.26 - A.md');
    expect(toCanonicalSparkPath('spark/AI/01.11.26 - Digest.md')).toBe('spark/AI/01.11.26 - Digest.md');
  });
});
