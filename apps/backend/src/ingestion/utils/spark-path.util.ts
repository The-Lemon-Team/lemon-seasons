import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Converts any OS-specific or container-specific Spark file path into a canonical
 * cross-platform relative path starting with `spark/` and using forward slashes (`/`).
 *
 * Examples:
 * - `C:\Users\Ilege\Мой диск\spark\AI\01.11.26 - Digest.md` -> `spark/AI/01.11.26 - Digest.md`
 * - `/app/sparks/AI/01.11.26 - Digest.md` -> `spark/AI/01.11.26 - Digest.md`
 * - `spark/31.10.26 - A.md` -> `spark/31.10.26 - A.md`
 */
export function toCanonicalSparkPath(rawPath: string, watchedDir?: string): string {
  if (!rawPath) return rawPath;
  const norm = rawPath.replace(/\\/g, '/').trim();

  if (watchedDir) {
    const normWatched = watchedDir.replace(/\\/g, '/').replace(/\/+$/, '');
    if (norm.toLowerCase().startsWith(normWatched.toLowerCase() + '/')) {
      const rel = norm.slice(normWatched.length + 1).replace(/^\/+/, '');
      return `spark/${rel}`;
    }
  }

  // Fallback pattern matching for known Spark roots across Windows GDrive, Docker (/app/sparks), and local ~/.lemon/sparks-incoming
  const sparkRootMatch = norm.match(/(?:^|\/)(?:sparks-incoming|sparks|spark)\/(.+)$/i);
  if (sparkRootMatch && sparkRootMatch[1]) {
    return `spark/${sparkRootMatch[1].replace(/^\/+/, '')}`;
  }

  return norm;
}

export interface WatcherLockPayload {
  instanceId: string;
  pid: number;
  port: string;
  nodeEnv: string;
  hostname: string;
  updatedAt: number;
}

const LOCK_TTL_MS = 25_000;
const HEARTBEAT_INTERVAL_MS = 10_000;

/**
 * Coordinates single-instance file watching across Host (dev:local) and Docker (prod)
 * via a shared lock file in `uploads/.active-watcher.lock`.
 */
export class WatcherInstanceLock {
  private readonly instanceId: string;
  private readonly lockFilePath: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(lockDir?: string) {
    const baseDir = lockDir || path.join(process.cwd(), 'uploads');
    this.lockFilePath = path.join(baseDir, '.active-watcher.lock');
    this.instanceId = `${os.hostname()}-${process.pid}-${process.env.PORT || '3002'}`;
  }

  public tryAcquire(onConflict?: (holder: WatcherLockPayload) => void): boolean {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return true;
    }

    try {
      const dir = path.dirname(this.lockFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.lockFilePath)) {
        const raw = fs.readFileSync(this.lockFilePath, 'utf-8');
        const holder = JSON.parse(raw) as WatcherLockPayload;
        const ageMs = Date.now() - (holder.updatedAt || 0);

        if (holder.instanceId && holder.instanceId !== this.instanceId && ageMs < LOCK_TTL_MS) {
          // If same hostname and PID no longer exists, we can reclaim immediately
          const sameHost = holder.hostname === os.hostname();
          const pidAlive = sameHost ? this.isPidAlive(holder.pid) : true;
          if (pidAlive) {
            onConflict?.(holder);
            return false;
          }
        }
      }

      this.writeLock();
      this.startHeartbeat();
      return true;
    } catch {
      // Never block startup if filesystem lock check fails
      return true;
    }
  }

  public release(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    try {
      if (fs.existsSync(this.lockFilePath)) {
        const raw = fs.readFileSync(this.lockFilePath, 'utf-8');
        const holder = JSON.parse(raw) as WatcherLockPayload;
        if (holder.instanceId === this.instanceId) {
          fs.unlinkSync(this.lockFilePath);
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.writeLock();
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimer.unref?.();
  }

  private writeLock(): void {
    try {
      const payload: WatcherLockPayload = {
        instanceId: this.instanceId,
        pid: process.pid,
        port: String(process.env.PORT || '3002'),
        nodeEnv: process.env.NODE_ENV || 'development',
        hostname: os.hostname(),
        updatedAt: Date.now(),
      };
      fs.writeFileSync(this.lockFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Ignore transient write errors
    }
  }

  private isPidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
