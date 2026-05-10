type SunsetLogoProps = {
  className?: string;
  gradientId?: string;
};

export function SunsetLogo({
  className,
  gradientId = "sunsetLogoGrad",
}: SunsetLogoProps) {
  return (
    <svg viewBox="0 0 200 130" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>

      <path
        d="M 30 110 A 70 70 0 0 1 170 110"
        stroke={`url(#${gradientId})`}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 50 110 A 50 50 0 0 1 150 110"
        stroke={`url(#${gradientId})`}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
        opacity={0.85}
      />
      <path
        d="M 70 110 A 30 30 0 0 1 130 110"
        stroke={`url(#${gradientId})`}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />

      <path
        d="M 100 78
           C 95 70, 82 70, 82 80
           C 82 90, 100 102, 100 102
           C 100 102, 118 90, 118 80
           C 118 70, 105 70, 100 78 Z"
        fill={`url(#${gradientId})`}
      />

      <line
        x1={15}
        y1={115}
        x2={185}
        y2={115}
        stroke="#c4b5fd"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
