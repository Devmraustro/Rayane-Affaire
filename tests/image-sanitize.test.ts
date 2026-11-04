import { describe, it, expect } from 'vitest';
import {
  stripImageMetadata,
  stripJpegMetadata,
  stripPngMetadata,
  stripWebpMetadata,
  avifCarriesMetadata,
  MetadataStripError,
} from '@/lib/server/image-sanitize';
import { detectImageType } from '@/lib/server/upload';

/* -------------------------------------------------------------------------- */
/* Helpers: hand-built containers, so the tests do not depend on fixtures.     */
/* -------------------------------------------------------------------------- */

/** A JPEG with an APP1 segment that carries GPS, then a minimal scan. */
function jpegWithGps(): Uint8Array {
  const gps = Buffer.from('Exif\0\0GPSLatitude=36.7511783,5.0643687', 'latin1');
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1]),
    Buffer.from([((gps.length + 2) >> 8) & 0xff, (gps.length + 2) & 0xff]),
    gps,
  ]);
  const jfif = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')]);
  const commentText = Buffer.from('GPS 36.7511', 'latin1');
  const comment = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from([0x00, commentText.length + 2]),
    commentText,
  ]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 1, 2, 3, 4]);
  const eoi = Buffer.from([0xff, 0xd9]);
  return new Uint8Array(Buffer.concat([Buffer.from([0xff, 0xd8]), jfif, app1, comment, sos, eoi]));
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); // not validated by the stripper; kept verbatim
  return Buffer.concat([length, Buffer.from(type, 'latin1'), data, crc]);
}

/** A PNG carrying both a tEXt GPS note and an eXIf chunk. */
function pngWithGps(): Uint8Array {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = pngChunk('IHDR', Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]));
  const text = pngChunk('tEXt', Buffer.from('GPSLatitude\0 36.7511783', 'latin1'));
  const exif = pngChunk('eXIf', Buffer.from('MM\0*GPS', 'latin1'));
  const phys = pngChunk('pHYs', Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 1]));
  const idat = pngChunk('IDAT', Buffer.from([1, 2, 3, 4]));
  const iend = pngChunk('IEND', Buffer.alloc(0));
  return new Uint8Array(Buffer.concat([signature, ihdr, text, exif, phys, idat, iend]));
}

function riffChunk(fourcc: string, payload: Buffer): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(payload.length, 0);
  const pad = payload.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
  return Buffer.concat([Buffer.from(fourcc, 'latin1'), size, payload, pad]);
}

