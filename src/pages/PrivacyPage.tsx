import PageHero from '../components/PageHero';
import NetworkLedger from '../components/NetworkLedger';
import { Section } from '../components/Section';
import { ShieldCheck, Database, Eye, Fingerprint } from 'lucide-react';

const THREATS = [
  {
    icon: ShieldCheck,
    title: 'Third-party breach',
    status: 'Eliminated',
    tone: 'text-sig',
    body: 'Your file is never stored by a converter operator, so a breach of their infrastructure cannot expose it. There is no copy to steal.',
  },
  {
    icon: Eye,
    title: 'Conversion logging',
    status: 'Eliminated',
    tone: 'text-sig',
    body: 'No request carries your filename or bytes. There is no analytics script and no telemetry endpoint in the bundle to receive them.',
  },
  {
    icon: Fingerprint,
    title: 'Cross-site tracking',
    status: 'Eliminated',
    tone: 'text-sig',
    body: 'No cookies, no fingerprinting script, no advertising identifier. The app writes nothing to storage between visits.',
  },
  {
    icon: Database,
    title: 'Local device seizure',
    status: 'Not protected',
    tone: 'text-warn',
    body: 'Local-only processing does not encrypt your disk. Use full-disk encryption and close the tab when you are done; FileMorph holds nothing after that.',
  },
];

const DATA_PATH = [
  {
    tag: 'network required',
    accent: '#45d6e6',
    title: 'App shell',
    body: 'HTML, JS, CSS, fonts and WASM, fetched once from static edge hosting. Cache-first, then served from the service worker.',
  },
  {
    tag: 'never leaves device',
    accent: '#2fe08a',
    title: 'Your file',
    body: 'Read with the File Reader API straight into a Blob. Converted by an engine inside the tab. Released when you clear or close.',
  },
  {
    tag: 'never leaves device',
    accent: '#2fe08a',
    title: 'Telemetry',
    body: 'None exists. There is no event queue, no error reporter and no session identifier anywhere in the bundle.',
  },
];

const HYGIENE = [
  ['Clear the buffer between jobs', 'Staged files stay in a JavaScript array until you clear it. Use the clear control in the workspace before walking away from the machine.'],
  ['Mind the size thresholds', 'Browser tabs cap somewhere between 1.5 and 4 GB of RAM. FileMorph warns past category limits and refuses inputs it cannot hold safely.'],
  ['Close the tab when finished', 'Blobs, object URLs and decoded bitmaps are all reclaimed with the tab. Nothing is written to disk except the file you explicitly save.'],
  ['Install once, convert offline', 'After the first visit the engines are cached locally, so sensitive conversions can be done with the network cable physically unplugged.'],
];

export default function PrivacyPage() {
  return (
    <main>
      <PageHero
        eyebrow="Privacy model"
        title={
          <>
            The strongest privacy
            <br />
            claim is architecture.
          </>
        }
        lead="A policy can be revised after a funding round. A codebase with no upload endpoint cannot. FileMorph removes the possibility of a leak by removing the network from the conversion path."
        image="images/airgap.png"
        imageAlt="A disconnected network cable resting beside a laptop"
        badge="air-gapped by construction"
      />

      <Section
        eyebrow="The data path"
        title={
          <>
            What touches the&nbsp;network.
          </>
        }
        lead="Three categories of data move through a browser tab. Only the first involves the internet, and it never contains your file."
      >
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line/70 md:grid-cols-3">
          {DATA_PATH.map((d) => (
            <div key={d.title} className="bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: d.accent }}>
                {d.tag}
              </p>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-fg">{d.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-mut">{d.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="ledger"
        eyebrow="Verifiable at runtime"
        title={
          <>
            Watch the app not do&nbsp;it.
          </>
        }
        lead="This ledger is populated by wrapping fetch and XMLHttpRequest inside your browser. Run a conversion and the table should stay frozen. For a harder check, open DevTools, switch to the Network tab, and watch nothing arrive while a file converts."
      >
        <NetworkLedger />
      </Section>

      <Section
        eyebrow="Threat model"
        title={
          <>
            What this protects you from, and what it&nbsp;does&nbsp;not.
          </>
        }
        lead="A privacy claim without a threat model is marketing. Here is the honest split."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {THREATS.map((t) => (
            <article key={t.title} className="panel rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4">
                <t.icon className="h-5 w-5 text-mut" strokeWidth={1.8} />
                <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${t.tone}`}>{t.status}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-fg">{t.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-mut">{t.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Handling rules"
        title={
          <>
            Safe defaults for sensitive&nbsp;files.
          </>
        }
        lead="Local processing removes the remote risk, but good hygiene still matters when you are handling ledgers, NDA material or medical records."
      >
        <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {HYGIENE.map(([title, body], i) => (
            <li key={title} className="flex gap-5 bg-panel px-6 py-5">
              <span className="font-mono text-[11px] tracking-[0.18em] text-sig/70">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-display text-[15px] font-semibold tracking-tight text-fg">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mut">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </main>
  );
}
