const STATUS_STYLES = {
  new:        { bg: '#eff6ff', color: '#1d4ed8', label: 'New' },
  in_progress:{ bg: '#fefce8', color: '#a16207', label: 'In Progress' },
  submitted:  { bg: '#eef2ff', color: '#4338ca', label: 'Submitted' },
  in_review:  { bg: '#fff7ed', color: '#c2410c', label: 'In Review' },
  follow_up:  { bg: '#fdf2f8', color: '#be185d', label: 'Follow Up' },
  referred:   { bg: '#ecfdf5', color: '#059669', label: 'Referred' },
  closed:     { bg: '#f8fafc', color: '#64748b', label: 'Closed' },
};

const URGENCY_STYLES = {
  low:    { bg: '#f8fafc', color: '#64748b', label: 'Low' },
  medium: { bg: '#fff7ed', color: '#c2410c', label: 'Medium' },
  high:   { bg: '#fef2f2', color: '#dc2626', label: 'High' },
};

const badgeBase = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.2rem 0.55rem',
  borderRadius: 'var(--radius-full)',
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.new;
  return (
    <span style={{ ...badgeBase, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export function UrgencyBadge({ level, crisisFlag }) {
  const s = URGENCY_STYLES[level] || URGENCY_STYLES.low;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <span style={{ ...badgeBase, background: s.bg, color: s.color }}>
        {level === 'high' && (
          <span style={{ marginRight: '0.25rem', fontSize: '0.6rem' }}>&#9679;</span>
        )}
        {s.label}
      </span>
      {crisisFlag && (
        <span style={{
          ...badgeBase,
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
          <span style={{ marginRight: '0.2rem', fontSize: '0.55rem' }}>&#9679;</span>
          CRISIS
        </span>
      )}
    </span>
  );
}

export const STATUSES = ['new', 'submitted', 'in_review', 'follow_up', 'referred', 'closed'];

export { default as SeverityBadge } from './SeverityPill.jsx';
