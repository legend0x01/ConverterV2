import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ShieldCheck, Cpu, HardDrive, WifiOff } from 'lucide-react';
import SessionLog from './SessionLog';
import NetworkLedger from './NetworkLedger';
import { getNetworkState, subscribe } from '../lib/network';

function useUptime() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.floor((now - getNetworkState().startedAt) / 1000));
}

const STATS = [
  ['Bytes uploaded', '0'],
  ['Local engines', '4'],
  ['Formats handled', '30+'],
  ['Median image job', '<2s'],
];

export default function Hero() {
  const uptime = useUptime();
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  const state = getNetworkState();
  const mm = String(Math.floor(uptime / 60)).padStart(2, '0');
  const ss = String(uptime % 60).padStart(2, '0');

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-70" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(47,224,138,.30), transparent 65%)' }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-mut-2"
          >
            <span className="flex items-center gap-2 rounded-full border border-sig/25 bg-sig/[0.06] px-2.5 py-1 text-sig">
              <ShieldCheck className="h-3 w-3" strokeWidth={2.4} /> client-side file engine
            </span>
            <span>static edge build 2.4.0</span>
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mt-6 font-display text-[2.55rem] font-semibold leading-[1.02] tracking-[-0.03em] text-fg sm:text-6xl lg:text-[4.1rem]"
          >
            Convert Any File.
            <br />
            <span className="text-sig">100% Local.</span>
            <br />
            Zero Cloud Uploads.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-mut"
          >
            Images, documents, archives and media are transformed inside a Web Worker on your own machine. No server
            receives the bytes, no queue holds your file, and nothing survives the tab you opened.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <a
              href="#convert"
              className="inline-flex items-center gap-2.5 rounded-xl bg-sig px-6 py-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink transition-transform hover:-translate-y-0.5"
            >
              Convert a file
              <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.6} />
            </a>
            <a
              href="privacy"
              className="inline-flex items-center gap-2 rounded-xl border border-line px-6 py-3.5 font-mono text-[11.5px] uppercase tracking-[0.16em] text-mut transition-colors hover:border-sig/40 hover:text-sig"
            >
              Read the privacy model
            </a>
          </motion.div>

          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line/60 sm:grid-cols-4">
            {STATS.map(([label, value]) => (
              <div key={label} className="bg-panel px-4 py-3.5">
                <dt className="label">{label}</dt>
                <dd className="mt-1 font-display text-xl font-semibold text-fg">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Live security monitor */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="panel screws relative overflow-hidden rounded-2xl p-5 pt-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-sig" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg">Live security monitor</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">{mm}:{ss}</span>
            </div>

            <div className="grid grid-cols-2 gap-px bg-line/60">
              {[
                { icon: ShieldCheck, label: 'Sandbox', value: state.online ? 'local · active' : 'offline · active', tone: 'text-sig' },
                { icon: Cpu, label: 'Engine', value: typeof Worker !== 'undefined' ? 'worker thread' : 'inline', tone: 'text-cyan' },
                { icon: HardDrive, label: 'Storage', value: 'tab memory only', tone: 'text-mut' },
                { icon: state.online ? WifiOff : WifiOff, label: 'Offline', value: state.online ? 'ready to install' : 'converting now', tone: state.online ? 'text-mut' : 'text-warn' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2.5 bg-panel px-3 py-2.5">
                  <row.icon className={`h-3.5 w-3.5 shrink-0 ${row.tone}`} strokeWidth={1.9} />
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mut-2">{row.label}</p>
                    <p className={`truncate font-mono text-[11px] ${row.tone}`}>{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.18em] text-mut-2">Session log</p>
            <div className="mt-2 rounded-lg border border-line bg-ink/70 p-3">
              <SessionLog />
            </div>
          </div>

          <NetworkLedger compact />
        </motion.div>
      </div>
    </section>
  );
}
