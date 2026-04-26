import ScoreRing from './ScoreRing.jsx';
import {
  SEVERITY_BAND_BASE,
  RISK_FLAG_BONUS_PER_FLAG,
  RISK_FLAG_BONUS_MAX,
  URGENCY_WINDOW_BONUS,
  SECONDARY_CATEGORY_BONUS_PER,
  SECONDARY_CATEGORY_BONUS_MAX,
  RUBRIC_VERSION,
} from '../lib/help-score-rubric.js';

const RISK_FLAG_KEYS = [
  'self_harm',
  'domestic_abuse',
  'child_safety',
  'eviction_imminent',
  'food_insecurity',
  'medical_emergency',
  'substance_abuse',
  'isolation',
];

function countRiskFlags(riskFlags) {
  if (!riskFlags) return 0;
  return RISK_FLAG_KEYS.reduce(
    (n, key) => (riskFlags[key] === true ? n + 1 : n),
    0,
  );
}

function buildBreakdown(analysis) {
  const level = analysis?.severity?.level ?? 'low';
  const window = analysis?.urgency_window ?? 'this_month';
  const riskCount = countRiskFlags(analysis?.risk_flags);
  const secondaries = analysis?.classification?.secondary_categories ?? [];

  return [
    {
      label: `Severity band (${level})`,
      value: SEVERITY_BAND_BASE[level] ?? 0,
    },
    {
      label: `Risk flags (${riskCount} active)`,
      value: Math.min(riskCount * RISK_FLAG_BONUS_PER_FLAG, RISK_FLAG_BONUS_MAX),
    },
    {
      label: `Urgency window (${window})`,
      value: URGENCY_WINDOW_BONUS[window] ?? 0,
    },
    {
      label: `Secondary categories (${secondaries.length})`,
      value: Math.min(
        secondaries.length * SECONDARY_CATEGORY_BONUS_PER,
        SECONDARY_CATEGORY_BONUS_MAX,
      ),
    },
  ];
}

export default function HelpScore({ analysis, score = 0, variant = 'card' }) {
  const severity = analysis?.severity?.level ?? 'low';

  if (variant === 'inline') {
    return <ScoreRing score={score} size={40} severity={severity} />;
  }

  const rows = buildBreakdown(analysis);

  return (
    <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'flex-start' }}>
      <ScoreRing score={score} size={56} severity={severity} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {rows.map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                gap: 'var(--space-3)',
              }}
            >
              <span>{row.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-primary)' }}>
                {row.value}
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--color-border-light)',
              paddingTop: 'var(--space-2)',
              marginTop: 'var(--space-1)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            <span>Total</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{score}</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 'var(--space-3)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          Rubric v{RUBRIC_VERSION} · Reproducible from analyzer output
        </div>
      </div>
    </div>
  );
}
