import Hero from '../components/Hero';
import Converter from '../components/Converter';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import EnginesSection from '../components/EnginesSection';
import HowItWorks from '../components/HowItWorks';
import FormatsMatrix from '../components/FormatsMatrix';
import Faq from '../components/Faq';
import { Section } from '../components/Section';
import NetworkLedger from '../components/NetworkLedger';
import { ArrowUpRight, Lock, Server, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main>
      <Hero />

      <section id="convert" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 pb-4 md:px-8">
        <Converter />
      </section>

      <Section
        id="trust"
        eyebrow="Trust anchors"
        title={<>Proof, not&nbsp;promises.</>}
        lead="Three guarantees, each backed by something you can verify in this tab."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Server,
              accent: '#2fe08a',
              title: 'Zero server uploads',
              body: 'There is no endpoint in this build that accepts a file. The request ledger below records every fetch and XHR the page makes — after the shell loads, it stays empty.',
              stat: '0 requests',
            },
            {
              icon: Timer,
              accent: '#45d6e6',
              title: 'Works fully offline',
              body: 'A service worker caches the shell and engines. Install it once and conversions keep working in airplane mode, because the encoder was always on your device.',
              stat: 'PWA ready',
            },
            {
              icon: Lock,
              accent: '#ffb020',
              title: 'End-to-end privacy',
              body: 'No analytics script, no cookie, no account, no telemetry pixel. Blobs live in a JavaScript array and disappear when the tab closes.',
              stat: '0 trackers',
            },
          ].map((c) => (
            <article key={c.title} className="panel relative overflow-hidden rounded-2xl p-6">
              <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />
              <c.icon className="h-5 w-5" style={{ color: c.accent }} strokeWidth={1.8} />
              <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-fg">{c.title}</h3>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-mut">{c.body}</p>
              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: c.accent }}>
                {c.stat}
              </p>
            </article>
          ))}
        </div>

        <div id="ledger" className="mt-8 scroll-mt-24">
          <NetworkLedger />
        </div>
      </Section>

      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <ArchitectureDiagram />
      </div>

      <EnginesSection />
      <HowItWorks />
      <FormatsMatrix />
      <Faq />

      <Section
        eyebrow="Ready when you are"
        title={<>Nothing to sign up&nbsp;for.</>}
        lead="There is no account, no quota and no upsell, because there is no server bill to cover. Drop a file and the engine starts."
      >
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#convert"
            className="inline-flex items-center gap-2.5 rounded-xl bg-sig px-6 py-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink transition-transform hover:-translate-y-0.5"
          >
            Open the converter
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.6} />
          </a>
          <Link
            to="/formats"
            className="inline-flex items-center gap-2 rounded-xl border border-line px-6 py-3.5 font-mono text-[11.5px] uppercase tracking-[0.16em] text-mut transition-colors hover:border-sig/40 hover:text-sig"
          >
            Browse the format matrix
          </Link>
        </div>
      </Section>
    </main>
  );
}
