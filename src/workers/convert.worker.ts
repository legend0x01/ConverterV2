/* FileMorph conversion worker.
 *
 * Runs OffscreenCanvas image work and JSZip/fflate archive work off the main
 * thread so the UI keeps rendering at 60 fps while a 400 MB ZIP is deflated.
 * Blobs cross the thread boundary by structured clone \u2014 they are never
 * serialised into a request body. */

import { runEngineJob, type EngineJob } from '../lib/convert/engine';

const ctx = self as unknown as Worker;

interface TaskMessage {
  type: 'run';
  id: number;
  job: EngineJob;
}

ctx.onmessage = async (event: MessageEvent<TaskMessage>) => {
  const { id, job } = event.data;
  const started = performance.now();
  try {
    const outputs = await runEngineJob(job, (pct, label) => {
      ctx.postMessage({ type: 'progress', id, pct, label });
    });
    ctx.postMessage({ type: 'done', id, outputs, ms: performance.now() - started });
  } catch (err) {
    ctx.postMessage({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
  }
};

ctx.postMessage({ type: 'ready' });
