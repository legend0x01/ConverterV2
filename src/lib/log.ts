/* Session event log \u2014 the ticker in the hero panel and the workspace console. */

export interface LogEntry {
  id: number;
  at: number;
  channel: 'engine' | 'file' | 'net' | 'system';
  text: string;
}

const entries: LogEntry[] = [];
const listeners = new Set<() => void>();
let seq = 0;

export function log(channel: LogEntry['channel'], text: string) {
  entries.push({ id: ++seq, at: Date.now(), channel, text });
  if (entries.length > 60) entries.shift();
  for (const fn of listeners) fn();
}

export function subscribeLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLog(): LogEntry[] {
  return entries;
}

export function clock(at: number): string {
  const d = new Date(at);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
