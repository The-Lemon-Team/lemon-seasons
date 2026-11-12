import { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { ModerationService } from './moderation.service.js';
import { sendJson, parseJsonBody, RouteContext } from './routes.common.js';

export interface ModerationRouteContext {
  moderationService?: ModerationService;
}

export async function handleModerationRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  parsedUrl: URL,
  ctx: ModerationRouteContext
): Promise<boolean> {
  if (!pathname.startsWith('/moderation')) {
    return false;
  }

  const moderationService = ctx.moderationService;
  if (!moderationService) {
    sendJson(res, 503, { error: 'ModerationService not initialized' });
    return true;
  }

  // 1. Stats: GET /moderation/stats
  if (pathname === '/moderation/stats' && method === 'GET') {
    const stats = moderationService.getStats();
    sendJson(res, 200, stats);
    return true;
  }

  // 2. Import watcher items: POST /moderation/import-watcher-items
  if (pathname === '/moderation/import-watcher-items' && method === 'POST') {
    const body = await parseJsonBody(req);
    const limit = body?.limit ? parseInt(String(body.limit), 10) : 200;
    const result = moderationService.importWatcherItems(limit);
    sendJson(res, 200, { ok: true, ...result });
    return true;
  }

  // 3. Batch approve: POST /moderation/notes/batch-approve
  if (
    (pathname === '/moderation/notes/batch-approve' || pathname === '/moderation/items/batch-approve') &&
    method === 'POST'
  ) {
    const body = await parseJsonBody(req);
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.length === 0) {
      sendJson(res, 400, { error: 'ids array is required' });
      return true;
    }
    const result = moderationService.batchApprove(ids, body?.moderatorId);
    sendJson(res, 200, result);
    return true;
  }

  // 4. Batch reject: POST /moderation/notes/batch-reject
  if (
    (pathname === '/moderation/notes/batch-reject' || pathname === '/moderation/items/batch-reject') &&
    method === 'POST'
  ) {
    const body = await parseJsonBody(req);
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.length === 0) {
      sendJson(res, 400, { error: 'ids array is required' });
      return true;
    }
    const result = moderationService.batchReject(ids, body?.reason, body?.moderatorId);
    sendJson(res, 200, result);
    return true;
  }

  // 5. Query items: GET /moderation/notes or GET /moderation/items
  if (
    (pathname === '/moderation/notes' || pathname === '/moderation/items' || pathname === '/moderation') &&
    method === 'GET'
  ) {
    const status = (parsedUrl.searchParams.get('status') || 'PENDING') as any;
    const feedSlug = parsedUrl.searchParams.get('feedSlug') || parsedUrl.searchParams.get('feed_slug') || undefined;
    const category = parsedUrl.searchParams.get('category') || undefined;
    const search = parsedUrl.searchParams.get('search') || undefined;
    const limit = parseInt(parsedUrl.searchParams.get('limit') || '30', 10);
    const offset = parseInt(parsedUrl.searchParams.get('offset') || '0', 10);
    const sortBy = (parsedUrl.searchParams.get('sortBy') || 'createdAt') as any;
    const sortOrder = (parsedUrl.searchParams.get('sortOrder') || 'desc') as any;

    const result = moderationService.queryItems({
      status,
      feedSlug,
      category,
      search,
      limit: isNaN(limit) ? 30 : limit,
      offset: isNaN(offset) ? 0 : offset,
      sortBy,
      sortOrder,
    });
    sendJson(res, 200, result);
    return true;
  }

  // 6. Propose new item: POST /moderation/notes or POST /moderation/propose
  if (
    (pathname === '/moderation/notes' || pathname === '/moderation/propose' || pathname === '/moderation/items') &&
    method === 'POST'
  ) {
    const body = await parseJsonBody(req);
    if (!body || !body.title) {
      sendJson(res, 400, { error: 'title is required' });
      return true;
    }
    const item = moderationService.proposeItem(body);
    sendJson(res, 201, { ok: true, item });
    return true;
  }

  // 7. Parametric routes: /moderation/notes/:id[/approve | /reject]
  const notesMatch = pathname.match(/^\/moderation\/(?:notes|items)\/([^/]+)(?:\/(approve|reject))?$/);
  if (notesMatch) {
    const id = decodeURIComponent(notesMatch[1]);
    const action = notesMatch[2]; // approve, reject, or undefined

    // Approve: POST /moderation/notes/:id/approve
    if (action === 'approve' && method === 'POST') {
      const body = await parseJsonBody(req);
      const resData = moderationService.approveItem(id, body?.overrides, body?.moderatorId);
      if (!resData) {
        sendJson(res, 404, { error: `Item ${id} not found` });
        return true;
      }
      sendJson(res, 200, resData);
      return true;
    }

    // Reject: POST /moderation/notes/:id/reject
    if (action === 'reject' && method === 'POST') {
      const body = await parseJsonBody(req);
      const resData = moderationService.rejectItem(id, body?.reason, body?.moderatorId);
      if (!resData) {
        sendJson(res, 404, { error: `Item ${id} not found` });
        return true;
      }
      sendJson(res, 200, resData);
      return true;
    }

    // Get item: GET /moderation/notes/:id
    if (!action && method === 'GET') {
      const item = moderationService.getItemById(id);
      if (!item) {
        sendJson(res, 404, { error: `Item ${id} not found` });
        return true;
      }
      sendJson(res, 200, item);
      return true;
    }

    // Update item: PATCH /moderation/notes/:id
    if (!action && (method === 'PATCH' || method === 'PUT')) {
      const body = await parseJsonBody(req);
      const updated = moderationService.updateItem(id, body);
      if (!updated) {
        sendJson(res, 404, { error: `Item ${id} not found` });
        return true;
      }
      sendJson(res, 200, { ok: true, item: updated });
      return true;
    }
  }

  // If no match under /moderation
  sendJson(res, 404, { error: `Not found: ${method} ${pathname}` });
  return true;
}
