import PageHero from '../components/PageHero';
import { Section } from '../components/Section';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const STACK = [
  ['Interface', 'React 19 + Vite 7 + Tailwind v4', 'Static bundle, no server runtime. The whole app compiles to a handful of hashed assets.'],
  ['Threading', 'Dedicated Web Worker', 'Archive and raster work runs off the UI thread so the interface keeps rendering during a long job.'],
  ['Raster', 'OffscreenCanvas + createImageBitmap', 'Decode and encode without touching the DOM, which is what makes worker-side conversion possible.'],
  ['Archive', 'JSZip + fflate + hand-written ustar', 'Deflate and gzip from fflate; the tar reader and writer are implemented from the spec.'],
  ['Documents', 'jsPDF + pdf.js', 'Pagination and layout happen in memory; PDF text extraction runs through a locally bundled pdf.js worker.'],
  ['Audio', 'WebAudio + a bundled LAME port', 'Native codecs decode the file; a bundled LAME build re-encodes to MP3 inside the tab.'],
  ['Animation', 'Custom GIF89a encoder', 'Median-cut quantiser and variable-width LZW compressor written from scratch — browsers refuse to encode GIF through canvas.'],
  ['Offline', 'Service worker + web manifest', 'Cache-first shell with a navigation fallback, so the tool survives a dead connection.'],
];

const CONSTRAINTS = [
  {
    title: 'Browser memory ceiling',
    body: 'Tabs typically cap between 1.5 GB and 4 GB. Archive work is the dangerous case because a compressed file expands in memory.',
    mitigation: 'Per-category size thresholds with explicit warnings, an archive member cap, and a hard refusal past the safe limit rather than a tab crash.',
  },
  {
    title: 'Proprietary containers',
    body: 'RAR is closed-source and 7Z needs a WASM decoder bundle that is not part of this build. DMG has even less browser support.',
    mitigation: 'Marked input-only in the UI, with the reason printed next to the option. Extraction to ZIP or TAR is offered only where a real local decoder exists.',
  },
  {
    title: 'SharedArrayBuffer headers',
    body: 'True multi-threaded WASM such as FFmpeg.wasm requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers.',
    mitigation: 'The build avoids SharedArrayBuffer entirely, so it runs on any static host without special headers. Video support is scoped to what the platform does natively.',
  },
];

const KPIS = [
  ['Success rate', '>98%', 'files within the stated thresholds'],
  ['Images / documents', '<2s', 'median wall-clock time'],
  ['Archives under 50 MB', '<10s', 'deflate plus tar headers'],
  ['UI responsiveness', '60 fps', 'heavy work runs on a worker'],
];

export default function TechPage() {
  return (
    <main>
      <PageHero
        eyebrow="Architecture"
        title={
          <>
            A converter with
            <br />
            no conversion server.
          </>
        }
        lead="The interesting engineering constraint here is subtraction. Every capability had to be achievable inside a static bundle that costs nothing to run and cannot receive a file."
        image="images/die.png"
        imageAlt="Macro photograph of a processor die and circuit board traces"
        badge="zero infrastructure"
      />

      <Section
        eyebrow="Stack"
        title={
          <>
            What is in the&nbsp;bundle.
          </>
        }
        lead="Each layer was chosen because it can run in a browser tab with no network dependency."
      >
        <div className="overflow-hidden rounded-2xl border border-line">
          {STACK.map(([layer, tech, note], i) => (
            <div
              key={layer}
              className={`grid gap-2 px-5 py-5 md:grid-cols-[130px_260px_1fr] md:gap-6 md:px-6 ${i % 2 === 0 ? 'bg-panel' : 'bg-panel-2/60'}`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sig">{layer}</p>
              <p className="font-mono text-[12.5px] leading-relaxed text-fg">{tech}</p>
              <p className="text-[13px] leading-relaxed text-mut">{note}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Constraints"
        title={
          <>
            Limits, and how they are&nbsp;handled.
          </>
        }
        lead="A browser tab is a constrained runtime. Pretending otherwise produces apps that crash at the worst moment."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {CONSTRAINTS.map((c) => (
            <article key={c.title} className="panel rounded-2xl p-6">
              <h3 className="font-display text-[16px] font-semibold tracking-tight text-fg">{c.title}</h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-mut">{c.body}</p>
              <p className="mt-5 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-sig">Mitigation</p>
              <p className="mt-2 text-[13px] leading-relaxed text-mut">{c.mitigation}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Performance"
        title={
          <>
            Targets this design aims&nbsp;for.
          </>
        }
        lead="Local processing removes upload and download latency entirely, which is where most converter time actually goes."
      >
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line/70 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map(([label, value, note]) => (
            <div key={label} className="bg-panel px-5 py-5">
              <p className="label">{label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-sig">{value}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mut-2">{note}</p>
            </div>
          ))}
        </div>

        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-sig transition-colors hover:text-sig-2"
        >
          Try it in the converter <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Section>
    </main>
  );
}
