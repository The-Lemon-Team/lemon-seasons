import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

let cached: string | null = null;

/**
 * Stable identity of this backend instance. Mobile clients pair with it and refuse to sync
 * with any other server answering on a LAN address. Override with INSTANCE_ID.
 */
export function getInstanceId(): string {
  if (cached) return cached;
  if (process.env.INSTANCE_ID) return (cached = process.env.INSTANCE_ID);

  const file = path.resolve(process.env.INSTANCE_ID_FILE || path.join(process.cwd(), '.instance-id'));
  try {
    cached = fs.readFileSync(file, 'utf-8').trim();
    if (cached) return cached;
  } catch {
    /* generate below */
  }
  cached = crypto.randomUUID();
  try {
    fs.writeFileSync(file, cached, 'utf-8');
  } catch {
    /* read-only FS: id stays stable only for this process lifetime */
  }
  return cached;
}