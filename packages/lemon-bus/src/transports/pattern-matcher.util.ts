import { BusSubscriptionPattern, LemonBusEnvelope } from '../types/bus-contract.types.js';

export interface CompiledBusPattern {
  entityTypes: ReadonlySet<string> | null;
  actions: ReadonlySet<string> | null;
  origins: ReadonlySet<string> | null;
  streamSlugs: ReadonlySet<string> | null;
  feedSlugs: ReadonlySet<string> | null;
  privacy: 'public' | 'private' | 'all';
  excludeDeviceId: string | null;
}

export function compileBusPattern(pattern?: BusSubscriptionPattern): CompiledBusPattern {
  const toLowerSet = (arr?: string[]) =>
    arr && arr.length > 0 ? new Set(arr.map((s) => s.toLowerCase().trim()).filter(Boolean)) : null;

  return {
    entityTypes: pattern?.entityTypes?.length ? new Set(pattern.entityTypes) : null,
    actions: pattern?.actions?.length ? new Set(pattern.actions) : null,
    origins: pattern?.origins?.length ? new Set(pattern.origins) : null,
    streamSlugs: toLowerSet(pattern?.streamSlugs),
    feedSlugs: toLowerSet(pattern?.feedSlugs),
    privacy: pattern?.privacy || 'all',
    excludeDeviceId: pattern?.excludeDeviceId ? pattern.excludeDeviceId.toLowerCase() : null,
  };
}

export function matchesCompiledBusPattern(
  compiled: CompiledBusPattern,
  envelope: LemonBusEnvelope,
): boolean {
  if (compiled.excludeDeviceId && envelope.deviceId.toLowerCase() === compiled.excludeDeviceId) {
    return false;
  }

  if (compiled.privacy !== 'all' && envelope.privacy !== compiled.privacy) {
    return false;
  }

  if (compiled.entityTypes && !compiled.entityTypes.has(envelope.entityType)) {
    return false;
  }

  if (compiled.actions && !compiled.actions.has(envelope.action)) {
    return false;
  }

  if (compiled.origins && !compiled.origins.has(envelope.origin)) {
    return false;
  }

  if (compiled.streamSlugs) {
    const envStream = (envelope.streamSlug || envelope.payload?.streamSlug || '').toLowerCase();
    if (!envStream || !compiled.streamSlugs.has(envStream)) {
      return false;
    }
  }

  if (compiled.feedSlugs) {
    const envFeed = (envelope.feedSlug || envelope.payload?.feedSlug || '').toLowerCase();
    if (!envFeed || !compiled.feedSlugs.has(envFeed)) {
      return false;
    }
  }

  return true;
}
