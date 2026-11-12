import { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { RouteContext, sendJson, isPublicPath } from './routes.common.js';
import { handleModerationRequest } from './moderation.routes.js';
import { handleSseStream, handlePublishEvent, handleQueryEvents } from './event.routes.js';
import { handleUpsertSpark, handleGetSpark } from './spark.routes.js';

// Re-export common types and utilities for backward compatibility
export { RouteContext, sendJson };

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
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

  // 1. Health check & stats
  if (pathname === '/health' || pathname === '/') {
    sendJson(res, 200, {
      status: 'ok',
      service: '@lenta/lemon-bus',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (pathname === '/stats' || pathname === '/status') {
    const stats = ctx.db.getStats();
    sendJson(res, 200, {
      ...stats,
      activeSubscribers: ctx.sse.count(),
      upstreamConnected: Boolean(ctx.upstreamRelay),
    });
    return;
  }

  // 2. Moderation API routes (/moderation/*)
  if (pathname.startsWith('/moderation')) {
    const handled = await handleModerationRequest(req, res, pathname, method, parsedUrl, ctx);
    if (handled) return;
  }

  // 3. SSE event stream
  if (pathname === '/events/stream') {
    handleSseStream(req, res, parsedUrl, ctx);
    return;
  }

  // 4. Events publish & query
  if (pathname === '/events') {
    if (method === 'POST') {
      await handlePublishEvent(req, res, ctx);
      return;
    }
    if (method === 'GET') {
      handleQueryEvents(res, parsedUrl, ctx);
      return;
    }
  }

  if (pathname === '/events/since') {
    handleQueryEvents(res, parsedUrl, ctx);
    return;
  }

  // 5. Ingestion of spark documents
  if (pathname === '/ingestion/sparks' && method === 'POST') {
    await handleUpsertSpark(req, res, ctx);
    return;
  }

  if (pathname === '/sparks' || pathname.startsWith('/sparks/')) {
    handleGetSpark(res, pathname, parsedUrl, ctx);
    return;
  }

  sendJson(res, 404, { error: 'Not found', path: pathname });
}
