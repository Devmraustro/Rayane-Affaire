import '@/lib/server/guard';
import { getDb } from '@/db/client';

/**
 * Durable fixed-window rate limiter backed by SQLite.
 *
 * A process-local Map resets on every deploy and is not shared between
 * instances; a table survives both. Windows are aligned to `windowMs`, so a
 * bucket cannot be reset by waiting for a boundary.
 */
export function consume(
  bucket: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const db = getDb();
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((Math.floor(now / windowMs) * windowMs + windowMs - now) / 1000),
  );

  db.prepare(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1`,
  ).run(bucket, windowStart);

  const row = db
    .prepare('SELECT count FROM rate_limits WHERE bucket = ? AND window_start = ?')
    .get(bucket, windowStart) as { count: number };

  // Opportunistic cleanup keeps the table small without a cron job.
  if (Math.random() < 0.02) {
    db.prepare('DELETE FROM rate_limits WHERE window_start < ?').run(
      new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    );
  }

  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    retryAfterSeconds,
  };
}

/** Non-reversible fingerprint of a client identifier (no raw IPs stored). */
export function hashClientId(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
