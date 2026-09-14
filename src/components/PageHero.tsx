import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export default function PageHero({
  eyebrow,
  title,
  lead,
  image,
  imageAlt,
  badge,
}: {
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  image?: string;
  imageAlt?: string;
  badge?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div
        className="pointer-events-none absolute -top-32 left-1/4 h-[420px] w-[680px] -translate-x-1/2 rounded-full opacity-35 blur-[130px]"
        style={{ background: 'radial-gradient(circle, rgba(47,224,138,.28), transparent 65%)' }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-sig">
              <span className="h-px w-6 bg-sig/50" />
              {eyebrow}
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mut">{lead}</p>
            {badge && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-sig/25 bg-sig/[0.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-sig">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-sig" />
                {badge}
              </p>
            )}
          </div>

          {image && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative hidden overflow-hidden rounded-2xl border border-line lg:block"
            >
              <img
                src={image}
                alt={imageAlt ?? ''}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover opacity-90"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-ink via-ink/25 to-transparent" />
              <div className="scanline pointer-events-none absolute inset-0 opacity-50" />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
