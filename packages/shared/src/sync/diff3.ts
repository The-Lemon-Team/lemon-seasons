/**
 * Minimal line-based 3-way merge (diff3-style, conservative).
 * Hunks of both sides are computed against the base via LCS; overlapping or touching
 * non-identical hunks are reported as a conflict.
 */

interface Hunk {
  start: number; // base index (inclusive)
  end: number; // base index (exclusive)
  lines: string[]; // replacement lines
}

function diffHunks(base: string[], other: string[]): Hunk[] {
  const n = base.length;
  const m = other.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        base[i] === other[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;
  let cur: Hunk | null = null;
  const flush = () => {
    if (cur) hunks.push(cur);
    cur = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && base[i] === other[j]) {
      flush();
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      cur = cur ?? { start: i, end: i, lines: [] };
      cur.lines.push(other[j++]);
    } else {
      cur = cur ?? { start: i, end: i, lines: [] };
      i++;
      cur.end = i;
    }
  }
  flush();
  return hunks;
}

function conflicts(a: Hunk, b: Hunk): boolean {
  const aIns = a.start === a.end;
  const bIns = b.start === b.end;
  if (!aIns && !bIns) return a.start < b.end && b.start < a.end;
  if (aIns && bIns) return a.start === b.start;
  const [ins, other] = aIns ? [a, b] : [b, a];
  return ins.start >= other.start && ins.start <= other.end;
}

const sameLines = (a: string[], b: string[]) =>
  a.length === b.length && a.every((line, idx) => line === b[idx]);

export type Diff3Result = { clean: true; text: string } | { clean: false };

export function diff3Merge(base: string, local: string, remote: string): Diff3Result {
  const baseLines = base.split('\n');
  const a = diffHunks(baseLines, local.split('\n'));
  const b = diffHunks(baseLines, remote.split('\n'));

  const merged: Hunk[] = [];
  let ia = 0;
  let ib = 0;
  while (ia < a.length || ib < b.length) {
    const ha = a[ia];
    const hb = b[ib];
    if (ha && hb && conflicts(ha, hb)) {
      if (ha.start === hb.start && ha.end === hb.end && sameLines(ha.lines, hb.lines)) {
        merged.push(ha);
        ia++;
        ib++;
        continue;
      }
      return { clean: false };
    }
    if (!hb || (ha && ha.start <= hb.start)) {
      merged.push(ha);
      ia++;
    } else {
      merged.push(hb);
      ib++;
    }
  }

  const out: string[] = [];
  let pos = 0;
  for (const h of merged) {
    out.push(...baseLines.slice(pos, h.start), ...h.lines);
    pos = h.end;
  }
  out.push(...baseLines.slice(pos));
  return { clean: true, text: out.join('\n') };
}
