import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { uploadsDirectory, SERVABLE_EXTENSIONS } from '@/lib/server/upload';

/**
 * GET /api/media/<uuid>.<ext> — serves an uploaded image.
 *
 * Path traversal is impossible: the name must match a strict UUID+extension
 * pattern, and the `Content-Type` comes from the extension allow-list rather
 * than from the request. Responses are immutable-friendly (the name is random).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await context.params;
  const match = /^([a-f0-9-]{36})\.(jpg|png|webp|avif)$/.exec(file);
  if (!match) return new Response('Not found', { status: 404 });

  try {
    const buffer = await readFile(join(uploadsDirectory(), file));
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': SERVABLE_EXTENSIONS[match[2]] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
