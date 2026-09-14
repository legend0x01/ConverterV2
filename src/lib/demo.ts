/* Locally generated sample inputs. Nothing is downloaded \u2014 these files are
 * synthesised in the tab so you can exercise every engine without trusting
 * the app with real data first. */

import JSZip from 'jszip';
import type { Category } from './formats';

function canvasImage(): Promise<File> {
  const canvas = document.createElement('canvas') as HTMLCanvasElement & {
    convertToBlob: (opts?: { type?: string; quality?: number }) => Promise<Blob>;
  };
  canvas.width = 1280;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas unavailable'));

  const bg = ctx.createLinearGradient(0, 0, 1280, 800);
  bg.addColorStop(0, '#0b1418');
  bg.addColorStop(0.55, '#10262a');
  bg.addColorStop(1, '#0a0f12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1280, 800);

  ctx.strokeStyle = 'rgba(47,224,138,.16)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1280; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 800);
    ctx.stroke();
  }
  for (let y = 0; y <= 800; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(1280, y + 0.5);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(640, 380, 20, 640, 380, 420);
  glow.addColorStop(0, 'rgba(47,224,138,.45)');
  glow.addColorStop(1, 'rgba(47,224,138,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1280, 800);

  ctx.fillStyle = '#2fe08a';
  ctx.beginPath();
  ctx.arc(640, 360, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#08110d';
  ctx.font = '700 120px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FM', 640, 368);

  ctx.fillStyle = 'rgba(231,236,234,.92)';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillText('FileMorph local test plate', 640, 560);
  ctx.fillStyle = 'rgba(139,154,147,.9)';
  ctx.font = '400 20px ui-monospace, monospace';
  ctx.fillText('1280 × 800 · generated in your tab · never uploaded', 640, 604);

  return canvas.convertToBlob({ type: 'image/png' }).then((blob: Blob) => new File([blob], 'test-plate.png', { type: 'image/png' }));
}

const SAMPLE_CSV = `id,department,region,records,confidential,notes
1001,finance,emea,4128,true,quarterly ledger export
1002,legal,amer,913,true,NDA correspondence set
1003,engineering,apac,18744,false,telemetry rollup
1004,people,emea,226,true,compensation review
1005,support,amer,9310,false,ticket archive
1006,finance,apac,1502,true,expense receipts
1007,engineering,emea,22118,false,build artifacts index
1008,legal,apac,640,true,settlement drafts`;

const SAMPLE_MD = `# Local Processing Brief

**Classification:** internal  
**Handling:** do not upload to third-party converters

## Why local matters

Financial ledgers and NDA material are routinely uploaded to free conversion
services, indexed, and retained long after the conversion finishes. Moving the
computation to the client removes that exposure entirely.

## Checklist

- Files stay in tab memory for the duration of the job
- No account, no cookie, no telemetry pixel
- Output is written straight back to disk

\`\`\`
const bytes = new Uint8Array(await file.arrayBuffer());
const blob = new Blob([bytes], { type: 'application/zip' });
\`\`\`
`;

const ARCHIVE_FILES: Record<string, string> = {
  'brief.md': SAMPLE_MD,
  'ledger.csv': SAMPLE_CSV,
  'readme.txt': 'These files were generated in your browser by FileMorph.\nExtract them locally to confirm the archive engine works end to end.\n',
  'nested/config.json': JSON.stringify({ pipeline: 'local', upload: false, engines: ['canvas', 'jszip', 'jspdf', 'lame'] }, null, 2),
};

function wavTone(): Promise<File> {
  const rate = 44100;
  const seconds = 3.2;
  const frames = Math.floor(rate * seconds);
  const buffer = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  view.setUint32(4, 36 + frames * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, frames * 2, true);

  for (let i = 0; i < frames; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 6) * Math.min(1, (seconds - t) * 3);
    const freq = 220 + 440 * (t / seconds);
    const s = Math.sin(2 * Math.PI * freq * t) * 0.55 * env + Math.sin(2 * Math.PI * freq * 2 * t) * 0.14 * env;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true);
  }
  return Promise.resolve(new File([buffer], 'sweep-tone.wav', { type: 'audio/wav' }));
}

export async function makeDemoFiles(category: Category): Promise<File[]> {
  switch (category) {
    case 'image':
      return [await canvasImage()];
    case 'document':
      return [
        new File([SAMPLE_MD], 'processing-brief.md', { type: 'text/markdown' }),
        new File([SAMPLE_CSV], 'department-records.csv', { type: 'text/csv' }),
      ];
    case 'archive': {
      const zip = new JSZip();
      for (const [name, content] of Object.entries(ARCHIVE_FILES)) zip.file(name, content);
      const bytes = await zip.generateAsync({ type: 'uint8array' });
      return [new File([bytes as unknown as BlobPart], 'source-tree.zip', { type: 'application/zip' })];
    }
    case 'media':
      return [await wavTone()];
    default:
      return [];
  }
}
