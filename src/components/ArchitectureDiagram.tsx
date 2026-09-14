import { motion } from 'framer-motion';
import { CloudUpload, Cpu, HardDriveDownload, Lock, ShieldCheck, Trash2 } from 'lucide-react';

interface Node {
  label: string;
  sub: string;
  icon: typeof Cpu;
  tone: 'risk' | 'ok' | 'neutral';
}

const CLOUD: Node[] = [
  { label: 'User file', sub: 'your document', icon: HardDriveDownload, tone: 'neutral' },
  { label: 'Internet upload', sub: 'full file bytes', icon: CloudUpload, tone: 'risk' },
  { label: 'Third-party cloud', sub: 'indexed + retained', icon: Trash2, tone: 'risk' },
  { label: 'Internet download', sub: 'wait for queue', icon: CloudUpload, tone: 'risk' },
];

const LOCAL: Node[] = [
  { label: 'User file', sub: 'stays on device', icon: HardDriveDownload, tone: 'neutral' },
  { label: 'Browser engine', sub: 'WASM · worker · RAM', icon: Cpu, tone: 'ok' },
  { label: 'Saved to device', sub: 'blob URL → disk', icon: ShieldCheck, tone: 'ok' },
];

const toneStyles = {
  risk: { border: 'border-risk/40', text: 'text-risk', bg: 'bg-risk/[0.07]', dot: 'bg-risk' },
  ok: { border: 'border-sig/45', text: 'text-sig', bg: 'bg-sig/[0.07]', dot: 'bg-sig' },
  neutral: { border: 'border-line-2', text: 'text-fg', bg: 'bg-panel-2', dot: 'bg-mut' },
};

function Flow({ nodes, verdict, verdictTone }: { nodes: Node[]; verdict: string; verdictTone: 'risk' | 'ok' }) {
  const accent = verdictTone === 'risk' ? '#ff5e57' : '#2fe08a';
  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        {nodes.map((n, i) => {
          const tone = toneStyles[n.tone];
          return (
            <div key={n.label} className="flex flex-1 items-center gap-3">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className={`flex flex-1 items-center gap-3 rounded-xl border px-4 py-3.5 ${tone.border} ${tone.bg}`}
              >
                <n.icon className={`h-4 w-4 shrink-0 ${tone.text}`} strokeWidth={1.9} />
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg">{n.label}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-mut-2">{n.sub}</p>
                </div>
              </motion.div>

              {i < nodes.length - 1 && (
                <div className="hidden shrink-0 flex-col items-center gap-1 md:flex">
                  <div className="relative h-px w-8 bg-line-2">
                    <span
                      className="absolute -top-[2px] left-0 h-[5px] w-[5px] rounded-full"
                      style={{ background: accent, animation: `flowline 1.8s linear ${i * 0.3}s infinite` }}
                    />
                  </div>
                  <span className="font-mono text-[8px] text-mut-2">→</span>
                </div>
              )}
              {i < nodes.length - 1 && (
                <div className="flex shrink-0 flex-col items-center md:hidden">
                  <div className="h-5 w-px bg-line-2" />
                  <span className="font-mono text-[9px] text-mut-2">↓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: accent }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        {verdict}
      </div>
    </div>
  );
}

export default function ArchitectureDiagram() {
  return (
    <div className="panel relative overflow-hidden rounded-2xl p-5 sm:p-8">
      <span className="scanline pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <Lock className="h-3.5 w-3.5 text-mut-2" strokeWidth={2} />
          <p className="label">Architecture comparison</p>
        </div>
        <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          Where your file actually goes
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mut">
          A conventional converter is a queue in front of someone else's hard drive. FileMorph removes the queue, the
          server, and the operator.
        </p>

        <div className="mt-8 space-y-8">
          <div>
            <p className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-risk">
              <span className="h-px w-5 bg-risk/50" />
              Traditional converters
            </p>
            <Flow nodes={CLOUD} verdict="High risk · slow · leaves a copy behind" verdictTone="risk" />
          </div>

          <div className="border-t border-line pt-8">
            <p className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-sig">
              <span className="h-px w-5 bg-sig/50" />
              FileMorph
            </p>
            <Flow nodes={LOCAL} verdict="100% private · fast · nothing to breach" verdictTone="ok" />
          </div>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line/70 sm:grid-cols-3">
          {[
            ['Bytes uploaded', '0', '#2fe08a'],
            ['Third-party services', '0', '#2fe08a'],
            ['Bytes retained after close', '0', '#2fe08a'],
          ].map(([label, value, color]) => (
            <div key={label} className="bg-panel px-5 py-4">
              <p className="label">{label}</p>
              <p className="mt-1.5 font-display text-3xl font-semibold" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
