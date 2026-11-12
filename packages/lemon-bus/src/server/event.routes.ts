import { IncomingMessage, ServerResponse } from 'node:http';
import * as crypto from 'node:crypto';
import { URL } from 'node:url';
import { RouteContext, sendJson, parseJsonBody } from './routes.common.js';
import { LemonBusEnvelope } from '../types/bus-contract.types.js';

export function handleSseStream(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: RouteContext
): void {
  const subscriberId = crypto.randomUUID();
  const feedSlug = url.searchParams.get('feedSlug') || undefined;
  const streamSlug = url.searchParams.get('streamSlug') || undefined;
  const excludeDeviceId = url.searchParams.get('excludeDeviceId') || undefined;
  const afterSeqParam = url.searchParams.get('afterSeq');

  ctx.sse.add({
    id: subscriberId,
    req,
    res,
    feedSlug,
    streamSlug,
    excludeDeviceId,
  });

  // Replay catchup events if requested
  if (afterSeqParam != null) {
    const afterSeq = parseInt(afterSeqParam, 10);
    if (!isNaN(afterSeq) && afterSeq >= 0) {
      const replay = ctx.db.queryEvents({
        afterSeq,
        feedSlug,
        streamSlug,
        limit: 200,
      });

      for (const item of replay.items) {
        if (excludeDeviceId && item.deviceId === excludeDeviceId) continue;
        const msg = `id: ${item.seq}\nevent: event\ndata: ${JSON.stringify(item)}\n\n`;
        res.write(msg);
      }
    }
  }
}

export async function handlePublishEvent(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const body = await parseJsonBody(req);
  if (!body || typeof body !== 'object') {
    sendJson(res, 400, { error: 'Payload must be a JSON object' });
    return;
  }

  // Support single envelope or array of envelopes (PostgREST style)
  const items = Array.isArray(body) ? body : [body];
  const savedItems: LemonBusEnvelope[] = [];

  for (const raw of items) {
    const envelope: Omit<LemonBusEnvelope, 'seq'> = {
      eventId: raw.eventId || raw.event_id || crypto.randomUUID(),
      entityType: raw.entityType || raw.entity_type || 'NOTE',
      action: raw.action || 'UPSERT',
      origin: raw.origin || raw.source || 'DIRECT_API',
      transportVia: raw.transportVia || raw.transport_via || 'hybrid',
      deviceId: raw.deviceId || raw.device_id || 'unknown-device',
      streamSlug: raw.streamSlug || raw.stream_slug || null,
      feedSlug: raw.feedSlug || raw.feed_slug || null,
      externalId: raw.externalId || raw.external_id || null,
      contentHash: raw.contentHash || raw.content_hash || null,
      privacy: raw.privacy || raw.payload?.privacy || 'private',
      payload: raw.payload ?? {},
      timestamp: raw.timestamp || raw.created_at || new Date().toISOString(),
    };

    const isModerationCandidate =
      envelope.action === 'PROPOSE' ||
      raw.payload?.status === 'PENDING_MODERATION' ||
      raw.payload?.status === 'PENDING' ||
      (envelope.entityType === 'WATCHER_ARTICLE' && raw.payload?.status !== 'PUBLISHED');

    if (isModerationCandidate) {
      envelope.action = 'PROPOSE';
      if (envelope.payload) {
        envelope.payload.status = 'PENDING_MODERATION';
      }
      try {
        ctx.db.moderation.upsertItem({
          id: envelope.payload?.id || envelope.externalId || envelope.eventId,
          title: envelope.payload?.title || 'Untitled Candidate Note',
          description: envelope.payload?.description || envelope.payload?.summary || null,
          summary: envelope.payload?.summary || null,
          rawContent: envelope.payload?.rawContent || null,
          folderPath: envelope.payload?.folderPath || null,
          feedSlug: envelope.feedSlug || envelope.payload?.feedSlug || null,
          streamSlug: envelope.streamSlug || envelope.payload?.streamSlug || null,
          category: envelope.payload?.category || null,
          type: envelope.payload?.type || 'SINGLE',
          privacy: envelope.privacy || 'private',
          startDate: envelope.payload?.startDate || envelope.timestamp,
          sourceLink: envelope.payload?.sourceLink || null,
          sourceType: envelope.payload?.sourceType || null,
          origin: envelope.origin || 'CODING_AGENT',
          author: envelope.payload?.author || null,
          resonanceScore: envelope.payload?.resonanceScore ?? 0,
          icon: envelope.payload?.icon || '📰',
          hashtags: Array.isArray(envelope.payload?.hashtags) ? envelope.payload.hashtags : [],
          status: 'PENDING',
          deviceId: envelope.deviceId,
          metadata: envelope.payload?.metadata || {},
        });
        ctx.sse.broadcastModeration({
          type: 'MODERATION_ITEM_ADDED',
          action: 'PROPOSED',
          noteId: envelope.payload?.id || envelope.eventId,
        });
      } catch (modErr) {
        console.warn('[LemonBus] Failed to queue item to moderation:', modErr);
      }
    }

    let saved: LemonBusEnvelope;
    try {
      saved = ctx.db.insertEvent(envelope);
    } catch (e: any) {
      if (e.message && e.message.includes('UNIQUE constraint failed: lemon_bus_events.event_id')) {
        continue;
      }
      throw e;
    }

    savedItems.push(saved);
    ctx.sse.broadcast(saved);
    if (ctx.upstreamRelay && saved.origin !== 'GDRIVE_SPARK' && saved.transportVia !== 'cloud') {
      ctx.upstreamRelay.publish(saved).catch(() => {});
    }
  }

  sendJson(res, 201, Array.isArray(body) ? savedItems : (savedItems[0] || { status: 'already_exists' }));
}

export function handleQueryEvents(res: ServerResponse, url: URL, ctx: RouteContext): void {
  const afterSeqStr = url.searchParams.get('afterSeq') || url.searchParams.get('after_seq');
  const feedSlug = url.searchParams.get('feedSlug') || url.searchParams.get('feed_slug') || undefined;
  const streamSlug = url.searchParams.get('streamSlug') || url.searchParams.get('stream_slug') || undefined;
  const action = url.searchParams.get('action') || undefined;
  const limitStr = url.searchParams.get('limit');

  const afterSeq = afterSeqStr ? parseInt(afterSeqStr, 10) : undefined;
  const limit = limitStr ? parseInt(limitStr, 10) : 50;

  const result = ctx.db.queryEvents({
    afterSeq: isNaN(afterSeq as number) ? undefined : afterSeq,
    feedSlug,
    streamSlug,
    action,
    limit,
  });

  sendJson(res, 200, result);
}
