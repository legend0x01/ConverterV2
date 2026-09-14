export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#0e1316" stroke="rgba(255,255,255,.14)" />
      <g fill="none" stroke="#2fe08a" strokeWidth="5" strokeLinecap="round">
        <path d="M17.5 27.5a15.5 15.5 0 0 1 26.4-5.4" />
        <path d="M46.5 36.5a15.5 15.5 0 0 1-26.4 5.4" />
      </g>
      <g fill="#2fe08a">
        <path d="M48.4 31.6 45.6 21.4 36.8 25.9z" />
        <path d="M15.6 32.4 18.4 42.6 27.2 38.1z" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="font-mono text-[15px] font-semibold tracking-[0.22em] text-fg">
      FILE<span className="text-sig">MORPH</span>
    </span>
  );
}
