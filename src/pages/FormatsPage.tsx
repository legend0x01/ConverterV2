import PageHero from '../components/PageHero';
import FormatsMatrix from '../components/FormatsMatrix';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const BOUNDARIES = [
  {
    title: 'RAR, 7Z and ISO creation',
    body: 'These containers are proprietary or need a WASM decoder this build does not carry. Extraction is flagged as unavailable rather than delegated to a cloud API.',
  },
  {
    title: 'Video transcoding',
    body: 'MP4 to WEBM needs FFmpeg.wasm: a multi-megabyte runtime that also demands cross-origin isolation headers. Frame capture and GIF animation are offered instead, and they are genuinely local.',
  },
  {
    title: 'OCR on scanned PDFs',
    body: 'A raster page has no text layer. Producing one requires an OCR model far beyond a static bundle, so the app reports "no text layer" rather than returning garbage.',
  },
];

export default function FormatsPage() {
  return (
    <main>
      <PageHero
        eyebrow="Reference"
        title={
          <>
            What this build can
            <br />
            actually convert.
          </>
        }
        lead="Everything listed here runs through a decoder and an encoder that ship inside the bundle. If a format needs a server, it is not on the list — and the app will say so instead of hiding it."
        badge="all engines local"
      />
      <FormatsMatrix />

      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8">
        <div className="panel rounded-2xl p-6 sm:p-8">
          <p className="label">Honest boundaries</p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg">
            What this build deliberately does not do
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {BOUNDARIES.map((b) => (
              <div key={b.title}>
                <h3 className="font-display text-[15px] font-semibold tracking-tight text-fg">{b.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-mut">{b.body}</p>
              </div>
            ))}
          </div>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-sig transition-colors hover:text-sig-2"
          >
            Open the converter <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
