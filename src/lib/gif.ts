/* A complete, dependency-free GIF89a encoder.
 *
 * Browsers can decode GIF but will not encode one through canvas.toBlob, so
 * FileMorph ships its own: median-cut palette generation over a sampled
 * subset of frames, nearest-colour mapping with a small lookup cache, and a
 * variable-width LZW compressor with the NETSCAPE2.0 looping extension.
 * Everything below runs in whatever thread called it — no upload, no worker
 * farm, no service.
 */

export interface Frame {
  /** RGBA pixels, exactly width * height * 4 bytes */
  data: Uint8ClampedArray;
  /** hundredths of a second */
  delay: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/* --------------------------------------------------------------- quantise */

function buildPalette(samples: Uint8ClampedArray, maxColors: number): Uint8Array {
  const count = Math.floor(samples.length / 4);
  if (count === 0) return new Uint8Array([0, 0, 0]);

  let indices: number[] = [];
  for (let i = 0; i < count; i++) indices.push(i);

  const boxes: number[][] = [indices];

  const boxRange = (box: number[]): [number, number, number] => {
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (const i of box) {
      const o = i * 4;
      const r = samples[o], g = samples[o + 1], b = samples[o + 2];
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (g < minG) minG = g;
      if (g > maxG) maxG = g;
      if (b < minB) minB = b;
      if (b > maxB) maxB = b;
    }
    return [maxR - minR, maxG - minG, maxB - minB];
  };

  while (boxes.length < maxColors) {
    // Split the box with the largest channel spread and the most pixels.
    let target = -1;
    let best = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const [dr, dg, db] = boxRange(boxes[i]);
      const score = Math.max(dr, dg, db) * Math.log2(boxes[i].length + 2);
      if (score > best) {
        best = score;
        target = i;
      }
    }
    if (target < 0) break;

    const box = boxes[target];
    const [dr, dg, db] = boxRange(box);
    const channel = dr >= dg && dr >= db ? 0 : dg >= db ? 1 : 2;
    box.sort((a, b) => samples[a * 4 + channel] - samples[b * 4 + channel]);
    const mid = box.length >> 1;
    boxes.splice(target, 1, box.slice(0, mid), box.slice(mid));
  }

  const palette = new Uint8Array(maxColors * 3);
  boxes.forEach((box, pi) => {
    let r = 0, g = 0, b = 0;
    for (const i of box) {
      const o = i * 4;
      r += samples[o];
      g += samples[o + 1];
      b += samples[o + 2];
    }
    const n = Math.max(1, box.length);
    const p = pi * 3;
    palette[p] = Math.round(r / n);
    palette[p + 1] = Math.round(g / n);
    palette[p + 2] = Math.round(b / n);
  });
  return palette;
}

function makeMapper(palette: Uint8Array) {
  const n = Math.floor(palette.length / 3);
  const cache = new Int16Array(32768).fill(-1);
  return (r: number, g: number, b: number): number => {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const hit = cache[key];
    if (hit >= 0) return hit;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const p = i * 3;
      const dr = r - palette[p];
      const dg = g - palette[p + 1];
      const db = b - palette[p + 2];
      const d = dr * dr * 3 + dg * dg * 6 + db * db;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    cache[key] = best;
    return best;
  };
}

/* -------------------------------------------------------------------- lzw */

function lzwEncode(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let dict = new Map<number, number>();

  const out: number[] = [];
  let cur = 0;
  let curBits = 0;
  const emit = (code: number) => {
    cur |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      out.push(cur & 0xff);
      cur >>>= 8;
      curBits -= 8;
    }
  };

  emit(clearCode);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    if (nextCode < 4096) {
      dict.set(key, nextCode++);
      if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
    } else {
      emit(clearCode);
      dict = new Map();
      nextCode = eoiCode + 1;
      codeSize = minCodeSize + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoiCode);
  if (curBits > 0) out.push(cur & 0xff);
  return Uint8Array.from(out);
}

/* ---------------------------------------------------------------- writer */

export interface GifOptions {
  /** Target palette size, 2\u2013256. */
  maxColors?: number;
  /** Frame sampling rate when building the palette. */
  sampleStride?: number;
}

export function encodeGif(frames: Frame[], width: number, height: number, opts: GifOptions = {}): Uint8Array {
  const maxColors = Math.max(2, Math.min(256, opts.maxColors ?? 256));
  const stride = Math.max(1, opts.sampleStride ?? 4);

  if (frames.length === 0) throw new Error('GIF encoder needs at least one frame.');

  // 1. Palette from a subsample of every frame.
  const samples: number[] = [];
  for (const frame of frames) {
    for (let p = 0; p < width * height; p += stride) {
      const o = p * 4;
      samples.push(frame.data[o], frame.data[o + 1], frame.data[o + 2]);
    }
  }
  const rgb = new Uint8ClampedArray(samples);
  const palette = buildPalette(rgb, maxColors);
  const map = makeMapper(palette);

  const minCodeSize = maxColors <= 2 ? 2 : maxColors <= 4 ? 3 : maxColors <= 16 ? 4 : maxColors <= 64 ? 6 : 8;
  const tableSize = 1 << minCodeSize;

  const chunks: number[] = [];
  const push = (...bytes: number[]) => {
    for (const b of bytes) chunks.push(b & 0xff);
  };
  const pushStr = (s: string) => {
    for (let i = 0; i < s.length; i++) chunks.push(s.charCodeAt(i) & 0xff);
  };
  const pushU16 = (v: number) => push(v & 0xff, (v >> 8) & 0xff);

  // Header + logical screen descriptor
  pushStr('GIF89a');
  pushU16(width);
  pushU16(height);
  push(0xf0 | (Math.min(7, Math.ceil(Math.log2(tableSize)) - 1) & 0x07), 0, 0);

  // Global colour table, padded to the power-of-two size
  for (let i = 0; i < tableSize * 3; i++) push(palette[i] ?? 0);

  // NETSCAPE2.0 looping extension (0 = loop forever)
  push(0x21, 0xff, 0x0b);
  pushStr('NETSCAPE2.0');
  push(0x03, 0x01, 0x00, 0x00, 0x00);

  const indices = new Uint8Array(width * height);

  for (const frame of frames) {
    for (let p = 0; p < width * height; p++) {
      const o = p * 4;
      indices[p] = map(frame.data[o], frame.data[o + 1], frame.data[o + 2]);
    }

    // Graphic control extension: disposal = 1 (leave in place), no transparency
    push(0x21, 0xf9, 0x04, 0x04, 0, 0, 0, 0x00);
    pushU16(Math.max(2, Math.round(frame.delay)));
    push(0x00);
    push(0x00);
    push(0x00);

    // Image descriptor
    push(0x2c);
    pushU16(0);
    pushU16(0);
    pushU16(width);
    pushU16(height);
    push(0x00);

    // LZW stream, chunked into <=255 byte sub-blocks
    push(minCodeSize);
    const lzw = lzwEncode(indices, minCodeSize);
    for (let i = 0; i < lzw.length; i += 255) {
      const n = Math.min(255, lzw.length - i);
      push(n);
      for (let j = 0; j < n; j++) push(lzw[i + j]);
    }
    push(0x00);
  }

  push(0x3b); // trailer
  return Uint8Array.from(chunks);
}

/** Convenience: single still frame as a GIF (used for the image \u2192 GIF target). */
export function encodeStillGif(data: Uint8ClampedArray, width: number, height: number, maxColors = 256): Uint8Array {
  return encodeGif([{ data, delay: 0 }], width, height, { maxColors });
}

export type { Rgb };
