import '@/lib/server/guard';

/**
 * Metadata stripping for uploaded images.
 *
 * Why this exists: a phone photo carries EXIF, and EXIF carries GPS. Publishing
 * an operator's or a client's photo unchanged would publish the exact coordinates
 * of a private home — the one thing the brief says must never happen. The brief
 * also forbids exposing private addresses, so this runs before anything is stored.
 *
 * No image library is used (the project has none, and adding a native module for
 * this would be a heavy dependency). Instead each container is rewritten at the
 * *metadata* level, keeping the compressed pixel data byte-for-byte:
 *
 *  * JPEG — drop APP1 (EXIF/XMP), APP13 (IPTC) and COM segments; keep APP0 (JFIF),
 *    APP2 (ICC colour profile) and APP14 (Adobe colour transform) so colours do
 *    not shift. Everything from SOS onwards (the actual scans) is copied verbatim.
 *  * PNG — keep only rendering-relevant chunks; drop eXIf, tEXt, zTXt, iTXt, tIME
 *    and any unknown chunk. CRCs are copied, not recomputed, because kept chunks
 *    are untouched.
 *  * WebP — drop the EXIF and XMP chunks and clear their flags in VP8X.
 *  * AVIF — the EXIF payload lives inside an ISO-BMFF `meta` item, which cannot be
 *    removed without rewriting item offsets and extents. Rather than ship an image
 *    whose GPS we merely *hope* is gone, a file that carries EXIF/XMP is rejected
 *    with an actionable message; a clean AVIF is stored as-is.
 *
 * Every function is total: on any structural surprise it throws, and the caller
 * refuses the upload. Failing closed is the only acceptable failure mode here.
 */

export type SanitizableType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

export class MetadataStripError extends Error {
  constructor(
    public code: 'MALFORMED' | 'UNSTRIPPABLE_METADATA',
    message: string,
  ) {
    super(message);
    this.name = 'MetadataStripError';
  }
}

/* -------------------------------------------------------------------------- */
/* JPEG                                                                        */
/* -------------------------------------------------------------------------- */

/** Segment markers that carry metadata rather than image data. */
const JPEG_DROP_MARKERS = new Set([
  0xe1, // APP1 — EXIF (GPS, camera, timestamps) and XMP
  0xe3, // APP3 — meta
  0xe4, // APP4
  0xe5, // APP5
  0xe6, // APP6
  0xe7, // APP7
  0xe8, // APP8
  0xe9, // APP9
  0xea, // APP10
  0xeb, // APP11
  0xec, // APP12 — Ducky
  0xed, // APP13 — Photoshop / IPTC
  0xef, // APP15
  0xfe, // COM — free-text comment
]);

export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  // SOI
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new MetadataStripError('MALFORMED', 'Not a JPEG stream.');
  }
  const head: number[] = [0xff, 0xd8];
  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw new MetadataStripError('MALFORMED', 'Expected a JPEG marker.');
    }
    // Fill bytes: runs of 0xFF are padding before a marker.
    let marker = bytes[offset + 1];
    let markerAt = offset;
    while (marker === 0xff) {
      markerAt += 1;
      marker = bytes[markerAt + 1];
    }

    // Start of scan: the rest of the file is entropy-coded image data.
    if (marker === 0xda) {
      return Uint8Array.from([...head, ...bytes.subarray(markerAt)]);
    }
    // End of image with no scan (degenerate but legal to copy).
    if (marker === 0xd9) {
      head.push(0xff, 0xd9);
      return Uint8Array.from(head);
    }
    // Standalone markers carry no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset = markerAt + 2;
      continue;
    }

    const length = (bytes[markerAt + 2] << 8) | bytes[markerAt + 3];
    if (length < 2) {
      throw new MetadataStripError('MALFORMED', 'Invalid JPEG segment length.');
    }
    const segmentEnd = markerAt + 2 + length;
    if (segmentEnd > bytes.length) {
      throw new MetadataStripError('MALFORMED', 'JPEG segment runs past end of file.');
    }

    if (!JPEG_DROP_MARKERS.has(marker)) {
      for (let i = markerAt; i < segmentEnd; i += 1) head.push(bytes[i]);
    }
    offset = segmentEnd;
  }

  // No SOS found: still a structurally valid header chain.
  return Uint8Array.from(head);
}

/* -------------------------------------------------------------------------- */
/* PNG                                                                         */
/* -------------------------------------------------------------------------- */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Chunks that affect rendering. Anything else — including every textual and EXIF
 * chunk, and every chunk we do not recognise — is dropped.
 */
const PNG_KEEP_CHUNKS = new Set([
  'IHDR', // image header (critical)
  'PLTE', // palette (critical)
  'IDAT', // image data (critical)
  'IEND', // end (critical)
  'tRNS', // transparency
  'gAMA', // gamma
  'cHRM', // chromaticity
  'sRGB', // colour space intent
  'iCCP', // embedded ICC profile (colour accuracy)
  'bKGD', // default background
  'pHYs', // pixel density
  'sBIT', // significant bits
  'hIST', // palette histogram
  'acTL', // APNG animation control
  'fcTL', // APNG frame control
  'fdAT', // APNG frame data
]);

