import { IncomingMessage, ServerResponse } from 'node:http';
import * as crypto from 'node:crypto';
import { URL } from 'node:url';
import { RouteContext, sendJson, parseJsonBody } from './routes.common.js';
import { processSparkDocument } from '../sparks/spark-document.processor.js';

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

export function handleSparkStatus(res: ServerResponse, ctx: RouteContext): void {
  const stats = ctx.db.getStats();
  if (ctx.localWatcher) {
    const localStatus = ctx.localWatcher.getStatus();
    sendJson(res, 200, {
      ...localStatus,
      cloudMode: Boolean(ctx.gdriveWatcher || ctx.upstreamRelay),
    });
    return;
  }

  sendJson(res, 200, {
    isWatching: Boolean(ctx.gdriveWatcher),
    cloudMode: Boolean(ctx.gdriveWatcher || ctx.upstreamRelay),
    watchedDir: ctx.gdriveWatcher ? 'Google Drive API' : 'lemon-bus-server',
    filesProcessed: stats.totalSparks,
    filesPending: 0,
    filesFailed: 0,
  });
}

export function handleListSparks(res: ServerResponse, url: URL, ctx: RouteContext): void {
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const items = ctx.db.listSparkDocuments(limit);
  sendJson(res, 200, items);
}

export async function handleScanSparks(res: ServerResponse, ctx: RouteContext): Promise<void> {
  if (ctx.localWatcher) {
    const result = await ctx.localWatcher.scanDirectory();
    sendJson(res, 200, result);
    return;
  }
  if (ctx.gdriveWatcher) {
    const ingested = await ctx.gdriveWatcher.pollChanges();
    sendJson(res, 200, { scanned: ingested, ingested });
    return;
  }
  sendJson(res, 200, { scanned: 0, ingested: 0 });
}

export async function handleCreateTestSpark(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext,
): Promise<void> {
  const body = (await parseJsonBody(req)) || {};
  if (ctx.localWatcher) {
    const created = await ctx.localWatcher.createTestSparkFile({
      title: body.title,
      summary: body.summary,
      content: body.content,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    sendJson(res, 201, created);
    return;
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `spark-demo-${dateStr}.md`;
  const virtualPath = `Spark/${fileName}`;
  const title = body.title || `Gemini Spark: Инсайт от ${new Date().toLocaleDateString('ru-RU')}`;
  const summary = body.summary || 'Тестовый инсайт Gemini Spark для проверки конвейера LemonBus.';
  const tags: string[] = Array.isArray(body.tags) ? body.tags : ['gemini-spark', 'auto-ingest', 'test'];
  const contentMarkdown = `---
title: "${title}"
start_date: "${new Date().toISOString()}"
type: "SINGLE"
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
icon: "⚡"
summary: "${summary}"
---

# ${title}

${body.content || 'Автоматически сгенерированный тестовый документ для проверки облачной шины LemonBus.'}
`;

  const processed = processSparkDocument({
    virtualPath,
    contentMarkdown,
    origin: 'SUPABASE_SPARK',
  });

  ctx.db.upsertSparkDocument({
    id: processed.notePayload.id,
    canonicalPath: processed.canonicalPath,
    fileName: processed.fileName,
    folderPath: processed.folderPath,
    feedSlug: processed.feedTarget.slug,
    title: processed.notePayload.title,
    contentMarkdown,
    frontmatter: processed.frontmatter,
    contentHash: processed.contentHash,
    privacy: processed.notePayload.privacy,
    originProvider: 'SUPABASE_SPARK',
    updatedByDevice: 'lemon-bus-server',
  });

  const saved = ctx.db.insertEvent({
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    deviceId: 'lemon-bus-server',
    entityType: 'NOTE',
    action: 'UPSERT',
    origin: processed.notePayload.origin,
    transportVia: 'cloud',
    feedSlug: processed.feedTarget.slug,
    externalId: processed.canonicalPath,
    contentHash: processed.contentHash,
    privacy: processed.notePayload.privacy,
    payload: processed.notePayload,
  });
  ctx.sse.broadcast(saved);

  sendJson(res, 201, { filePath: processed.canonicalPath, fileName });
}
