const STROKE_BY_SIZE = { 28: 4, 40: 5, 56: 6 };
const FONT_BY_SIZE = { 28: 10, 40: 13, 56: 18 };

function fillVar(severity) {
  const key = severity === 'medium' ? 'med' : severity;
  return `var(--score-fill-${key})`;
}

export default function ScoreRing({ score = 0, size = 56, severity = 'low' }) {
  const stroke = STROKE_BY_SIZE[size] ?? 5;
  const fontSize = FONT_BY_SIZE[size] ?? 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);

  return (
    <svg
      role="img"
      aria-label={`Help score ${clamped} of 100`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        className="score-ring-track"
        cx={cx}
        cy={cy}
        r={r}
        strokeWidth={stroke}
      />
      <circle
        className="score-ring-fill"
        cx={cx}
        cy={cy}
        r={r}
        strokeWidth={stroke}
        stroke={fillVar(severity)}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={700}
        fill="var(--color-text-primary)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {clamped}
      </text>
    </svg>
  );
}
