import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Section } from './Section';

const QUESTIONS = [
  {
    q: 'How do I know my file is not being uploaded?',
    a: 'Two ways. First, the architecture: the app is a static bundle with no backend endpoint to receive a file — there is no upload URL in the codebase. Second, the runtime: the converter wraps fetch and XMLHttpRequest and prints every request it observes. Run a conversion and watch the ledger stay empty.',
  },
  {
    q: 'What happens to very large files?',
    a: 'Everything is processed in tab memory, which browsers cap between roughly 1.5 GB and 4 GB. FileMorph warns you past category-specific thresholds and refuses inputs it cannot hold safely, rather than crashing the tab halfway through.',
  },
  {
    q: 'Why can I extract a RAR but not create one?',
    a: 'RAR is proprietary and closed-source. Decoding requires a WASM build of libarchive under cross-origin isolation, which this static build does not ship. Instead of quietly uploading RAR files to a third-party service, FileMorph marks them as input-only.',
  },
  {
    q: 'Does it really work without internet?',
    a: 'Yes. The app is an installable PWA with a service worker that caches the shell. After the first visit the engines are already on your device, so conversions continue with the network disabled or in airplane mode.',
  },
  {
    q: 'Is anything stored between visits?',
    a: 'No. Blobs live in a JavaScript array for the length of the session and are released when you clear the buffer or close the tab. There is no database, no IndexedDB record and no cookie written by this app.',
  },
  {
    q: 'Why is video limited compared to image conversion?',
    a: 'Full video transcoding needs FFmpeg.wasm — a multi-megabyte runtime that also requires cross-origin isolation headers most static hosts do not send by default. Rather than ship a broken half-integration, FileMorph offers frame capture and GIF animation, which are genuinely local.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section
      id="faq"
      eyebrow="Straight answers"
      title={<>Questions worth&nbsp;asking.</>}
      lead="Privacy claims deserve specifics. Here is what the app does, and where the boundaries are."
    >
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {QUESTIONS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="bg-panel">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-panel-2"
                aria-expanded={isOpen}
              >
                <span className="font-display text-[15px] font-medium tracking-tight text-fg">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-mut-2 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sig' : ''}`}
                  strokeWidth={2}
                />
              </button>
              <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 pr-12 text-[13.5px] leading-relaxed text-mut">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
