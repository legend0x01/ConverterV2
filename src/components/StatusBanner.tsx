import { useEffect, useState } from 'react';
import { ShieldCheck, WifiOff } from 'lucide-react';
import { getNetworkState, subscribe } from '../lib/network';
import { formatBytes } from '../lib/formats';

/** The persistent privacy status bar that sits directly above the dropzone.
 *  Every value is read from the runtime, not hard-coded. */
export default function StatusBanner() {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const state = getNetworkState();
  const shell = state.shellBytes;
  const uptime = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
  const mm = String(Math.floor(uptime / 60)).padStart(2, '0');
  const ss = String(uptime % 60).padStart(2, '0');

  return (
    <div
      className={`relative flex flex-wrap items-center gap-x-5 gap-y-2 overflow-hidden rounded-t-xl border px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] sm:px-5 ${
        state.online ? 'border-sig/25 bg-sig/[0.05]' : 'border-warn/30 bg-warn/[0.05]'
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="scanline pointer-events-none absolute inset-0 opacity-60" />
      <span className="relative flex items-center gap-2">
        {state.online ? (
          <ShieldCheck className="h-3.5 w-3.5 text-sig" strokeWidth={2.4} />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-warn" strokeWidth={2.4} />
        )}
        <span className="text-mut-2">Active privacy status:</span>
        <span className={state.online ? 'text-sig' : 'text-warn'}>
          {state.online ? 'Local sandbox active' : 'Offline · fully operational'}
        </span>
      </span>

      <span className="relative hidden h-3 w-px bg-line-2 sm:block" />

      <span className="relative flex items-center gap-2" title="Bytes of file data observed leaving this tab since the page loaded">
        <span className="text-mut-2">Network transfer:</span>
        <span className="text-fg">{formatBytes(state.fileBytesSent)}</span>
        <span className="text-mut-2">of your files</span>
      </span>

      <span className="relative hidden h-3 w-px bg-line-2 sm:block" />

      <span className="relative flex items-center gap-2">
        <span className="text-mut-2">Shell:</span>
        <span className="text-fg">{formatBytes(shell)}</span>
        <span className="text-mut-2">· {state.requests.length} app requests · up {mm}:{ss}</span>
      </span>

      <span className="relative ml-auto flex items-center gap-2">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-sig" />
        <span className="text-sig/80">verified live</span>
      </span>
      <span className="sr-only">refresh {tick}</span>
    </div>
  );
}
