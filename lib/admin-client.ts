'use client';

import { CSRF_COOKIE, CSRF_HEADER } from '@/lib/config';

/**
 * Browser-side helper for authenticated writes.
 *
 * Every mutating request must echo the CSRF token that the server stored in the
 * session (double-submit cookie). Keeping this in one place means no admin form
 * can silently forget it.
 */

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export interface AdminFetchOptions {
  method?: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export interface AdminResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: { code: string; message: string; fields?: Record<string, string> };
}

export async function adminFetch<T = unknown>(
  url: string,
  { method = 'POST', body }: AdminFetchOptions = {},
): Promise<AdminResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER]: readCookie(CSRF_COOKIE),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      data?: T;
      error?: { code: string; message: string; fields?: Record<string, string> };
    };

    return {
      ok: response.ok && payload.ok !== false,
      status: response.status,
      data: payload.data,
      error: payload.error,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: { code: 'NETWORK', message: (error as Error).message },
    };
  }
}

/** Multipart upload (images) — same CSRF protection, no JSON body. */
export async function adminUpload(
  url: string,
  formData: FormData,
): Promise<AdminResult<{ url: string; id: string }[]>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { [CSRF_HEADER]: readCookie(CSRF_COOKIE) },
      body: formData,
      credentials: 'same-origin',
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      data?: { url: string; id: string }[];
      error?: { code: string; message: string };
    };
    return {
      ok: response.ok && payload.ok !== false,
      status: response.status,
      data: payload.data,
      error: payload.error,
    };
  } catch (error) {
    return { ok: false, status: 0, error: { code: 'NETWORK', message: (error as Error).message } };
  }
}
