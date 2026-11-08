import { IncomingMessage, ServerResponse } from 'node:http';
import * as crypto from 'node:crypto';
import { URL } from 'node:url';
import { BusDatabase } from './db.js';
import { SseManager } from './sse.js';
import { LemonBusEnvelope } from '../types/bus-contract.types.js';
import type { UpstreamBusRelay } from './upstream-relay.js';

export interface RouteContext {
  db: BusDatabase;
  sse: SseManager;
  apiKey?: string;
  upstreamRelay?: UpstreamBusRelay;
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const host = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url || '/', `http://${host}`);
  const pathname = parsedUrl.pathname;
  const method = (req.method || 'GET').toUpperCase();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-device-id');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Optional Token Authentication
  if (ctx.apiKey && !isPublicPath(pathname)) {
    const authHeader = req.headers.authorization;
    const apikeyHeader = req.headers.apikey as string | undefined;
    const queryToken = parsedUrl.searchParams.get('token');

    let providedKey: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7).trim();
    } else if (apikeyHeader) {
      providedKey = apikeyHeader.trim();
    } else if (queryToken) {
      providedKey = queryToken.trim();
    }

    if (providedKey !== ctx.apiKey) {
      sendJson(res, 401, { error: 'Unauthorized: Invalid or missing API key' });
      return;
    }
  }

  try {
    // 1. Health check
    if (pathname === '/health' || pathname === '/') {
      sendJson(res, 200, {
        status: 'ok',
        service: '@lenta/lemon-bus',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 2. Stats
    if (pathname === '/stats') {
      const stats = ctx.db.getStats();
      sendJson(res, 200, {
        ...stats,
        activeSubscribers: ctx.sse.count(),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 3. SSE Stream (GET /events/stream)
    if (pathname === '/events/stream' && method === 'GET') {
      handleSseStream(req, res, parsedUrl, ctx);
      return;
    }

    // 4. Events API (POST /events or /rest/v1/lemon_bus_events)
    if ((pathname === '/events' || pathname === '/rest/v1/lemon_bus_events') && method === 'POST') {
      await handlePublishEvent(req, res, ctx);
      return;
    }

    // 5. Events query (GET /events or /rest/v1/lemon_bus_events)
    if ((pathname === '/events' || pathname === '/rest/v1/lemon_bus_events') && method === 'GET') {
      handleQueryEvents(res, parsedUrl, ctx);
      return;
    }

    // 6. Spark Documents (POST /sparks)
    if (pathname === '/sparks' && method === 'POST') {
      await handleUpsertSpark(req, res, ctx);
      return;
    }

    // 7. Spark Document fetch (GET /sparks or GET /sparks/*)
    if (pathname.startsWith('/sparks') && method === 'GET') {
      handleGetSpark(res, pathname, parsedUrl, ctx);
      return;
    }

    // Fallthrough 404
    sendJson(res, 404, { error: `Not found: ${method} ${pathname}` });
  } catch (error: any) {
    console.error(`[LemonBus] Route handler error on ${method} ${pathname}:`, error);
    sendJson(res, 500, { error: error.message || 'Internal Server Error' });
  }
}

function isPublicPath(pathname: string): boolean {
  return pathname === '/health' || pathname === '/';
}

function handleSseStream(
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

async function handlePublishEvent(
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
      origin: raw.origin || 'DIRECT_API',
      transportVia: raw.transportVia || raw.transport_via || 'hybrid',
      deviceId: raw.deviceId || raw.device_id || 'unknown-device',
      streamSlug: raw.streamSlug || raw.stream_slug || null,
      feedSlug: raw.feedSlug || raw.feed_slug || null,
      externalId: raw.externalId || raw.external_id || null,
      contentHash: raw.contentHash || raw.content_hash || null,
      privacy: raw.privacy || 'private',
      payload: raw.payload ?? {},
      timestamp: raw.timestamp || raw.created_at || new Date().toISOString(),
    };

    let saved: LemonBusEnvelope;
    try {
      saved = ctx.db.insertEvent(envelope);
    } catch (e: any) {
      // If UNIQUE constraint on event_id failed, return existing event
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

function handleQueryEvents(res: ServerResponse, url: URL, ctx: RouteContext): void {
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

async function handleUpsertSpark(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const body = await parseJsonBody(req);
  if (!body || !body.canonicalPath || !body.contentMarkdown) {
    sendJson(res, 400, { error: 'canonicalPath and contentMarkdown are required' });
    return;
  }

  const result = ctx.db.upsertSparkDocument({
    id: body.id || crypto.randomUUID(),
    canonicalPath: body.canonicalPath,
    fileName: body.fileName || body.canonicalPath.split('/').pop() || 'untitled.md',
    folderPath: body.folderPath || '',
    feedSlug: body.feedSlug || 'sparks',
    title: body.title || 'Untitled Spark',
    contentMarkdown: body.contentMarkdown,
    frontmatter: body.frontmatter || {},
    contentHash: body.contentHash || crypto.createHash('sha256').update(body.contentMarkdown).digest('hex'),
    privacy: body.privacy || 'private',
    originProvider: body.originProvider || 'CLOUD_SPARK',
    updatedByDevice: body.updatedByDevice || 'cloud-relay',
  });

  sendJson(res, 200, { ok: true, spark: result });
}

function handleGetSpark(
  res: ServerResponse,
  pathname: string,
  url: URL,
  ctx: RouteContext
): void {
  let canonicalPath = url.searchParams.get('canonicalPath') || url.searchParams.get('path');
  if (!canonicalPath && pathname.startsWith('/sparks/')) {
    canonicalPath = decodeURIComponent(pathname.slice('/sparks/'.length));
  }

  if (!canonicalPath) {
    sendJson(res, 400, { error: 'canonicalPath query parameter is required' });
    return;
  }

  const doc = ctx.db.getSparkDocument(canonicalPath);
  if (!doc) {
    sendJson(res, 404, { error: 'Document not found' });
    return;
  }

  sendJson(res, 200, doc);
}

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 10 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Malformed JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any): void {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}
