/* The worker-side engine. Imported by both the Web Worker entry point and the
 * main-thread fallback, so there is exactly one implementation of every job. */

import { convertImage } from './image';
import { convertArchive } from './archive';
import type { Emit, OutputFile } from '../types';

export type EngineJob =
  | {
      kind: 'image';
      file: Blob;
      target: 'png' | 'jpg' | 'webp' | 'avif' | 'bmp' | 'gif' | 'svg';
      quality: number;
      maxWidth?: number;
      sourceName: string;
    }
  | {
      kind: 'archive';
      file: Blob;
      ext: string;
      fileName: string;
      target: 'zip' | 'tar' | 'targz' | 'extract';
    };

export async function runEngineJob(job: EngineJob, emit: Emit): Promise<OutputFile[]> {
  if (job.kind === 'image') {
    emit(3, 'decode');
    const blob = await convertImage(
      job.file,
      { target: job.target, quality: job.quality, maxWidth: job.maxWidth },
      emit
    );
    const ext = job.target;
    const stem = job.sourceName.replace(/\.[^.]+$/, '') || 'converted';
    return [{ name: `${stem}.${ext}`, blob }];
  }
  return convertArchive(job, emit);
}
