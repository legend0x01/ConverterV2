import { useEffect, useRef, useState } from 'react';
import { clock, getLog, subscribeLog } from '../lib/log';

const COLORS: Record<string, string> = {
  engine: 'text-sig',
  file: 'text-cyan',
  net: 'text-warn',
  system: 'text-mut',
};

export default function SessionLog({ max = 9 }: { max?: number }) {
  const [, force] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => subscribeLog(() => force((n) => n + 1)), []);

  const entries = getLog();
  const visible = entries.slice(-max);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <div className="flex min-h-[210px] flex-col">
      <div ref={boxRef} className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visible.length === 0 && (
          <p className="font-mono text-[11px] leading-relaxed text-mut-2">
            <span className="text-mut-2">$</span> awaiting input — drop a file to begin
          </p>
        )}
        {visible.map((e) => (
          <p key={e.id} className="flex gap-2.5 font-mono text-[11px] leading-relaxed">
            <span className="shrink-0 text-mut-2">{clock(e.at)}</span>
            <span className={`shrink-0 uppercase ${COLORS[e.channel] ?? 'text-mut'}`}>{e.channel}</span>
            <span className="min-w-0 flex-1 break-words text-mut">{e.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