export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new MetadataStripError('MALFORMED', 'Not a PNG stream.');
    }
  }
  const out: number[] = [...PNG_SIGNATURE];
  let offset = 8;

  while (offset + 8 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    const length = view.getUint32(0, false);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    const chunkEnd = offset + 12 + length; // length + type + data + CRC
    if (chunkEnd > bytes.length) {
      throw new MetadataStripError('MALFORMED', 'PNG chunk runs past end of file.');
    }
    if (PNG_KEEP_CHUNKS.has(type)) {
      for (let i = offset; i < chunkEnd; i += 1) out.push(bytes[i]);
    }
    offset = chunkEnd;
    if (type === 'IEND') return Uint8Array.from(out);
  }

  if (offset !== bytes.length) {
    throw new MetadataStripError('MALFORMED', 'Truncated PNG stream.');
  }
  return Uint8Array.from(out);
}

/* -------------------------------------------------------------------------- */
/* WebP                                                                        */
/* -------------------------------------------------------------------------- */

/** VP8X flag bits for metadata payloads (see the WebP container spec). */
const VP8X_FLAG_EXIF = 0x08;
const VP8X_FLAG_XMP = 0x04;

export function stripWebpMetadata(bytes: Uint8Array): Uint8Array {
  const ascii = (at: number): string =>
    String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  if (ascii(0) !== 'RIFF' || ascii(8) !== 'WEBP') {
    throw new MetadataStripError('MALFORMED', 'Not a WebP stream.');
  }

  const body: number[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = ascii(offset);
    const size =
      bytes[offset + 4] |
      (bytes[offset + 5] << 8) |
      (bytes[offset + 6] << 16) |
      (bytes[offset + 7] << 24);
    const padded = size + (size % 2);
    const chunkEnd = offset + 8 + padded;
    if (chunkEnd > bytes.length) {
      throw new MetadataStripError('MALFORMED', 'WebP chunk runs past end of file.');
    }

    if (fourcc === 'EXIF' || fourcc === 'XMP ') {
      // Dropped outright.
    } else if (fourcc === 'VP8X') {
      // Copy the chunk with the metadata flags cleared, so readers do not look
      // for chunks that are no longer there.
      for (let i = offset; i < chunkEnd; i += 1) body.push(bytes[i]);
      const flagsAt = body.length - padded; // first byte of the payload
      body[flagsAt] &= ~(VP8X_FLAG_EXIF | VP8X_FLAG_XMP);
    } else {
      for (let i = offset; i < chunkEnd; i += 1) body.push(bytes[i]);
    }
    offset = chunkEnd;
  }
  if (offset !== bytes.length) {
    throw new MetadataStripError('MALFORMED', 'Trailing bytes after the last WebP chunk.');
  }

  const rifsSize = 4 + body.length; // "WEBP" + chunks
  const out = new Uint8Array(8 + rifsSize);
  out.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  out[4] = rifsSize & 0xff;
  out[5] = (rifsSize >> 8) & 0xff;
  out[6] = (rifsSize >> 16) & 0xff;
  out[7] = (rifsSize >> 24) & 0xff;
  out.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  out.set(Uint8Array.from(body), 12);
  return out;
}

/* -------------------------------------------------------------------------- */
/* AVIF                                                                        */
/* -------------------------------------------------------------------------- */

const AVIF_METADATA_SIGNATURES = ['Exif', 'exif', 'http://ns.adobe.com/xap/'];

/** True when the AVIF container appears to carry EXIF or XMP. */
export function avifCarriesMetadata(bytes: Uint8Array): boolean {
  const haystack = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length).toString('latin1');
  return AVIF_METADATA_SIGNATURES.some((needle) => haystack.includes(needle));
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

export interface StripResult {
  bytes: Uint8Array;
  /** Bytes removed. Useful for logging; never contains the removed content. */
  removed: number;
}

/**
 * Removes embedded metadata from an image of a known type.
 *
 * Throws `MetadataStripError` when the file cannot be proven clean; callers must
 * treat that as a failed upload rather than storing the original.
 */
export function stripImageMetadata(bytes: Uint8Array, type: SanitizableType): StripResult {
  let stripped: Uint8Array;
  switch (type) {
    case 'image/jpeg':
      stripped = stripJpegMetadata(bytes);
      break;
    case 'image/png':
      stripped = stripPngMetadata(bytes);
      break;
    case 'image/webp':
      stripped = stripWebpMetadata(bytes);
      break;
    case 'image/avif':
      if (avifCarriesMetadata(bytes)) {
        throw new MetadataStripError(
          'UNSTRIPPABLE_METADATA',
          'This AVIF file carries embedded metadata. Save it again as JPEG or WebP to upload it.',
        );
      }
      stripped = bytes;
      break;
  }
  return { bytes: stripped, removed: bytes.length - stripped.length };
}
