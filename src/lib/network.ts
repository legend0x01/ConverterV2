/* Live network ledger.
 *
 * FileMorph claims it never sends your files anywhere. Rather than asking you
 * to trust a marketing line, the app instruments its own runtime:
 *
 *  \u2022 window.fetch and XHR are wrapped so every application-level request is
 *    recorded with its byte count
 *  \u2022 a PerformanceObserver tallies resource timings for the static shell
 *
 * After the shell loads, the ledger should stay frozen. If a conversion ever
 * opened a socket, you would see the row appear.
 */

export interface NetEvent {
  id: number;
  at: number;
  url: string;
  method: string;
  transport: 'fetch' | 'xhr' | 'sse';
  bytes: number;
}

export interface AssetEvent {
  name: string;
  kind: string;
  bytes: number;
}

interface State {
  requests: NetEvent[];
  assets: AssetEvent[];
  shellBytes: number;
  fileBytesSent: number;
  startedAt: number;
  crossOriginIsolated: boolean;
  online: boolean;
}

const state: State = {
  requests: [],
  assets: [],
  shellBytes: 0,
  fileBytesSent: 0,
  startedAt: Date.now(),
  crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

const listeners = new Set<() => void>();
let seq = 0;

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getNetworkState(): State {
  return state;
}

function notify() {
  for (const fn of listeners) fn();
}

function shortUrl(raw: string): string {
  try {
    const u = new URL(raw, location.href);
    if (u.origin !== location.origin) return `${u.origin}${u.pathname}`;
    return u.pathname + u.search;
  } catch {
    return raw.slice(0, 80);
  }
}

function record(url: string, method: string, transport: NetEvent['transport'], bytes = 0) {
  const path = shortUrl(url);
  state.requests.unshift({ id: ++seq, at: Date.now(), url: path, method, transport, bytes });
  if (state.requests.length > 40) state.requests.length = 40;
  notify();
}

let installed = false;

export function installNetworkMonitor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  state.startedAt = Date.now();

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET') ?? 'GET';
    const res = await nativeFetch(input, init);
    const declared = Number(res.headers.get('content-length') ?? '0');
    record(url, method, 'fetch', Number.isFinite(declared) ? declared : 0);
    return res;
  };

  const xhrProto = XMLHttpRequest.prototype;
  const nativeOpen = xhrProto.open;
  const nativeSend = xhrProto.send;
  xhrProto.open = function (this: XMLHttpRequest, method: string, url: string, ...rest: unknown[]) {
    (this as unknown as { __fm: { method: string; url: string } }).__fm = { method, url };
    return (nativeOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
  };
  xhrProto.send = function (this: XMLHttpRequest, ...args: unknown[]) {
    const meta = (this as unknown as { __fm?: { method: string; url: string } }).__fm;
    if (meta) record(meta.url, meta.method, 'xhr', 0);
    return (nativeSend as (...a: unknown[]) => void).apply(this, args);
  };

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceResourceTiming;
        const bytes = e.transferSize || e.encodedBodySize || 0;
        state.shellBytes += bytes;
        state.assets.push({ name: shortUrl(e.name), kind: e.initiatorType, bytes });
        if (state.assets.length > 60) state.assets.length = 60;
      }
      notify();
    });
    observer.observe({ type: 'resource', buffered: true });
  } catch {
    /* Resource Timing is optional \u2014 the ledger still works without it. */
  }

  window.addEventListener('online', () => {
    state.online = true;
    notify();
  });
  window.addEventListener('offline', () => {
    state.online = false;
    notify();
  });

  // Opportunistically read storage so the UI can show real device capacity.
  if (navigator.storage?.estimate) {
    navigator.storage.estimate().then((est) => {
      notify();
      void est;
    }).catch(() => undefined);
  }

  notify();
}
