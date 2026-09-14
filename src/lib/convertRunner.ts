/* Orchestrates a conversion.
 *
 *  \u2022 image + archive jobs are handed to a dedicated Web Worker (OffscreenCanvas /
 *    JSZip run off the UI thread)
 *  \u2022 document + media jobs run on the main thread, because they need DOM
 *    facilities (AudioContext, <video>, <img> for SVG)
 *  \u2022 if a Worker cannot be created at all, the same engine module is imported
 *    dynamically and executed inline \u2014 degraded responsiveness, identical output
 */

import type { Emit, OutputFile } from './types';
import { rasterizeSvg, sniffSvgAsync } from './convert/image';
import type { EngineJob } from './convert/engine';

export type ConversionTask =
  | { category: 'image'; file: Blob; fileName: string; target: string; quality: number; maxWidth?: number }
  | { category: 'document'; file: Blob; fileName: string; ext: string; target: string }
  | { category: 'archive'; file: Blob; fileName: string; ext: string; target: string }
  | { category: 'media'; file: Blob; fileName: string; target: string; gifFps?: number; gifWidth?: number };

interface WorkerResponse {
  type: 'progress' | 'done' | 'error' | 'ready';
  id: number;
  pct?: number;
  label?: string;
  outputs?: OutputFile[];
  ms?: number;
  message?: string;
}

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<
  number,
  { resolve: (v: OutputFile[]) => void; reject: (e: Error) => void; emit: Emit }
>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
  try {
    worker = new Worker(new URL('../workers/convert.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      if (msg.type === 'ready') return;
      const entry = pending.get(msg.id);
      if (!entry) return;
      if (msg.type === 'progress') {
        entry.emit(msg.pct ?? 0, msg.label ?? '');
        return;
      }
      pending.delete(msg.id);
      if (msg.type === 'error') entry.reject(new Error(msg.message ?? 'Worker failed.'));
      else entry.resolve(msg.outputs ?? []);
    };
    worker.onerror = (err) => {
      const message = err.message || 'The conversion worker crashed.';
      for (const [, entry] of pending) entry.reject(new Error(message));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  } catch {
    worker = null;
    return null;
  }
}

async function inWorker(job: EngineJob, emit: Emit): Promise<OutputFile[]> {
  const w = getWorker();
  if (!w) {
    const { runEngineJob } = await import('./convert/engine');
    return runEngineJob(job, emit);
  }
  const id = ++seq;
  return new Promise<OutputFile[]>((resolve, reject) => {
    pending.set(id, { resolve, reject, emit });
    w.postMessage({ type: 'run', id, job });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('Conversion timed out after 4 minutes. Try a smaller input.'));
      }
    }, 240000);
  });
}

export async function runConversion(task: ConversionTask, emit: Emit): Promise<OutputFile[]> {
  if (task.category === 'image') {
    let source = task.file;
    const ext = (task.fileName.split('.').pop() ?? '').toLowerCase();
    // SVG rasterisation needs the DOM, so it happens here before the raster
    // work is delegated to the worker.
    if (ext === 'svg' || (await sniffSvgAsync(task.file))) {
      if (task.target !== 'svg') {
        emit(12, 'rasterising svg');
        source = await rasterizeSvg(task.file, task.maxWidth && task.maxWidth > 0 ? 2 : 2);
      }
    }
    return inWorker(
      { kind: 'image', file: source, target: task.target as 'png', quality: task.quality, maxWidth: task.maxWidth, sourceName: task.fileName },
      emit
    );
  }

  if (task.category === 'archive') {
    return inWorker(
      { kind: 'archive', file: task.file, ext: task.ext, fileName: task.fileName, target: task.target as 'zip' },
      emit
    );
  }

  if (task.category === 'document') {
    const { convertDocument } = await import('./convert/document');
    return convertDocument({ file: task.file, ext: task.ext, fileName: task.fileName, target: task.target }, emit);
  }

  const { convertMedia } = await import('./convert/media');
  return convertMedia(
    { file: task.file, fileName: task.fileName, target: task.target as 'wav', gifFps: task.gifFps, gifWidth: task.gifWidth },
    emit
  );
}

export function supportsWorker(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}
