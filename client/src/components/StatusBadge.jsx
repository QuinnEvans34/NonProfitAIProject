const STATUS_STYLES = {
  new:        { bg: '#dbeafe', color: '#1e40af', label: 'New' },
  in_progress:{ bg: '#fef9c3', color: '#854d0e', label: 'In Progress' },
  submitted:  { bg: '#e0e7ff', color: '#3730a3', label: 'Submitted' },
  in_review:  { bg: '#fef3c7', color: '#92400e', label: 'In Review' },
  follow_up:  { bg: '#fce7f3', color: '#9d174d', label: 'Follow Up' },
  referred:   { bg: '#d1fae5', color: '#065f46', label: 'Referred' },
  closed:     { bg: '#f3f4f6', color: '#6b7280', label: 'Closed' },
};

const URGENCY_STYLES = {
  low:    { bg: '#f3f4f6', color: '#6b7280', label: 'Low' },
  medium: { bg: '#fef3c7', color: '#92400e', label: 'Medium' },
  high:   { bg: '#fee2e2', color: '#991b1b', label: 'High' },
};

const badgeBase = {
  display: 'inline-block',
  padding: '0.15rem 0.55rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.01em',
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
        {s.label}
      </span>
      {crisisFlag && (
        <span style={{ ...badgeBase, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
          CRISIS
        </span>
      )}
    </span>
  );
}

export const STATUSES = ['new', 'submitted', 'in_review', 'follow_up', 'referred', 'closed'];
