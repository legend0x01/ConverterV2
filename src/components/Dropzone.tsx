import { useRef, useState } from 'react';
import { UploadCloud, FolderOpen, Sparkles } from 'lucide-react';
import type { CategorySpec } from '../lib/formats';

interface Props {
  spec: CategorySpec;
  onFiles: (files: File[]) => void;
  onDemo: () => void;
  disabled?: boolean;
}

export default function Dropzone({ spec, onFiles, onDemo, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const accept = spec.inputs
    .map((f) => `.${f.toLowerCase().replace('*', '')}`)
    .join(',');

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onFiles(files);
      }}
      className={`relative overflow-hidden rounded-2xl border border-dashed transition-all duration-200 ${
        over ? 'border-sig bg-sig/[0.07]' : 'border-line-2 bg-ink-2/60 hover:border-sig/40'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="relative flex flex-col items-center px-5 py-12 text-center md:py-16">
        <div
          className={`grid h-16 w-16 place-items-center rounded-2xl border transition-colors ${
            over ? 'border-sig/60 bg-sig/15' : 'border-line bg-panel-2'
          }`}
        >
          <UploadCloud className={`h-7 w-7 ${over ? 'text-sig' : 'text-mut'}`} strokeWidth={1.6} />
        </div>

        <h3 className="mt-5 font-display text-xl font-semibold tracking-tight text-fg md:text-2xl">
          Drop {spec.tab.toLowerCase()} here
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-mut">
          Drag files in, or pick them from disk. {spec.blurb}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-sig px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={2.4} />
            Choose files
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onDemo}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-mut transition-colors hover:border-sig/40 hover:text-sig disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Generate a local sample
          </button>
        </div>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">
          accepts {spec.inputs.join(' \u00b7 ')}
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onFiles(files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
