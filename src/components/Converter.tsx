import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  Loader2,
  Play,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import Dropzone from './Dropzone';
import StatusBanner from './StatusBanner';
import {
  CATEGORY_BY_ID,
  CATEGORIES,
  INPUT_ONLY,
  SIZE_LIMITS,
  detectCategory,
  extOf,
  formatBytes,
  mediaKind,
  targetsFor,
  type Category,
} from '../lib/formats';
import { runConversion } from '../lib/convertRunner';
import { saveAll, saveBlob } from '../lib/download';
import { log } from '../lib/log';
import { makeDemoFiles } from '../lib/demo';

interface FileItem {
  id: number;
  file: File;
  name: string;
  size: number;
  ext: string;
  category: Category;
  warning?: string;
}

interface Outcome {
  id: number;
  sourceName: string;
  sourceSize: number;
  status: 'ok' | 'error';
  ms: number;
  outputs: { name: string; blob: Blob; note?: string }[];
  error?: string;
}

const ICONS: Record<Category, typeof FileImage> = {
  image: FileImage,
  document: FileText,
  archive: FileArchive,
  media: FileAudio,
};

let fileSeq = 0;

export default function Converter() {
  const [category, setCategory] = useState<Category>('image');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [target, setTarget] = useState('');
  const [quality, setQuality] = useState(0.85);
  const [maxWidth, setMaxWidth] = useState(0);
  const [gifFps, setGifFps] = useState(10);
  const [gifWidth, setGifWidth] = useState(480);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ pct: 0, label: '' });
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  const spec = CATEGORY_BY_ID[category];
  const first = files[0];

  /* ---------------------------------------------------------- file intake */
  const addFiles = useCallback(
    (incoming: File[]) => {
      const detected = incoming.map((file) => detectCategory(file));
      const dominant = detected[0] ?? category;
      const sameCategory = detected.every((d) => d === dominant);

      if (!sameCategory) {
        log('file', `mixed categories in drop — routing each file to its own engine`);
      } else {
        setCategory(dominant);
      }

      const limits = SIZE_LIMITS[dominant];
      const items: FileItem[] = incoming.map((file) => {
        const cat = detectCategory(file);
        const ext = extOf(file.name);
        const lim = SIZE_LIMITS[cat];
        let warning: string | undefined;
        if (file.size > lim.hard) warning = `Above the ${formatBytes(lim.hard)} safe threshold for this engine — the tab may run out of memory.`;
        else if (file.size > lim.warn) warning = `Large file (${formatBytes(file.size)}). Processing stays local but may take a while.`;
        if (INPUT_ONLY[ext]) warning = INPUT_ONLY[ext];
        void lim;
        return { id: ++fileSeq, file, name: file.name, size: file.size, ext, category: cat, warning };
      });

      setFiles((prev) => [...prev, ...items].slice(0, 40));
      setOutcomes([]);
      void limits;
      log('file', `staged ${incoming.length} file${incoming.length === 1 ? '' : 's'} in tab memory · ${formatBytes(incoming.reduce((a, f) => a + f.size, 0))}`);
    },
    [category]
  );

  const loadDemo = useCallback(async () => {
    try {
      const demo = await makeDemoFiles(category);
      log('file', `generated ${demo.length} sample file${demo.length === 1 ? '' : 's'} locally — nothing downloaded`);
      addFiles(demo);
    } catch {
      log('engine', 'sample generation failed in this browser');
    }
  }, [addFiles, category]);

  /* ------------------------------------------------------- target options */
  const options = useMemo(() => {
    const ext = first ? first.ext : category === 'archive' ? 'zip' : category === 'image' ? 'png' : category === 'document' ? 'md' : 'mp3';
    const groups = targetsFor(category, ext);
    if (category === 'media' && first) {
      const kind = mediaKind(first.file);
      return groups
        .map((g) => ({ ...g, options: g.options.filter((o) => (kind === 'audio' ? o.value === 'wav' || o.value === 'mp3' : o.value === 'gif' || o.value === 'png' || o.value === 'jpg')) }))
        .filter((g) => g.options.length > 0);
    }
    return groups;
  }, [category, first]);

  const flat = useMemo(() => options.flatMap((g) => g.options), [options]);
  const blocked = Boolean(first && INPUT_ONLY[first.ext]);

  useEffect(() => {
    if (!flat.length) return;
    const stillValid = flat.some((o) => o.value === target);
    if (!stillValid) {
      const preferred = flat.find((o) => o.value !== '__blocked__' && o.value !== '__recompose__');
      setTarget(preferred?.value ?? flat[0].value);
    }
  }, [flat, target]);

  const activeOption = flat.find((o) => o.value === target);
  const canConvert = files.length > 0 && !busy && !blocked && target && !target.startsWith('__');

  /* ------------------------------------------------------------- convert */
  const convert = async () => {
    if (!canConvert) return;
    setBusy(true);
    setOutcomes([]);
    setProgress({ pct: 0, label: 'starting local engine' });
    log('engine', `job queued · ${files.length} file${files.length === 1 ? '' : 's'} → ${target.toUpperCase()} · worker=${typeof Worker !== 'undefined' ? 'dedicated thread' : 'inline'}`);

    const results: Outcome[] = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      const started = performance.now();
      const base = (i / files.length) * 100;
      const span = 100 / files.length;

      // Each file resolves its own valid target; the dropdown is a default.
      const perFileTargets = targetsFor(item.category, item.ext).flatMap((g) => g.options.map((o) => o.value));
      const chosen = perFileTargets.includes(target) ? target : perFileTargets.find((v) => !v.startsWith('__')) ?? target;

      try {
        const outputs = await runConversion(
          {
            category: item.category,
            file: item.file,
            fileName: item.name,
            ext: item.ext,
            target: chosen,
            quality,
            maxWidth: maxWidth > 0 ? maxWidth : undefined,
            gifFps,
            gifWidth,
          },
          (pct, label) => setProgress({ pct: Math.min(99, Math.round(base + (pct / 100) * span)), label: `${item.name} · ${label}` })
        );

        const ms = performance.now() - started;
        const bytesOut = outputs.reduce((a, o) => a + o.blob.size, 0);
        results.push({ id: item.id, sourceName: item.name, sourceSize: item.size, status: 'ok', ms, outputs });
        log(
          'engine',
          `${item.name} → ${outputs.map((o) => o.name).join(', ')} · ${ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`} · ${formatBytes(item.size)} → ${formatBytes(bytesOut)}`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ id: item.id, sourceName: item.name, sourceSize: item.size, status: 'error', ms: performance.now() - started, outputs: [], error: message });
        log('engine', `${item.name} failed · ${message.slice(0, 90)}`);
      }
      setOutcomes([...results]);
    }

    setProgress({ pct: 100, label: 'complete' });
    setBusy(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
  };

  const allOutputs = outcomes.filter((o) => o.status === 'ok').flatMap((o) => o.outputs);
  const totalOut = allOutputs.reduce((a, f) => a + f.blob.size, 0);
  const totalIn = outcomes.reduce((a, o) => a + o.sourceSize, 0);

  const switchCategory = (next: Category) => {
    if (busy || next === category) return;
    setCategory(next);
    setFiles([]);
    setOutcomes([]);
    setTarget('');
    log('system', `engine switched → ${CATEGORY_BY_ID[next].tab.toLowerCase()} · ${CATEGORY_BY_ID[next].engine}`);
  };

  return (
    <div className="panel relative rounded-2xl">
      <StatusBanner />

      <div className="px-4 pb-6 pt-6 sm:px-6 md:px-8 md:pb-8">
        {/* Engine tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-line pb-3">
          {CATEGORIES.map((c) => {
            const Icon = ICONS[c.id];
            const active = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => switchCategory(c.id)}
                disabled={busy}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  active ? 'text-fg' : 'text-mut-2 hover:text-mut'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.9} style={active ? { color: c.accent } : undefined} />
                {c.tab}
                {active && (
                  <motion.span
                    layoutId="engine-tab"
                    className="absolute inset-x-1 -bottom-[13px] h-[2px]"
                    style={{ background: c.accent }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            );
          })}
          <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2 lg:block">
            {spec.engine}
          </span>
        </div>

        {/* Dropzone */}
        <div className="mt-5">
          <Dropzone spec={spec} onFiles={addFiles} onDemo={loadDemo} disabled={busy} />
        </div>

        {/* Trust badges — directly below the dropzone */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Zero server uploads',
              body: 'Files are read into tab memory and processed there. There is no upload step to intercept.',
              accent: '#2fe08a',
            },
            {
              icon: Download,
              title: 'Works fully offline',
              body: 'Installable as a PWA. Once loaded, the engine keeps converting with the network unplugged.',
              accent: '#45d6e6',
            },
            {
              icon: AlertTriangle,
              title: 'End-to-end privacy',
              body: 'No logging, no analytics, no cookies, no account. The app has nothing to leak.',
              accent: '#ffb020',
            },
          ].map((b) => (
            <div key={b.title} className="rounded-xl border border-line bg-ink-2/70 p-4">
              <div className="flex items-center gap-2">
                <b.icon className="h-3.5 w-3.5" style={{ color: b.accent }} strokeWidth={2.2} />
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg">{b.title}</p>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-mut">{b.body}</p>
            </div>
          ))}
        </div>

        {/* Staged files */}
        {files.length > 0 && (
          <div className="mt-6 rounded-xl border border-line bg-ink-2/60">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">
                {files.length} staged in RAM · {formatBytes(files.reduce((a, f) => a + f.size, 0))}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setOutcomes([]);
                  log('file', 'buffer cleared — all staged blobs released');
                }}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2 transition-colors hover:text-risk"
              >
                <Trash2 className="h-3 w-3" /> clear
              </button>
            </div>
            <ul className="divide-y divide-line/70">
              {files.map((f) => {
                const Icon = ICONS[f.category];
                const out = outcomes.find((o) => o.id === f.id);
                return (
                  <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-mut-2" strokeWidth={1.8} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="truncate text-sm text-fg">{f.name}</p>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mut-2">
                          {f.ext || 'bin'} · {formatBytes(f.size)}
                        </span>
                        {out?.status === 'ok' && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-sig">
                            done in {out.ms < 1000 ? `${out.ms.toFixed(0)}ms` : `${(out.ms / 1000).toFixed(2)}s`}
                          </span>
                        )}
                        {out?.status === 'error' && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-risk">failed</span>
                        )}
                      </div>
                      {f.warning && <p className="mt-1.5 text-[12px] leading-relaxed text-warn/90">{f.warning}</p>}
                      {out?.error && <p className="mt-1.5 text-[12px] leading-relaxed text-risk/90">{out.error}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                      className="mt-0.5 text-mut-2 transition-colors hover:text-risk"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Options + action */}
        {files.length > 0 && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="label">Output format</span>
                <div className="mt-2 space-y-2">
                  {options.map((group) => (
                    <div key={group.label}>
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-mut-2">{group.label}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {group.options.map((o) => {
                          const active = o.value === target;
                          const inert = o.value.startsWith('__');
                          return (
                            <button
                              key={o.value}
                              type="button"
                              title={o.hint}
                              onClick={() => !inert && setTarget(o.value)}
                              className={`rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
                                inert
                                  ? 'cursor-not-allowed border-line/60 text-mut-2/60'
                                  : active
                                    ? 'border-sig/60 bg-sig/12 text-sig'
                                    : 'border-line text-mut hover:border-line-2 hover:text-fg'
                              }`}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </label>

              <div className="space-y-4">
                {activeOption && (
                  <p className="text-[12.5px] leading-relaxed text-mut">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">Engine note </span>
                    {activeOption.hint}
                  </p>
                )}

                {category === 'image' && ['jpg', 'webp', 'avif'].includes(target) && (
                  <label className="block">
                    <span className="label">Quality · {(quality * 100).toFixed(0)}%</span>
                    <input
                      type="range"
                      min={0.3}
                      max={1}
                      step={0.05}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="mt-2 w-full accent-[#2fe08a]"
                    />
                  </label>
                )}

                {category === 'image' && (
                  <label className="block">
                    <span className="label">Max width · {maxWidth > 0 ? `${maxWidth}px` : 'original'}</span>
                    <input
                      type="number"
                      min={0}
                      step={64}
                      value={maxWidth}
                      onChange={(e) => setMaxWidth(Math.max(0, Number(e.target.value)))}
                      placeholder="0 = keep original"
                      className="mt-2 w-full rounded-md border border-line bg-ink px-3 py-2 font-mono text-[12px] text-fg placeholder:text-mut-2 focus:border-sig/50 focus:outline-none"
                    />
                  </label>
                )}

                {category === 'media' && target === 'gif' && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="label">Frame rate</span>
                      <select
                        value={gifFps}
                        onChange={(e) => setGifFps(Number(e.target.value))}
                        className="mt-2 w-full rounded-md border border-line bg-ink px-3 py-2 font-mono text-[12px] text-fg focus:border-sig/50 focus:outline-none"
                      >
                        {[6, 8, 10, 12, 15, 20].map((f) => (
                          <option key={f} value={f}>
                            {f} fps
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="label">Width</span>
                      <select
                        value={gifWidth}
                        onChange={(e) => setGifWidth(Number(e.target.value))}
                        className="mt-2 w-full rounded-md border border-line bg-ink px-3 py-2 font-mono text-[12px] text-fg focus:border-sig/50 focus:outline-none"
                      >
                        {[240, 320, 480, 640].map((w) => (
                          <option key={w} value={w}>
                            {w}px
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 lg:items-end">
              <button
                type="button"
                onClick={convert}
                disabled={!canConvert}
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-sig px-7 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-ink transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-line disabled:text-mut-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" strokeWidth={2.6} />}
                {busy ? 'Converting locally' : 'Convert locally'}
              </button>
              {activeOption?.note && (
                <p className="max-w-xs text-right text-[11.5px] leading-relaxed text-warn/90">{activeOption.note}</p>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        <AnimatePresence>
          {busy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 overflow-hidden"
            >
              <div className="rounded-xl border border-sig/25 bg-sig/[0.04] p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-sig">{progress.label}</span>
                  <span className="font-mono text-[11px] text-mut">{progress.pct}%</span>
                </div>
                <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-line">
                  <motion.div className="h-full bg-sig" animate={{ width: `${progress.pct}%` }} transition={{ ease: 'easeOut', duration: 0.25 }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {outcomes.length > 0 && !busy && (
          <div ref={resultsRef} className="mt-6 rounded-xl border border-line bg-ink-2/60">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sig" strokeWidth={2.2} />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg">
                  {allOutputs.length} file{allOutputs.length === 1 ? '' : 's'} produced locally
                </span>
                {totalIn > 0 && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mut-2">
                    · {formatBytes(totalIn)} → {formatBytes(totalOut)}
                  </span>
                )}
              </div>
              {allOutputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => saveAll(allOutputs)}
                  className="inline-flex items-center gap-2 rounded-lg border border-sig/40 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-sig transition-colors hover:bg-sig/10"
                >
                  <Download className="h-3 w-3" /> Download all
                </button>
              )}
            </div>

            <ul className="divide-y divide-line/70">
              {outcomes.flatMap((o) =>
                o.outputs.map((f) => (
                  <li key={`${o.id}-${f.name}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fg">{f.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mut-2">
                        {formatBytes(f.blob.size)} · from {o.sourceName}
                      </p>
                      {f.note && <p className="mt-1 text-[12px] leading-relaxed text-mut">{f.note}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => saveBlob(f.blob, f.name)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mut transition-colors hover:border-sig/50 hover:text-sig"
                    >
                      <Download className="h-3 w-3" /> Save
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
