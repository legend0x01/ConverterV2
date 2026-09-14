import { MousePointerClick, ArrowRight, Cpu, HardDriveDownload } from 'lucide-react';
import { Section } from './Section';

const STEPS = [
  {
    icon: MousePointerClick,
    step: '01',
    title: 'Arrive',
    body: 'The shell loads from static edge hosting. Fonts, scripts and engines are same-origin assets — there is no account, cookie or consent wall.',
  },
  {
    icon: HardDriveDownload,
    step: '02',
    title: 'Stage',
    body: 'Drag a file into the dropzone. The File Reader API pulls bytes into a Blob held in tab memory, and the category router picks an engine.',
  },
  {
    icon: Cpu,
    step: '03',
    title: 'Convert',
    body: 'A Web Worker performs the transform on OffscreenCanvas, JSZip, jsPDF or LAME while the UI thread stays free at 60 fps.',
  },
  {
    icon: ArrowRight,
    step: '04',
    title: 'Save',
    body: 'The result is an in-memory Blob. A blob: URL triggers a normal browser download straight to disk, then the buffer is released.',
  },
];

export default function HowItWorks() {
  return (
    <Section
      id="how"
      eyebrow="User flow"
      title={<>Four steps, zero&nbsp;handoffs.</>}
      lead="The entire pipeline runs between your filesystem and your memory. No step in the chain involves a network hop."
    >
      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line/70 md:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.step} className="group relative bg-panel p-6 transition-colors hover:bg-panel-2">
            <div className="flex items-center justify-between">
              <s.icon className="h-5 w-5 text-sig" strokeWidth={1.7} />
              <span className="font-mono text-[11px] tracking-[0.18em] text-mut-2 transition-colors group-hover:text-sig/70">{s.step}</span>
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-fg">{s.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-mut">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ['Target success rate', '>98%', 'files inside the stated size thresholds'],
          ['Image / document time', '<2s', 'typical on a modern laptop, no network wait'],
          ['Archive under 50 MB', '<10s', 'deflate + tar headers, all in-tab'],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-xl border border-line bg-ink-2/60 px-5 py-4">
            <p className="label">{label}</p>
            <p className="mt-1.5 font-display text-2xl font-semibold text-sig">{value}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-mut-2">{note}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
