import '@/lib/server/guard';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { UPLOAD } from '@/lib/config';
import { stripImageMetadata, MetadataStripError } from './image-sanitize';

/**
 * Image upload handling.
 *
 * Security decisions:
 *  * The declared `Content-Type` and the file name are NOT trusted. The real
 *    format is detected from the magic bytes and must be JPEG/PNG/WebP/AVIF.
 *  * A hard byte cap is applied before writing anything to disk.
 *  * The stored name is a random UUID plus an extension derived from the
 *    *detected* type — a user-supplied name can never traverse directories or
 *    produce an executable extension.
 *  * Files are written under `data/uploads` (git-ignored) and served by a route
 *    handler that sets `Content-Type` from the detected type, not the request.
 *  * Embedded metadata is stripped before the file is written, so a phone photo
 *    cannot publish the GPS coordinates of a private address. A file whose
 *    metadata cannot be removed is refused rather than stored.
 */

export type DetectedType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

interface Detection {
  type: DetectedType;
  extension: string;
}

/** Magic-byte sniffing (no dependency, no file-name trust). */
export function detectImageType(bytes: Uint8Array): Detection | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { type: 'image/jpeg', extension: 'jpg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { type: 'image/png', extension: 'png' };
  }
  // WebP: "RIFF"…"WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { type: 'image/webp', extension: 'webp' };
  }
  // AVIF / HEIF: box size + "ftyp" + brand "avif"/"avis"
  if (
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
    bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66
  ) {
    return { type: 'image/avif', extension: 'avif' };
  }
  return null;
}

export interface StoredUpload {
  url: string;
  id: string;
  bytes: number;
  type: DetectedType;
}

export function uploadsDirectory(): string {
  return resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), 'data', 'uploads'));
}

/**
 * Validates and persists one uploaded file. Throws a typed error the route
 * handler maps to a 4xx response.
 */
export class UploadError extends Error {
  constructor(
    public code: 'TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'EMPTY' | 'UNSTRIPPABLE_METADATA',
    message: string,
  ) {
    super(message);
  }
}

export async function storeImage(file: File): Promise<StoredUpload> {
  if (file.size === 0) throw new UploadError('EMPTY', 'Empty file.');
  if (file.size > UPLOAD.maxFileBytes) {
    throw new UploadError(
      'TOO_LARGE',
      `File exceeds the ${Math.round(UPLOAD.maxFileBytes / 1024 / 1024)} MB limit.`,
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageType(buffer);
  if (!detected) {
    throw new UploadError('UNSUPPORTED_TYPE', 'Only JPEG, PNG, WebP or AVIF images are accepted.');
  }

  // Strip before writing: nothing unsanitised must ever touch the disk, because
  // a partially-written file is exactly what a later request could serve.
  let clean: Uint8Array;
  try {
    clean = stripImageMetadata(buffer, detected.type).bytes;
  } catch (error) {
    if (error instanceof MetadataStripError) {
      throw new UploadError('UNSTRIPPABLE_METADATA', error.message);
    }
    // Any unexpected parsing failure is treated the same way: refuse the file.
    throw new UploadError('UNSTRIPPABLE_METADATA', 'The image could not be sanitised.');
  }

  const dir = uploadsDirectory();
  mkdirSync(dir, { recursive: true });
  const id = randomUUID();
  const filename = `${id}.${detected.extension}`;
  writeFileSync(join(dir, filename), clean);

  return {
    url: `/api/media/${filename}`,
    id,
    bytes: clean.byteLength,
    type: detected.type,
  };
}

export function removeStoredFile(url: string): boolean {
  // Only files we generated may be removed: `/api/media/<uuid>.<ext>`.
  const match = /^\/api\/media\/([a-f0-9-]{36}\.(?:jpg|png|webp|avif))$/.exec(url);
  if (!match) return false;
  try {
    unlinkSync(join(uploadsDirectory(), match[1]));
    return true;
  } catch {
    return false;
  }
}

/** Extension allow-list used by the serving route. */
export const SERVABLE_EXTENSIONS: Record<string, DetectedType> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};
