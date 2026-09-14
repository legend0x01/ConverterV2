/* POSIX ustar reader/writer. The tar format is simple enough that shipping a
 * real implementation beats pulling in another dependency: 512-byte headers,
 * octal size fields, and a two-block zero terminator. */

const BLOCK = 512;

export interface TarEntry {
  name: string;
  data: Uint8Array;
  mode?: number;
  mtime?: number;
}

function writeStr(buf: Uint8Array, offset: number, value: string, len: number) {
  for (let i = 0; i < len && i < value.length; i++) buf[offset + i] = value.charCodeAt(i) & 0xff;
}

function writeOctal(buf: Uint8Array, offset: number, value: number, len: number) {
  const s = value.toString(8).padStart(len - 1, '0').slice(-(len - 1));
  writeStr(buf, offset, s, len - 1);
  buf[offset + len - 1] = 0;
}

function readStr(buf: Uint8Array, offset: number, len: number): string {
  let end = offset;
  const stop = offset + len;
  while (end < stop && buf[end] !== 0) end++;
  let s = '';
  for (let i = offset; i < end; i++) s += String.fromCharCode(buf[i]);
  return s.trim();
}

function readOctal(buf: Uint8Array, offset: number, len: number): number {
  const s = readStr(buf, offset, len).replace(/[^0-7]/g, '');
  return s ? parseInt(s, 8) : 0;
}

function padTo512(n: number): number {
  const r = n % BLOCK;
  return r === 0 ? 0 : BLOCK - r;
}

export function createTar(entries: TarEntry[]): Uint8Array {
  let total = 0;
  for (const e of entries) total += BLOCK + e.data.length + padTo512(e.data.length);
  total += BLOCK * 2;

  const out = new Uint8Array(total);
  let off = 0;
  const now = Math.floor(Date.now() / 1000);

  for (const entry of entries) {
    const header = out.subarray(off, off + BLOCK);
    const name = entry.name.slice(0, 99);
    writeStr(header, 0, name, 100);
    writeOctal(header, 100, entry.mode ?? 0o644, 8);
    writeOctal(header, 108, 0, 8);
    writeOctal(header, 116, 0, 8);
    writeOctal(header, 124, entry.data.length, 12);
    writeOctal(header, 136, entry.mtime ?? now, 12);
    for (let i = 148; i < 156; i++) header[i] = 0x20;
    header[156] = 0x30; // typeflag '0' = regular file
    writeStr(header, 257, 'ustar', 6);
    writeStr(header, 263, '00', 2);
    writeStr(header, 265, 'filemorph', 32);
    writeStr(header, 297, 'filemorph', 32);

    let checksum = 0;
    for (let i = 0; i < BLOCK; i++) checksum += header[i];
    writeOctal(header, 148, checksum, 7);
    header[155] = 0x20;
    header[156] = 0x30;

    off += BLOCK;
    out.set(entry.data, off);
    off += entry.data.length + padTo512(entry.data.length);
  }

  // Two 512-byte zero blocks terminate the archive.
  off += BLOCK * 2;
  return out.subarray(0, off);
}

export function parseTar(bytes: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = [];
  let off = 0;
  let pendingLongName: string | null = null;

  while (off + BLOCK <= bytes.length) {
    const header = bytes.subarray(off, off + BLOCK);
    let empty = true;
    for (let i = 0; i < BLOCK; i++) {
      if (header[i] !== 0) {
        empty = false;
        break;
      }
    }
    if (empty) break;

    const name = readStr(header, 0, 100);
    const size = readOctal(header, 124, 12);
    const typeflag = String.fromCharCode(header[156] || 0x30);
    const prefix = readStr(header, 345, 155);
    off += BLOCK;
    const data = bytes.subarray(off, off + size);
    off += size + padTo512(size);

    if (typeflag === 'L') {
      pendingLongName = new TextDecoder().decode(data).replace(/\0+$/, '');
      continue;
    }
    if (typeflag === '5') continue; // directory

    const fullName = pendingLongName ?? (prefix ? `${prefix}/${name}` : name);
    pendingLongName = null;
    if (!fullName) continue;

    entries.push({
      name: fullName,
      data: bytes.slice(off - size - padTo512(size), off - padTo512(size)),
    });
  }

  return entries;
}

export function isTar(bytes: Uint8Array): boolean {
  if (bytes.length < BLOCK * 2) return false;
  const magic = readStr(bytes.subarray(257, 263), 0, 6);
  return magic === 'ustar' || magic.startsWith('ustar');
}
