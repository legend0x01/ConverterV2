/* Archive engine. ZIP in/out through JSZip, gzip in/out through fflate, and
 * the tar layer from our own reader/writer. Nothing here touches a network. */

import JSZip from 'jszip';
import { gzipSync, gunzipSync } from 'fflate';
import { createTar, parseTar, type TarEntry } from '../tar';
import type { Emit, OutputFile } from '../types';

export const ARCHIVE_MEMBER_LIMIT = 4096;
export const ARCHIVE_MEMBER_BYTES = 900 * 1024 * 1024;

interface Member {
  name: string;
  data: Uint8Array;
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function safeMembers(members: Member[]): Member[] {
  return members.filter((m) => {
    const clean = m.name.replace(/(^|\/)\.\.(\/|$)/g, '');
    return clean.length > 0 && !m.name.startsWith('/') && !/^\d+\s/.test(m.name);
  });
}

export async function readArchive(file: Blob, ext: string, fileName = 'payload'): Promise<Member[]> {
  if (ext === 'zip') {
    const zip = await JSZip.loadAsync(file);
    const out: Member[] = [];
    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue;
      if (out.length >= ARCHIVE_MEMBER_LIMIT) throw new Error(`This ZIP holds more than ${ARCHIVE_MEMBER_LIMIT} entries; FileMorph stops there rather than exhausting tab memory.`);
      const data = await entry.async('uint8array');
      out.push({ name: entry.name, data });
    }
    return safeMembers(out);
  }

  if (ext === 'tar') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return parseTar(bytes).map((e) => ({ name: e.name, data: e.data }));
  }

  if (ext === 'gz' || ext === 'tgz') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let inflated: Uint8Array;
    try {
      inflated = gunzipSync(bytes);
    } catch {
      throw new Error('This .gz stream could not be decompressed. It may be truncated or use an unsupported variant.');
    }
    // A .tar.gz unpacks to a tar stream; a plain .gz unpacks to one file.
    const looksLikeTar = ext === 'tgz' || (inflated.length > 512 && inflated[257] === 0x75 && inflated[258] === 0x73);
    if (looksLikeTar) {
      return parseTar(inflated).map((e) => ({ name: e.name, data: e.data }));
    }
    return [{ name: baseName(fileName.replace(/\.(tar\.gz|tgz|gz)$/i, '')) || 'payload', data: inflated }];
  }

  throw new Error(`No local decoder for .${ext}.`);
}

async function toZip(members: Member[]): Promise<Blob> {
  const zip = new JSZip();
  for (const m of members) zip.file(m.name, m.data);
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return new Blob([bytes as unknown as BlobPart], { type: 'application/zip' });
}

export interface ArchiveJob {
  file: Blob;
  ext: string;
  fileName: string;
  target: 'zip' | 'tar' | 'targz' | 'extract';
}

export async function convertArchive(job: ArchiveJob, emit?: Emit): Promise<OutputFile[]> {
  const { file, ext, target } = job;
  const stem = job.fileName.replace(/\.[^.]+$/, '') || 'converted';

  emit?.(8, 'reading archive');
  const members = await readArchive(file, ext, job.fileName);
  if (members.length === 0) throw new Error('This archive contains no files.');
  emit?.(35, `${members.length} member${members.length === 1 ? '' : 's'} unpacked`);

  if (target === 'extract') {
    if (members.length > 200) {
      emit?.(60, 'repacking for download');
      const blob = await toZip(members);
      return [{ name: `${stem}-extracted.zip`, blob, note: `${members.length} members returned as a single ZIP so the browser does not prompt for ${members.length} downloads.` }];
    }
    emit?.(95, 'ready');
    return members.map((m) => ({ name: baseName(m.name) || 'file', blob: new Blob([m.data as unknown as BlobPart]) }));
  }

  const tarEntries: TarEntry[] = members.map((m) => ({ name: m.name, data: m.data }));

  if (target === 'zip') {
    emit?.(60, 'deflating');
    const blob = await toZip(members);
    emit?.(98, 'ready');
    return [{ name: `${stem}.zip`, blob }];
  }

  if (target === 'tar') {
    emit?.(60, 'writing ustar headers');
    const bytes = createTar(tarEntries);
    emit?.(95, 'ready');
    return [{ name: `${stem}.tar`, blob: new Blob([bytes as unknown as BlobPart], { type: 'application/x-tar' }) }];
  }

  // targz
  emit?.(55, 'writing ustar headers');
  const raw = createTar(tarEntries);
  emit?.(75, 'gzip deflating');
  const gz = gzipSync(raw, { level: 6 });
  emit?.(98, 'ready');
  return [{ name: `${stem}.tar.gz`, blob: new Blob([gz as unknown as BlobPart], { type: 'application/gzip' }) }];
}

export function archiveSummary(members: Member[]): string {
  const total = members.reduce((a, m) => a + m.data.length, 0);
  return `${members.length} files \u00b7 ${total} bytes uncompressed`;
}
