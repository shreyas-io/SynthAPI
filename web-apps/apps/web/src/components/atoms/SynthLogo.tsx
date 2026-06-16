type SynthLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

function SynthLogoMark({ size }: { size: number }) {
  return (
    <svg
      className="synth-logo-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="SynthAPI logo mark"
    >
      <defs>
        <filter id="synth-logo-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x="5"
        y="5"
        width="54"
        height="54"
        rx="12"
        className="synth-logo-surface"
      />
      <g className="synth-logo-frame" filter="url(#synth-logo-glow)">
        <path d="M22 8 32 3 42 8" />
        <path d="M22 56 32 61 42 56" />
        <path d="M8 22 3 32 8 42" />
        <path d="M56 22 61 32 56 42" />
        <path d="M14 14h8" />
        <path d="M14 14v8" />
        <path d="M50 14h-8" />
        <path d="M50 14v8" />
        <path d="M14 50h8" />
        <path d="M14 50v-8" />
        <path d="M50 50h-8" />
        <path d="M50 50v-8" />
        <path d="M24 18 32 12 40 18" />
        <path d="M24 46 32 52 40 46" />
        <path d="M18 24 12 32 18 40" />
        <path d="M46 24 52 32 46 40" />
      </g>
    </svg>
  );
}

export function SynthLogo({
  size = 28,
  showWordmark = true,
  className = "",
}: SynthLogoProps) {
  return (
    <span className={`synth-logo ${className}`.trim()}>
      <SynthLogoMark size={size} />
      {showWordmark && <span className="synth-logo-wordmark">SynthAPI</span>}
    </span>
  );
}
