import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, ShieldCheck, WifiOff } from 'lucide-react';
import { Mark, Wordmark } from './Brand';
import { getNetworkState, subscribe } from '../lib/network';

const LINKS = [
  { to: '/', label: 'Converter' },
  { to: '/formats', label: 'Formats' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/tech', label: 'Tech' },
];

function useSnapshot<T>(read: () => T): T {
  const [value, setValue] = useState<T>(read);
  useEffect(() => subscribe(() => setValue(read())), [read]);
  return value;
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const online = useSnapshot(() => getNetworkState().online);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Mark />
          <Wordmark />
          <span className="hidden font-mono text-[10px] tracking-[0.18em] text-mut-2 sm:inline">v2.4</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                  isActive ? 'text-sig' : 'text-mut hover:text-fg'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-sig/25 bg-sig/[0.06] px-3 py-1.5 sm:flex">
            {online ? (
              <ShieldCheck className="h-3.5 w-3.5 text-sig" strokeWidth={2.2} />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-warn" strokeWidth={2.2} />
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-sig">
              {online ? 'Local sandbox active' : 'Offline \u00b7 still working'}
            </span>
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-sig" />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-md border border-line text-mut md:hidden"
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-ink-2 px-5 py-3 md:hidden">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-md px-2 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] ${
                  isActive ? 'text-sig' : 'text-mut'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
