import type { ReactNode } from 'react';

export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  tone = 'default',
}: {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'panel';
}) {
  return (
    <section id={id} className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-16 md:px-8 md:py-24">
      <div className="max-w-3xl">
        <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-sig">
          <span className="h-px w-6 bg-sig/50" />
          {eyebrow}
        </p>
        <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] tracking-tight text-fg sm:text-[2.6rem]">
          {title}
        </h2>
        {lead && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mut">{lead}</p>}
      </div>
      <div className={tone === 'panel' ? 'mt-10' : 'mt-10'}>{children}</div>
    </section>
  );
}

export function Chip({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md border border-line bg-ink-2 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mut"
      style={accent ? { borderColor: `${accent}55`, color: accent } : undefined}
    >
      {children}
    </span>
  );
}
