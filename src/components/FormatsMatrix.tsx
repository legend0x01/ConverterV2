import { useState } from 'react';
import { CATEGORIES, type Category } from '../lib/formats';
import { Section } from './Section';

export default function FormatsMatrix({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState<Category>('image');
  const spec = CATEGORIES.find((c) => c.id === active)!;

  return (
    <Section
      id="formats"
      eyebrow="Feature matrix"
      title={<>Every format, and what powers&nbsp;it.</>}
      lead="Inputs the local decoders accept, outputs the local encoders can write, and the technology doing the work."
    >
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={`rounded-lg border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
              active === c.id ? 'border-sig/60 bg-sig/10 text-sig' : 'border-line text-mut hover:border-line-2 hover:text-fg'
            }`}
          >
            {c.tab}
          </button>
        ))}
      </div>

      <div className="panel mt-5 overflow-hidden rounded-2xl">
        <div className="grid gap-px bg-line/70 md:grid-cols-4">
          {[
            ['Category', spec.tab],
            ['Inputs', spec.inputs.join(' · ')],
            ['Outputs', spec.outputs.join(' · ')],
            ['Engine', spec.engine],
          ].map(([k, v]) => (
            <div key={k} className="bg-panel px-5 py-4">
              <p className="label">{k}</p>
              <p className="mt-2 font-mono text-[12px] leading-relaxed text-fg">{v}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-5 py-4">
          <p className="text-[13.5px] leading-relaxed text-mut">{spec.engineDetail}</p>
        </div>
      </div>

      {!compact && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-panel-2">
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">Category</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">Input formats</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">Output formats</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">Engine</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => (
                <tr key={c.id} className="border-t border-line bg-panel/60">
                  <td className="px-4 py-3.5 align-top">
                    <span className="font-mono text-[12px] uppercase tracking-[0.14em]" style={{ color: c.accent }}>
                      {c.tab}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-top font-mono text-[11.5px] leading-relaxed text-fg">{c.inputs.join(', ')}</td>
                  <td className="px-4 py-3.5 align-top font-mono text-[11.5px] leading-relaxed text-fg">{c.outputs.join(', ')}</td>
                  <td className="px-4 py-3.5 align-top text-[12px] leading-relaxed text-mut">{c.engine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-mut-2">
        * RAR, 7Z and ISO are input-only in this build. FileMorph flags them rather than silently routing them to a server.
      </p>
    </Section>
  );
}
