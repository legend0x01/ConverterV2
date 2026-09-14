import { CATEGORIES } from '../lib/formats';
import { Section, Chip } from './Section';

export default function EnginesSection() {
  return (
    <Section
      id="engines"
      eyebrow="Execution layer"
      title={
        <>Four engines. None of them&nbsp;online.</>
      }
      lead={
        <>Each category is handled by a purpose-built local engine running inside your tab. Archive and image work is
        pushed onto a dedicated Web Worker so the interface keeps rendering while a large file is deflated.</>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map((c) => (
          <article key={c.id} className="panel group relative overflow-hidden rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1">
            <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl font-semibold tracking-tight text-fg">{c.tab}</h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: c.accent }}>
                {c.title}
              </span>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mut">{c.engineDetail}</p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">Engine</p>
            <p className="mt-1 font-mono text-[12px] leading-relaxed" style={{ color: c.accent }}>
              {c.engine}
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {c.inputs.map((f) => (
                <Chip key={`in-${f}`}>{f}</Chip>
              ))}
            </div>
            <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-mut-2">Produces</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.outputs.map((f) => (
                <Chip key={`out-${f}`} accent={c.accent}>
                  {f}
                </Chip>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
