/* Image engine. Decoding goes through createImageBitmap, encoding through
 * OffscreenCanvas.convertToBlob. The formats the platform encoder does not
 * ship (BMP out, GIF out) are handled by local encoders further down.
 *
 * This module is thread-agnostic: the exact same code runs inside the Web
 * Worker and on the main thread as a fallback. */

import { encodeStillGif } from '../gif';

export interface ImageConvertOptions {
  target: 'png' | 'jpg' | 'webp' | 'avif' | 'bmp' | 'gif' | 'svg';
  quality: number; // 0..1
  maxWidth?: number;
}

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

export function sniffSvg(blob: Blob): boolean {
  return (blob.type || '').toLowerCase().includes('svg');
}

/** Deeper sniff for files that arrive without a MIME type: peek at the head. */
export async function sniffSvgAsync(blob: Blob): Promise<boolean> {
  if (sniffSvg(blob)) return true;
  try {
    const head = await blob.slice(0, 2048).text();
    return /<svg[\s>]/i.test(head);
  } catch {
    return false;
  }
}

/** Decode any browser-supported raster into an ImageBitmap. */
export async function decodeToBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch {
    // Some builds refuse blob-form SVG; fall back to an <img> element (main thread only).
    if (typeof document !== 'undefined') {
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('This browser could not decode the image.'));
          el.src = url;
        });
        return await createImageBitmap(img);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    throw new Error('This browser could not decode the image. Try PNG, JPG or WEBP as the source.');
  }
}

/** Rasterise an SVG source to a PNG blob. Requires DOM access, so this one
 *  always runs on the main thread before the raster work is handed off. */
export async function rasterizeSvg(source: Blob, scale = 2): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('SVG rasterisation needs a DOM.');
  const text = await source.text();
  const match = text.match(/<svg[^>]*>/i);
  if (!match) throw new Error('No <svg> root element found in this file.');

  const tag = match[0];
  const vw = parseFloat(tag.match(/\bwidth="\s*([\d.]+)/i)?.[1] ?? '0');
  const vh = parseFloat(tag.match(/\bheight="\s*([\d.]+)/i)?.[1] ?? '0');
  const viewBox = tag.match(/\bviewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);

  let width = vw || (viewBox ? parseFloat(viewBox[3]) : 0);
  let height = vh || (viewBox ? parseFloat(viewBox[4]) : 0);
  if (!width || !height) {
    width = width || 800;
    height = height || 800;
  }

  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('The SVG failed to render. It may reference external resources that are blocked offline.'));
      el.src = url;
    });
    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable in this browser.');
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Minimal 24-bit BMP writer — canvas will decode BMP but never encode it. */
export function encodeBmp(imageData: ImageData): Uint8Array {
  const w = imageData.width;
  const h = imageData.height;
  const rowSize = Math.floor((24 * w + 31) / 32) * 4;
  const pixelSize = rowSize * h;
  const fileSize = 54 + pixelSize;
  const out = new Uint8Array(fileSize);
  const view = new DataView(out.buffer);

  out[0] = 0x42; // 'B'
  out[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, w, true);
  view.setInt32(22, h, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelSize, true);
  view.setUint32(46, 2835, true);
  view.setUint32(50, 2835, true);

  const px = imageData.data;
  for (let y = 0; y < h; y++) {
    const rowStart = 54 + (h - 1 - y) * rowSize;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      const d = rowStart + x * 3;
      out[d] = px[s + 2];
      out[d + 1] = px[s + 1];
      out[d + 2] = px[s];
    }
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export async function convertImage(source: Blob, opts: ImageConvertOptions, emit?: (pct: number, label: string) => void): Promise<Blob> {
  emit?.(5, 'decoding');
  const bitmap = await decodeToBitmap(source);

  let width = bitmap.width;
  let height = bitmap.height;
  if (!width || !height) {
    bitmap.close?.();
    throw new Error('The image has no intrinsic dimensions. Add a width/height to the SVG and retry.');
  }

  if (opts.maxWidth && opts.maxWidth > 0 && width > opts.maxWidth) {
    const ratio = opts.maxWidth / width;
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close?.();
    throw new Error('2D canvas context unavailable in this browser.');
  }

  // JPG/BMP/GIF have no alpha channel \u2014 flatten onto white instead of black.
  if (opts.target === 'jpg' || opts.target === 'bmp' || opts.target === 'gif') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  emit?.(45, 'rasterising');

  if (opts.target === 'bmp') {
    const data = ctx.getImageData(0, 0, width, height);
    emit?.(80, 'writing bmp');
    return new Blob([encodeBmp(data) as unknown as BlobPart], { type: 'image/bmp' });
  }

  if (opts.target === 'gif') {
    const data = ctx.getImageData(0, 0, width, height);
    emit?.(65, 'quantising palette');
    const gif = encodeStillGif(data.data, width, height, 256);
    emit?.(92, 'lzw compress');
    return new Blob([gif as unknown as BlobPart], { type: 'image/gif' });
  }

  if (opts.target === 'svg') {
    emit?.(60, 'embedding raster');
    const png = await canvas.convertToBlob({ type: 'image/png' });
    const bytes = new Uint8Array(await png.arrayBuffer());
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<image width="${width}" height="${height}" href="data:image/png;base64,${bytesToBase64(bytes)}"/></svg>`;
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  const mime = MIME[opts.target];
  let blob: Blob;
  try {
    blob = await canvas.convertToBlob({ type: mime, quality: opts.quality });
  } catch {
    throw new Error(`Your browser refused to encode ${opts.target.toUpperCase()}.`);
  }
  emit?.(90, 'encoding');

  if (!blob || blob.size === 0 || (opts.target !== 'jpg' && blob.type && blob.type !== mime)) {
    throw new Error(
      `This browser build has no ${opts.target.toUpperCase()} encoder. PNG, JPG, WEBP, GIF and BMP are always available.`
    );
  }
  return blob;
}
