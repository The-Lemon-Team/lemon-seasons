import * as os from 'os';
import { BusDriverKind } from '../types/provenance.types.js';
import { ILemonBusTransport } from '../types/bus-contract.types.js';
import { InMemoryBusTransport } from './in-memory.transport.js';
import { SupabaseBusTransport } from './supabase.transport.js';
import { GoogleDriveFsTransport } from './gdrive-fs.transport.js';
import { GoogleDriveCloudTransport } from './gdrive-cloud.transport.js';
import { HybridBusTransport } from './hybrid.transport.js';
import { CloudHttpBusTransport } from './cloud-http.transport.js';

export interface CreateLemonBusOptions {
  driver?: BusDriverKind | 'auto' | 'fly';
  deviceId?: string;
  busUrl?: string;
  apiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  busDir?: string;
  sparksDir?: string | null;
  watchSparks?: boolean;
  getGoogleAccessToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

/**
 * Declarative Factory for LemonBus Transports.
 * Supports automatic resolution from options or environment variables:
 * - 'supabase': pure Supabase PostgREST + Realtime WebSocket
 * - 'hybrid': Supabase Primary + Google Drive FS/Cloud Bridge
 * - 'gdrive-cloud': Google Drive REST API v3 (no desktop app required)
 * - 'gdrive-fs': local Google Drive folder (chokidar + .json envelopes)
 * - 'memory': fast in-memory bus for tests and isolated dev
 */
export function createLemonBusTransport(options: CreateLemonBusOptions = {}): ILemonBusTransport {
  const deviceId =
    options.deviceId ||
    process.env.DEVICE_ID ||
    safeHostname() ||
    'lemon-node';

  const supabaseUrl =
    options.supabaseUrl ||
    process.env.LEMON_BUS_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseKey =
    options.supabaseKey ||
    process.env.LEMON_BUS_SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const busUrl =
    options.busUrl ||
    process.env.LEMON_BUS_URL ||
    '';

  const apiKey =
    options.apiKey ||
    process.env.LEMON_BUS_API_KEY ||
    '';

  const requestedDriver = (
    options.driver ||
    (process.env.LEMON_BUS_DRIVER as BusDriverKind | 'auto') ||
    'auto'
  ).toLowerCase();

  const hasSupabase = Boolean(supabaseUrl && supabaseKey);

  if (requestedDriver === 'memory') {
    return new InMemoryBusTransport({ deviceId });
  }

  if (requestedDriver === 'cloud' || requestedDriver === 'fly' || (requestedDriver === 'auto' && busUrl && !hasSupabase && !options.busDir && !process.env.GDRIVE_SYNC_FOLDER)) {
    if (busUrl) {
      return new CloudHttpBusTransport({
        busUrl,
        deviceId,
        apiKey,
        fetchImpl: options.fetchImpl,
      });
    }
    return new InMemoryBusTransport({ deviceId });
  }

  if (requestedDriver === 'supabase' || (requestedDriver === 'auto' && hasSupabase && !options.busDir && !process.env.GDRIVE_SYNC_FOLDER)) {
    if (!hasSupabase) {
      return new InMemoryBusTransport({ deviceId });
    }
    return new SupabaseBusTransport({
      supabaseUrl,
      supabaseKey,
      deviceId,
      fetchImpl: options.fetchImpl,
    });
  }

  if (requestedDriver === 'gdrive-cloud' && options.getGoogleAccessToken) {
    return new GoogleDriveCloudTransport({
      deviceId,
      getAccessToken: options.getGoogleAccessToken,
      fetchImpl: options.fetchImpl,
    });
  }

  if (requestedDriver === 'hybrid' || (requestedDriver === 'auto' && hasSupabase)) {
    const primary = new SupabaseBusTransport({
      supabaseUrl,
      supabaseKey,
      deviceId,
      fetchImpl: options.fetchImpl,
    });
    const secondary = options.getGoogleAccessToken
      ? new GoogleDriveCloudTransport({
          deviceId,
          getAccessToken: options.getGoogleAccessToken,
          fetchImpl: options.fetchImpl,
        })
      : new GoogleDriveFsTransport({
          deviceId,
          busDir: options.busDir,
          sparksDir: options.sparksDir,
          watchSparks: options.watchSparks,
        });

    return new HybridBusTransport({
      deviceId,
      primary,
      secondary,
    });
  }

  // Default fallback: Google Drive FS Transport
  return new GoogleDriveFsTransport({
    deviceId,
    busDir: options.busDir,
    sparksDir: options.sparksDir,
    watchSparks: options.watchSparks,
  });
}

function safeHostname(): string {
  try {
    return os.hostname().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  } catch {
    return 'lemon-node';
  }
}
