import * as http from 'node:http';
import { BusDatabase } from './db.js';
import { SseManager } from './sse.js';
import { handleRequest, RouteContext } from './routes.js';
import { GoogleDriveCloudWatcher } from './gdrive-watcher.js';
import { UpstreamBusRelay } from './upstream-relay.js';
import { ModerationDb } from './moderation.db.js';
import { ModerationService } from './moderation.service.js';
import { handleModerationRequest } from './moderation.routes.js';

export {
  BusDatabase,
  SseManager,
  handleRequest,
  RouteContext,
  GoogleDriveCloudWatcher,
  UpstreamBusRelay,
  ModerationDb,
  ModerationService,
  handleModerationRequest,
};

export interface ServerOptions {
  port?: number;
  host?: string;
  dbPath?: string;
  retentionDays?: number;
  apiKey?: string;
  upstreamBusUrl?: string;
  gdriveServiceAccount?: string;
  gdriveRootFolderId?: string;
  gdrivePollIntervalMs?: number;
}

export function startServer(options: ServerOptions = {}): http.Server {
  const port =
    options.port ??
    parseInt(
      process.env.LEMON_BUS_PORT ||
        (process.env.PORT && process.env.PORT !== '3002' ? process.env.PORT : '3030'),
      10
    );
  const host = options.host ?? process.env.HOST ?? '0.0.0.0';
  const retentionDays = options.retentionDays ?? parseInt(process.env.LEMON_BUS_RETENTION_DAYS || '30', 10);
  const apiKey = options.apiKey ?? process.env.LEMON_BUS_API_KEY;

  const db = new BusDatabase({
    dbPath: options.dbPath,
    retentionDays,
  });

  const sse = new SseManager(15000);

  const upstreamBusUrl =
    options.upstreamBusUrl ??
    process.env.LEMON_BUS_UPSTREAM_URL ??
    process.env.CLOUD_BUS_URL;

  let upstreamRelay: UpstreamBusRelay | null = null;
  if (upstreamBusUrl) {
    try {
      upstreamRelay = new UpstreamBusRelay({
        upstreamUrl: upstreamBusUrl,
        db,
        sse,
        apiKey,
        deviceId: process.env.DEVICE_ID || 'local-lemon-bus',
      });
      upstreamRelay.start().catch((err) => {
        console.error('[LemonBus] UpstreamBusRelay startup error:', err?.message);
      });
    } catch (err: any) {
      console.error('[LemonBus] Failed to initialize UpstreamBusRelay:', err?.message);
    }
  }

  const moderationService = new ModerationService({
    db,
    sse,
    deviceId: process.env.DEVICE_ID || 'lemon-bus-server',
    upstreamRelay: upstreamRelay || undefined,
  });

  const ctx: RouteContext = {
    db,
    sse,
    apiKey,
    upstreamRelay: upstreamRelay || undefined,
    moderationService,
  };

  const gdriveServiceAccount =
    options.gdriveServiceAccount ??
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ??
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  const gdriveRootFolderId =
    options.gdriveRootFolderId ??
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ??
    process.env.GOOGLE_DRIVE_SPARKS_FOLDER_ID;

  let gdriveWatcher: GoogleDriveCloudWatcher | null = null;
  if (gdriveServiceAccount && gdriveRootFolderId) {
    try {
      gdriveWatcher = new GoogleDriveCloudWatcher({
        serviceAccount: gdriveServiceAccount,
        rootFolderId: gdriveRootFolderId,
        db,
        sse,
        pollIntervalMs:
          options.gdrivePollIntervalMs ??
          parseInt(process.env.GOOGLE_DRIVE_POLL_INTERVAL_MS || '30000', 10),
      });
      gdriveWatcher.start().catch((err) => {
        console.error('[LemonBus] GoogleDriveCloudWatcher startup error:', err?.message);
      });
    } catch (err: any) {
      console.error('[LemonBus] Failed to initialize GoogleDriveCloudWatcher:', err?.message);
    }
  }

  const server = http.createServer((req, res) => {
    handleRequest(req, res, ctx).catch((err) => {
      console.error('[LemonBus] Top-level request error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
  });

  // Background buffer retention cleanup every 1 hour
  const purgeInterval = setInterval(() => {
    try {
      const purged = db.purgeExpiredBuffer(retentionDays);
      if (purged.purgedEvents > 0 || purged.purgedSparks > 0) {
        console.log(`[LemonBus] Purged expired buffer: ${purged.purgedEvents} events, ${purged.purgedSparks} sparks`);
      }
    } catch (err) {
      console.error('[LemonBus] Buffer purge error:', err);
    }
  }, 60 * 60 * 1000);
  if (purgeInterval.unref) {
    purgeInterval.unref();
  }

  server.listen(port, host, () => {
    console.log(`[LemonBus] Lemon Bus Server listening on http://${host}:${port}`);
    console.log(`[LemonBus] Retention: ${retentionDays} days, Auth: ${apiKey ? 'enabled' : 'open'}`);
  });

  const shutdown = () => {
    console.log('[LemonBus] Shutting down gracefully...');
    if (upstreamRelay) {
      upstreamRelay.stop().catch(() => {});
    }
    if (gdriveWatcher) {
      gdriveWatcher.stop().catch(() => {});
    }
    clearInterval(purgeInterval);
    sse.destroy();
    server.close(() => {
      console.log('[LemonBus] Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

// Auto-run if executed directly as entrypoint
const argv1 = (process.argv[1] || '').replace(/\\/g, '/');
const isMain =
  argv1.endsWith('server/index.js') ||
  argv1.endsWith('server/index.mjs') ||
  argv1.endsWith('/server') ||
  argv1.endsWith('server.js');
if (isMain || process.env.LEMON_BUS_RUN === 'true') {
  startServer();
}
