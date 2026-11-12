import { IncomingMessage, ServerResponse } from 'node:http';
import { BusDatabase } from './db.js';
import { SseManager } from './sse.js';
import type { UpstreamBusRelay } from './upstream-relay.js';
import type { ModerationService } from './moderation.service.js';

export interface RouteContext {
  db: BusDatabase;
  sse: SseManager;
  apiKey?: string;
  upstreamRelay?: UpstreamBusRelay;
  moderationService?: ModerationService;
}

export function sendJson(res: ServerResponse, status: number, body: any): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 50 * 1024 * 1024) {
        req.destroy();
        resolve(null);
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/health' ||
    pathname === '/status' ||
    pathname.startsWith('/events/stream') ||
    pathname.startsWith('/moderation')
  );
}
