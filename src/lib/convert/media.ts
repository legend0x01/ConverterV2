/* Media engine — browser codecs plus two encoders we ship ourselves.
 *
 *  audio  \u2192 WAV  : native WebAudio decode, 16-bit PCM re-wrap (lossless step)
 *  audio  \u2192 MP3  : re-encode with a bundled LAME port
 *  video  \u2192 GIF  : <video> seek loop \u2192 canvas \u2192 our GIF89a encoder
 *  video  \u2192 PNG/JPG : poster-frame snapshot
 *
 * FFmpeg.wasm is deliberately not loaded: it needs ~30 MB of WASM plus
 * cross-origin isolation headers, and pulling it in would break the promise
 * that this app is a small, fully local tool. Everything above is genuinely
 * offline and genuinely client-side.
 */

import { encodeGif, type Frame } from '../gif';
import type { Emit, OutputFile } from '../types';

export interface MediaJob {
  file: Blob;
  fileName: string;
  target: 'wav' | 'mp3' | 'gif' | 'png' | 'jpg';
  gifFps?: number;
  gifWidth?: number;
}

let sharedCtx: AudioContext | null = null;
function audioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('This browser has no WebAudio decoder.');
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

async function decodeAudio(file: Blob): Promise<AudioBuffer> {
  const ctx = audioContext();
  const data = await file.arrayBuffer();
  try {
    return await ctx.decodeAudioData(data.slice(0));
  } catch {
    throw new Error('The browser codec could not decode this audio file. MP3, WAV, OGG, M4A, AAC and FLAC are supported by your platform codecs.');
  }
}

/* ------------------------------------------------------------------ WAV */

export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const frames = buffer.length;
  const rate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  str(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, dataSize, true);

  const planes: Float32Array[] = [];
  for (let c = 0; c < channels; c++) planes.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      let s = planes[c][i];
      s = s < -1 ? -1 : s > 1 ? 1 : s;
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

/* ------------------------------------------------------------------ MP3 */

async function encodeMp3(buffer: AudioBuffer, kbps = 192, emit?: Emit): Promise<Blob> {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const channels = Math.min(2, buffer.numberOfChannels);
  const encoder = new Mp3Encoder(channels, buffer.sampleRate, kbps);

  const left = toInt16(buffer.getChannelData(0));
  const right = channels > 1 ? toInt16(buffer.getChannelData(1)) : undefined;
  const block = 1152;
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < left.length; i += block) {
    const l = left.subarray(i, i + block);
    const r = right ? right.subarray(i, i + block) : undefined;
    const data = encoder.encodeBuffer(l, r);
    if (data.length > 0) chunks.push(new Uint8Array(data));
    if ((i / block) % 200 === 0) emit?.(10 + Math.round((i / left.length) * 80), 'lame encoding');
  }
  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(new Uint8Array(tail));

  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
}

function toInt16(f32: Float32Array): Int16Array {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = f32[i] < -1 ? -1 : f32[i] > 1 ? 1 : f32[i];
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/* ---------------------------------------------------------------- video */

async function loadVideo(file: Blob): Promise<HTMLVideoElement> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out decoding this video. The container or codec may not be supported locally.')), 30000);
    video.onloadeddata = () => {
      clearTimeout(timer);
      resolve();
    };
    video.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error('Your browser cannot decode this video container. MP4 (H.264) and WEBM are the reliable local options.'));
    };
  });

  if (!video.videoWidth || !video.videoHeight) {
    URL.revokeObjectURL(url);
    throw new Error('This file decoded without a video track.');
  }
  return video;
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done);
    video.currentTime = Math.max(0, time);
  });
}

function snapshot(video: HTMLVideoElement, width: number): { canvas: OffscreenCanvas; ctx: OffscreenCanvasRenderingContext2D } {
  const ratio = video.videoHeight / video.videoWidth;
  const canvas = new OffscreenCanvas(width, Math.max(1, Math.round(width * ratio)));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas context unavailable.');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

export const GIF_MAX_FRAMES = 120;
export const GIF_MAX_SECONDS = 12;

async function videoToGif(file: Blob, fps: number, width: number, emit?: Emit): Promise<Blob> {
  const video = await loadVideo(file);
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 3;
  const seconds = Math.min(duration, GIF_MAX_SECONDS);
  const frameCount = Math.max(2, Math.min(GIF_MAX_FRAMES, Math.ceil(seconds * fps)));
  const step = seconds / frameCount;

  const first = snapshot(video, width);
  const w = first.canvas.width;
  const h = first.canvas.height;
  const frames: Frame[] = [{ data: first.ctx.getImageData(0, 0, w, h).data, delay: Math.round(step * 100) }];

  for (let i = 1; i < frameCount; i++) {
    await seek(video, i * step);
    const { ctx } = snapshot(video, width);
    frames.push({ data: ctx.getImageData(0, 0, w, h).data, delay: Math.round(step * 100) });
    emit?.(10 + Math.round((i / frameCount) * 55), `capturing frame ${i + 1}/${frameCount}`);
  }

  emit?.(68, 'building palette');
  const gif = encodeGif(frames, w, h, { maxColors: 128, sampleStride: 7 });
  emit?.(96, 'lzw compress');
  URL.revokeObjectURL(video.src);
  return new Blob([gif as unknown as BlobPart], { type: 'image/gif' });
}

/* --------------------------------------------------------------- driver */

export async function convertMedia(job: MediaJob, emit?: Emit): Promise<OutputFile[]> {
  const stem = job.fileName.replace(/\.[^.]+$/, '') || 'converted';
  const isVideo = job.target === 'gif' || job.target === 'png' || job.target === 'jpg';

  if (isVideo) {
    emit?.(8, 'opening video');
    const video = await loadVideo(job.file);
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    await seek(video, Math.min(duration > 0 ? duration * 0.05 : 0, 0.5));

    if (job.target === 'gif') {
      URL.revokeObjectURL(video.src);
      const blob = await videoToGif(job.file, Math.max(4, Math.min(20, job.gifFps ?? 10)), Math.max(160, Math.min(720, job.gifWidth ?? 480)), emit);
      return [{ name: `${stem}.gif`, blob, note: 'Frames sampled locally \u2014 video pixels never left this tab.' }];
    }

    emit?.(55, 'encoding frame');
    const { canvas } = snapshot(video, Math.min(1920, Math.max(320, video.videoWidth)));
    URL.revokeObjectURL(video.src);
    const blob = await canvas.convertToBlob({ type: job.target === 'png' ? 'image/png' : 'image/jpeg', quality: 0.92 });
    return [{ name: `${stem}-frame.${job.target}`, blob }];
  }

  emit?.(8, 'decoding audio');
  const buffer = await decodeAudio(job.file);
  emit?.(40, `${(buffer.duration).toFixed(1)}s \u00b7 ${buffer.sampleRate} Hz \u00b7 ${buffer.numberOfChannels}ch`);

  if (job.target === 'wav') {
    const blob = encodeWav(buffer);
    emit?.(96, 'ready');
    return [{ name: `${stem}.wav`, blob, note: 'Decoded and re-wrapped locally. WebAudio owns the codec; no encoder service involved.' }];
  }

  const blob = await encodeMp3(buffer, 192, emit);
  emit?.(96, 'ready');
  return [{ name: `${stem}.mp3`, blob, note: 'LAME 192 kbps, running in this tab.' }];
}
