/* Blob-URL downloads. The URL is minted from an in-memory Blob \u2014 there is no
 * server endpoint involved at any point in the chain. */

import type { OutputFile } from './types';

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function saveAll(files: OutputFile[]) {
  files.forEach((f, i) => {
    setTimeout(() => saveBlob(f.blob, f.name), i * 350);
  });
}

export function combinedName(files: OutputFile[]): string {
  if (files.length === 1) return files[0].name;
  return `${files.length} files`;
}
