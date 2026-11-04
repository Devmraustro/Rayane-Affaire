import '@/lib/server/guard';
import { NextResponse } from 'next/server';
import type { ApiFailure } from '@/types';

/** Uniform API envelope helpers so every route answers the same shape. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  fields?: Record<string, string>,
): NextResponse {
  const body: ApiFailure = { ok: false, error: { code, message, ...(fields ? { fields } : {}) } };
  return NextResponse.json(body, { status });
}

/**
 * Best-effort client identifier for rate limiting.
 *
 * Trusts `x-forwarded-for` only for its first hop because the app is expected to
 * sit behind a reverse proxy / platform edge (Vercel). The value is hashed by the
 * caller before storage — raw IPs are never persisted.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Rejects cross-site form posts on mutating endpoints. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin fetches may omit Origin
  try {
    const host = request.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
