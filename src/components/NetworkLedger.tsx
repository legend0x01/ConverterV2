import { useEffect, useState } from 'react';
import { getNetworkState, subscribe } from '../lib/network';
import { formatBytes } from '../lib/formats';
import { clock } from '../lib/log';

/** Live evidence panel: every application-level request the page makes, with
 *  byte counts. Post-load this table is empty by construction. */
export default function NetworkLedger({ compact = false }: { compact?: boolean }) {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  const state = getNetworkState();
  const rows = state.requests;

  return (
    <div className="panel overflow-hidden rounded-xl">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-sig" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg">Outbound request ledger</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">
          {rows.length} since load
        </span>
      </div>

      <div className="max-h-56 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-4 py-7 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sig">— no outbound transfers observed —</p>
            {!compact && (
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-mut-2">
                This table is populated by wrapping <code className="text-mut">fetch</code> and <code className="text-mut">XMLHttpRequest</code> in your browser. Your files are converted without either being called.
              </p>
            )}
          </div>
        ) : (
          <table className="w-full font-mono text-[10.5px]">
            <thead>
              <tr className="text-left text-mut-2">
                <th className="px-4 py-2 font-normal uppercase tracking-[0.14em]">Time</th>
                <th className="px-2 py-2 font-normal uppercase tracking-[0.14em]">Method</th>
                <th className="px-2 py-2 font-normal uppercase tracking-[0.14em]">Path</th>
                <th className="px-4 py-2 text-right font-normal uppercase tracking-[0.14em]">Bytes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line/70">
                  <td className="px-4 py-1.5 text-mut-2">{clock(r.at)}</td>
                  <td className="px-2 py-1.5 text-cyan">{r.method}</td>
                  <td className="max-w-[180px] truncate px-2 py-1.5 text-mut">{r.url}</td>
                  <td className="px-4 py-1.5 text-right text-warn">{formatBytes(r.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line/60 sm:grid-cols-4">
          {[
            ['File bytes sent', formatBytes(state.fileBytesSent)],
            ['Shell transferred', formatBytes(state.shellBytes)],
            ['Cross-origin isolated', state.crossOriginIsolated ? 'yes' : 'no'],
            ['Network state', state.online ? 'online \u00b7 unused' : 'offline'],
          ].map(([k, v]) => (
            <div key={k} className="bg-panel px-4 py-3">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-mut-2">{k}</p>
              <p className="mt-1 font-mono text-[13px] text-sig">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
