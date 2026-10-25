/**
 * Hybrid Logical Clock (HLC).
 *
 * Serialized as a fixed-width, lexicographically sortable string:
 *   `<wallMs:13>-<counter:4>-<deviceId>`
 * so plain string comparison yields a total order that tolerates device clock drift.
 */

export interface HlcParts {
  wallMs: number;
  counter: number;
  deviceId: string;
}

const WALL_WIDTH = 13;
const COUNTER_WIDTH = 4;

export function formatHlc(parts: HlcParts): string {
  const wall = String(Math.max(0, Math.floor(parts.wallMs))).padStart(WALL_WIDTH, '0');
  const counter = String(parts.counter).padStart(COUNTER_WIDTH, '0');
  return `${wall}-${counter}-${parts.deviceId}`;
}

export function parseHlc(hlc: string): HlcParts {
  const match = /^(\d{13})-(\d{4})-(.*)$/.exec(hlc);
  if (!match) throw new Error(`Invalid HLC: ${hlc}`);
  return { wallMs: Number(match[1]), counter: Number(match[2]), deviceId: match[3] };
}

/** Returns <0, 0, >0. Missing clocks sort before everything. */
export function compareHlc(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxHlc(a: string | null | undefined, b: string | null | undefined): string | null {
  return compareHlc(a, b) >= 0 ? (a ?? null) : (b ?? null);
}

/** Generates the next local HLC (call for every locally produced event). */
export function tickHlc(prev: string | null | undefined, nowMs: number, deviceId: string): string {
  const p = prev ? parseHlc(prev) : null;
  if (!p || nowMs > p.wallMs) return formatHlc({ wallMs: nowMs, counter: 0, deviceId });
  return formatHlc({ wallMs: p.wallMs, counter: p.counter + 1, deviceId });
}

/** Advances the local clock after observing a remote HLC (call for every applied remote event). */
export function receiveHlc(
  local: string | null | undefined,
  remote: string,
  nowMs: number,
  deviceId: string,
): string {
  const l = local ? parseHlc(local) : { wallMs: 0, counter: 0, deviceId };
  const r = parseHlc(remote);
  const wall = Math.max(l.wallMs, r.wallMs, nowMs);
  let counter = 0;
  if (wall === l.wallMs && wall === r.wallMs) counter = Math.max(l.counter, r.counter) + 1;
  else if (wall === l.wallMs) counter = l.counter + 1;
  else if (wall === r.wallMs) counter = r.counter + 1;
  return formatHlc({ wallMs: wall, counter, deviceId });
}
