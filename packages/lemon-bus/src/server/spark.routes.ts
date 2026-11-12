import { IncomingMessage, ServerResponse } from 'node:http';
import * as crypto from 'node:crypto';
import { URL } from 'node:url';
import { RouteContext, sendJson, parseJsonBody } from './routes.common.js';

export async function handleUpsertSpark(
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
    contentHash:
      body.contentHash || crypto.createHash('sha256').update(body.contentMarkdown).digest('hex'),
    privacy: body.privacy || 'private',
    originProvider: body.originProvider || 'CLOUD_SPARK',
    updatedByDevice: body.updatedByDevice || 'cloud-relay',
  });

  sendJson(res, 200, { ok: true, spark: result });
}

export function handleGetSpark(
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

  const spark = ctx.db.getSparkDocument(canonicalPath);
  if (!spark) {
    sendJson(res, 404, { error: 'Spark document not found', canonicalPath });
    return;
  }

  sendJson(res, 200, spark);
}
