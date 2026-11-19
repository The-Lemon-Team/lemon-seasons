import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  collectAncestorStreamSlugs,
  collectReachableStreamTree,
  resolveChildStreamRefs,
  StreamGraphNode,
  validateNestedStreamGraph,
} from './stream-graph.util';

describe('stream-graph.util (Nested Streams)', () => {
  const streams: StreamGraphNode[] = [
    {
      id: 's-leaf-ai',
      slug: 'leaf_ai',
      title: 'Leaf AI',
      privacy: 'public',
      feedIds: ['f-ai'],
      childStreamIds: [],
      tags: ['ai'],
      folderPaths: ['spark/ai/'],
    },
    {
      id: 's-leaf-clean',
      slug: 'leaf_clean',
      title: 'Leaf Clean',
      privacy: 'public',
      feedIds: [],
      childStreamIds: [],
      tags: [],
      folderPaths: [],
    },
    {
      id: 's-mid-tech',
      slug: 'mid_tech',
      title: 'Mid Tech',
      privacy: 'public',
      feedIds: ['f-habr', 'f-ai'], // intentional overlap with leaf_ai to verify dedup
      childStreamIds: ['s-leaf-ai', 's-leaf-clean'],
      tags: ['dev'],
      folderPaths: ['spark/dev/'],
    },
    {
      id: 's-root-radar',
      slug: 'root_radar',
      title: 'Root Radar',
      privacy: 'public',
      feedIds: ['f-daily'],
      childStreamIds: ['s-mid-tech'],
      tags: ['radar'],
      folderPaths: [],
    },
    {
      id: 's-secret',
      slug: 'secret_vault',
      title: 'Secret Vault',
      privacy: 'private',
      feedIds: ['f-secret'],
      childStreamIds: ['s-mid-tech'],
      tags: ['secret'],
      folderPaths: ['private/'],
    },
  ];

  it('resolves child stream references by both id and slug', () => {
    expect(resolveChildStreamRefs(['leaf_ai', 's-mid-tech', 'leaf_ai', 'missing'], streams)).toEqual([
      's-leaf-ai',
      's-mid-tech',
    ]);
  });

  it('collects criteria recursively across arbitrary nesting levels without duplicates', () => {
    const root = streams.find((s) => s.id === 's-root-radar')!;
    const tree = collectReachableStreamTree({
      rootStream: root,
      allStreams: streams,
      includePrivate: false,
    });

    expect(tree.streamIds).toEqual(['s-root-radar', 's-mid-tech', 's-leaf-ai', 's-leaf-clean']);
    expect(tree.feedIds).toEqual(['f-daily', 'f-habr', 'f-ai']);
    expect(tree.tags).toEqual(['radar', 'dev', 'ai']);
    expect(tree.folderPaths).toEqual(['spark/dev/', 'spark/ai/']);
    expect(tree.fallbackStreams).toEqual([{ slug: 'leaf_clean', title: 'Leaf Clean' }]);
  });

  it('allows a private stream to embed public streams, while blocking private descendants in public mode', () => {
    const secret = streams.find((s) => s.id === 's-secret')!;
    const tree = collectReachableStreamTree({
      rootStream: secret,
      allStreams: streams,
      includePrivate: true,
    });
    expect(tree.feedIds).toContain('f-secret');
    expect(tree.feedIds).toContain('f-habr');
    expect(tree.feedIds).toContain('f-ai');

    // If a dirty public root somehow pointed to s-secret, includePrivate=false skips s-secret
    const dirtyPublic: StreamGraphNode = {
      id: 's-dirty',
      slug: 'dirty',
      title: 'Dirty',
      privacy: 'public',
      childStreamIds: ['s-secret'],
    };
    const safeTree = collectReachableStreamTree({
      rootStream: dirtyPublic,
      allStreams: [...streams, dirtyPublic],
      includePrivate: false,
    });
    expect(safeTree.feedIds).toEqual([]);
  });

  it('rejects self-references, transitive cycles, and private-into-public nesting', () => {
    expect(() =>
      validateNestedStreamGraph({
        parentId: 's-leaf-ai',
        parentPrivacy: 'public',
        childIds: ['s-leaf-ai'],
        allStreams: streams,
      }),
    ).toThrow(BadRequestException);

    // s-leaf-ai cannot include s-root-radar because s-root-radar -> s-mid-tech -> s-leaf-ai
    expect(() =>
      validateNestedStreamGraph({
        parentId: 's-leaf-ai',
        parentPrivacy: 'public',
        childIds: ['s-root-radar'],
        allStreams: streams,
      }),
    ).toThrow(BadRequestException);

    // Public parent cannot include private child
    expect(() =>
      validateNestedStreamGraph({
        parentId: 's-root-radar',
        parentPrivacy: 'public',
        childIds: ['s-secret'],
        allStreams: streams,
      }),
    ).toThrow(BadRequestException);
  });

  it('terminates cleanly on cyclic data during traversal and ancestor lookup', () => {
    const cyclic: StreamGraphNode[] = [
      { id: 'a', slug: 'a', title: 'A', privacy: 'public', feedIds: ['f1'], childStreamIds: ['b'] },
      { id: 'b', slug: 'b', title: 'B', privacy: 'public', feedIds: ['f2'], childStreamIds: ['a'] },
    ];
    const tree = collectReachableStreamTree({
      rootStream: cyclic[0],
      allStreams: cyclic,
      includePrivate: false,
    });
    expect(tree.streamIds).toEqual(['a', 'b']);
    expect(tree.feedIds).toEqual(['f1', 'f2']);

    const ancestors = collectAncestorStreamSlugs({
      directStreamIds: ['b'],
      allStreams: cyclic,
    });
    expect(ancestors).toEqual(['b', 'a']);
  });
});
