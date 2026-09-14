import { Link } from 'react-router-dom';
import { Mark } from './Brand';
import { CATEGORIES } from '../lib/formats';

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Mark size={24} />
              <span className="font-mono text-[13px] font-semibold tracking-[0.22em] text-fg">
                FILE<span className="text-sig">MORPH</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-mut">
              A static, client-side file converter. No conversion servers exist to operate, so there is nothing to breach, nothing to log, and nothing to sell.
            </p>
          </div>

          <div>
            <p className="label">Engines</p>
            <ul className="mt-4 space-y-2.5">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <Link to="/formats" className="text-sm text-mut transition-colors hover:text-sig">
                    {c.tab}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label">Trust</p>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/privacy" className="text-sm text-mut transition-colors hover:text-sig">Privacy model</Link></li>
              <li><Link to="/privacy#ledger" className="text-sm text-mut transition-colors hover:text-sig">Live network ledger</Link></li>
              <li><Link to="/tech" className="text-sm text-mut transition-colors hover:text-sig">Architecture</Link></li>
              <li><Link to="/formats" className="text-sm text-mut transition-colors hover:text-sig">Format matrix</Link></li>
            </ul>
          </div>

          <div>
            <p className="label">Runtime facts</p>
            <dl className="mt-4 space-y-2 font-mono text-[11px]">
              {[
                ['Host type', 'static edge'],
                ['Backend APIs', 'none'],
                ['Third-party calls', '0'],
                ['Fonts', 'self-hosted'],
                ['Telemetry', 'not installed'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5">
                  <dt className="text-mut-2">{k}</dt>
                  <dd className="text-sig">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2 sm:flex-row sm:items-center">
          <span>© 2026 FileMorph · runs entirely in your browser</span>
          <span className="text-sig/70">Built as a static bundle · zero infrastructure</span>
        </div>
      </div>
    </footer>
  );
}