/** A WebP with EXIF and XMP chunks and the VP8X flags that announce them. */
function webpWithGps(): Uint8Array {
  const vp8x = riffChunk('VP8X', Buffer.from([0x08 | 0x04, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  const exif = riffChunk('EXIF', Buffer.from('GPS 36.7511,5.0643', 'latin1'));
  const xmp = riffChunk('XMP ', Buffer.from('<x:xmpmeta>GPS</x:xmpmeta>', 'latin1'));
  const vp8 = riffChunk('VP8 ', Buffer.from([1, 2, 3, 4, 5, 6]));
  const body = Buffer.concat([vp8x, exif, xmp, vp8]);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WEBP', 8, 'latin1');
  return new Uint8Array(Buffer.concat([header, body]));
}

const latin1 = (bytes: Uint8Array): string =>
  Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length).toString('latin1');

/* -------------------------------------------------------------------------- */

describe('JPEG metadata stripping', () => {
  it('removes the GPS-bearing APP1 segment', () => {
    const input = jpegWithGps();
    expect(latin1(input)).toContain('GPSLatitude=36.7511783');

    const output = latin1(stripJpegMetadata(input));
    expect(output).not.toContain('GPSLatitude');
    expect(output).not.toContain('36.7511783');
  });

  it('removes comment segments, which are free text and just as leaky', () => {
    const output = latin1(stripJpegMetadata(jpegWithGps()));
    expect(output).not.toContain('GPS 36.7511');
  });

  it('keeps JFIF, the scan data and the EOI marker, so the image still decodes', () => {
    const output = stripJpegMetadata(jpegWithGps());
    const text = latin1(output);
    expect(text.startsWith('\xff\xd8')).toBe(true);
    expect(text).toContain('JFIF');
    // The scan data is preserved byte-for-byte, and the stream still ends at EOI.
    expect(Array.from(output.subarray(-6))).toEqual([1, 2, 3, 4, 0xff, 0xd9]);
  });

  it('is idempotent', () => {
    const once = stripJpegMetadata(jpegWithGps());
    const twice = stripJpegMetadata(once);
    expect(Array.from(twice)).toEqual(Array.from(once));
  });

  it('still detects as a JPEG after stripping', () => {
    const output = stripJpegMetadata(jpegWithGps());
    expect(detectImageType(output)?.type).toBe('image/jpeg');
  });

  it('preserves a realistic header chain (DQT/SOF0/DHT) and strips metadata anywhere in it', () => {
    const seg = (marker: number, payload: Buffer): Buffer =>
      Buffer.concat([
        Buffer.from([0xff, marker]),
        Buffer.from([((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff]),
        payload,
      ]);
    const dqt = seg(0xdb, Buffer.from([0, 1, 2, 3]));
    const sof0 = seg(0xc0, Buffer.from([8, 0, 1, 0, 1, 1, 1, 0x11, 0]));
    const dht = seg(0xc4, Buffer.from([0, 1, 2, 3]));
    // EXIF placed *after* real image headers: still in the header chain, still
    // metadata, still must go.
    const lateExif = seg(0xe1, Buffer.from('Exif\0\0FocalLength 36.7511,5.0643', 'latin1'));
    const sos = Buffer.concat([
      Buffer.from([0xff, 0xda, 0x00, 0x08]),
      Buffer.from([1, 1, 0, 0, 0x3f, 0]),
      Buffer.from([9, 9, 9]),
      Buffer.from([0xff, 0xd9]),
    ]);
    const input = new Uint8Array(
      Buffer.concat([Buffer.from([0xff, 0xd8]), dqt, sof0, dht, lateExif, sos]),
    );

    const output = stripJpegMetadata(input);
    const text = latin1(output);
    expect(text).toContain('\xff\xdb'); // DQT kept
    expect(text).toContain('\xff\xc0'); // SOF0 kept
    expect(text).toContain('\xff\xc4'); // DHT kept
    expect(text).not.toContain('FocalLength');
    expect(output.length).toBe(input.length - lateExif.length);
  });

  it('refuses a malformed stream instead of guessing', () => {
    expect(() => stripJpegMetadata(new Uint8Array([0x00, 0x01, 0x02]))).toThrow(MetadataStripError);
  });
});

describe('PNG metadata stripping', () => {
  it('drops tEXt and eXIf, the two places GPS hides in a PNG', () => {
    const output = latin1(stripPngMetadata(pngWithGps()));
    expect(output).not.toContain('GPSLatitude');
    expect(output).not.toContain('36.7511783');
    expect(output).not.toContain('eXIf');
  });

  it('keeps IHDR, IDAT and IEND so the image remains valid', () => {
    const output = latin1(stripPngMetadata(pngWithGps()));
    for (const chunk of ['IHDR', 'IDAT', 'IEND']) expect(output).toContain(chunk);
  });

  it('keeps pHYs, which is rendering information rather than metadata about people', () => {
    expect(latin1(stripPngMetadata(pngWithGps()))).toContain('pHYs');
  });

  it('still detects as a PNG after stripping', () => {
    expect(detectImageType(stripPngMetadata(pngWithGps()))?.type).toBe('image/png');
  });

  it('refuses a non-PNG signature', () => {
    expect(() => stripPngMetadata(new Uint8Array(16))).toThrow(MetadataStripError);
  });
});

describe('WebP metadata stripping', () => {
  it('drops the EXIF and XMP chunks', () => {
    const output = latin1(stripWebpMetadata(webpWithGps()));
    expect(output).not.toContain('GPS 36.7511');
    expect(output).not.toContain('xmpmeta');
    expect(output).not.toContain('EXIF');
    expect(output).not.toContain('XMP ');
  });

  it('clears the metadata flags in VP8X so readers stop looking for those chunks', () => {
    const output = stripWebpMetadata(webpWithGps());
    // VP8X payload starts at offset 12 (RIFF header) + 8 (chunk header).
    expect(output[20] & 0x08).toBe(0);
    expect(output[20] & 0x04).toBe(0);
  });

  it('rewrites the RIFF size so the file stays well-formed', () => {
    const output = stripWebpMetadata(webpWithGps());
    const view = new DataView(output.buffer, output.byteOffset, output.length);
    expect(view.getUint32(4, true)).toBe(output.length - 8);
  });

  it('keeps the image chunk', () => {
    expect(latin1(stripWebpMetadata(webpWithGps()))).toContain('VP8 ');
  });

  it('still detects as a WebP after stripping', () => {
    expect(detectImageType(stripWebpMetadata(webpWithGps()))?.type).toBe('image/webp');
  });
});

describe('AVIF metadata handling', () => {
  it('recognises an EXIF payload inside the container', () => {
    const withExif = new Uint8Array(
      Buffer.concat([
        Buffer.from([0, 0, 0, 0x1c]),
        Buffer.from('ftypavif', 'latin1'),
        Buffer.from('Exif', 'latin1'),
      ]),
    );
    expect(avifCarriesMetadata(withExif)).toBe(true);
  });

  it('accepts a clean AVIF untouched', () => {
    const clean = new Uint8Array(
      Buffer.concat([Buffer.from([0, 0, 0, 0x1c]), Buffer.from('ftypavif', 'latin1')]),
    );
    expect(avifCarriesMetadata(clean)).toBe(false);
    expect(stripImageMetadata(clean, 'image/avif').removed).toBe(0);
  });

  it('refuses an AVIF it cannot sanitise rather than storing the GPS', () => {
    const withExif = new Uint8Array(
      Buffer.concat([
        Buffer.from([0, 0, 0, 0x1c]),
        Buffer.from('ftypavif', 'latin1'),
        Buffer.from('Exif', 'latin1'),
      ]),
    );
    expect(() => stripImageMetadata(withExif, 'image/avif')).toThrowError(/JPEG or WebP/);
  });
});

describe('stripImageMetadata entry point', () => {
  it('dispatches on the detected type and reports the removed byte count', () => {
    const result = stripImageMetadata(jpegWithGps(), 'image/jpeg');
    expect(result.bytes.length).toBeLessThan(jpegWithGps().length);
    expect(result.removed).toBeGreaterThan(0);
  });

  it('never returns a stream that still contains the original GPS string', () => {
    const samples = [jpegWithGps(), pngWithGps(), webpWithGps()] as const;
    const types = ['image/jpeg', 'image/png', 'image/webp'] as const;
    samples.forEach((sample, i) => {
      const clean = latin1(stripImageMetadata(sample, types[i]).bytes);
      expect(clean).not.toMatch(/36\.7511783|36\.7511/);
    });
  });
});
