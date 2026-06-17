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
      viewBox="0 0 40 40"
      role="img"
      aria-label="SynthAPI logo mark"
    >
      <path
        className="synth-logo-bracket"
        d="M16 10H11.5C9.6 10 8 11.6 8 13.5V26.5C8 28.4 9.6 30 11.5 30H16"
      />
      <path
        className="synth-logo-bracket"
        d="M24 10H28.5C30.4 10 32 11.6 32 13.5V26.5C32 28.4 30.4 30 28.5 30H24"
      />
      <path
        className="synth-logo-signal-shadow"
        d="M14.5 20.8H17.8L19.2 17.2L21.2 23L23 19H25.5"
      />
      <path
        className="synth-logo-signal"
        d="M14.5 20H17.8L19.2 16.4L21.2 22.2L23 18.2H25.5"
      />
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
      {showWordmark && (
        <>
          <span className="synth-logo-wordmark">SynthAPI</span>
          <span className="synth-logo-alpha">Alpha</span>
        </>
      )}
    </span>
  );
}
