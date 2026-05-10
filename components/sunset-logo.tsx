export function SunsetLogo({
  className = "h-9 w-auto",
  gradientId = "sunsetGrad",
}: {
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 60"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path
        d="M10 45 Q60 -5 110 45"
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 45 Q60 5 100 45"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M30 45 Q60 15 90 45"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <line
        x1="5"
        y1="50"
        x2="115"
        y2="50"
        stroke="#c4b5fd"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
