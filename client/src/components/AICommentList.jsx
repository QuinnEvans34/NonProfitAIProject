import { Info, AlertTriangle, Lightbulb, HelpCircle, Check, X } from '../lib/icons.js';

const TYPE_ORDER = ['context', 'flag', 'suggestion', 'clarification'];

const TYPE_META = {
  context:       { label: 'CONTEXT',       Icon: Info },
  flag:          { label: 'FLAG',          Icon: AlertTriangle },
  suggestion:    { label: 'SUGGESTION',    Icon: Lightbulb },
  clarification: { label: 'CLARIFICATION', Icon: HelpCircle },
};

export default function AICommentList({ comments = [], onRate }) {
  if (!comments.length) return null;

  const indexed = comments.map((c, idx) => ({ ...c, _idx: idx }));
  const groups = TYPE_ORDER
    .map((type) => ({ type, items: indexed.filter((c) => c.type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {groups.map(({ type, items }) => {
        const { label, Icon } = TYPE_META[type];
        return (
          <div key={type}>
            <div className="section-heading" style={{ marginBottom: 'var(--space-2)' }}>
              {label}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {items.map((c) => (
                <li
                  key={c._idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <Icon
                    size={14}
                    aria-hidden
                    style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-text-tertiary)' }}
                  />
                  <span style={{ flex: 1 }}>{c.text ?? c.content ?? ''}</span>
                  {onRate && (
                    <span style={{ display: 'inline-flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                      <button
                        type="button"
                        aria-label="Helpful"
                        onClick={() => onRate(c._idx, true)}
                        style={ratingBtnStyle}
                      >
                        <Check size={12} aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Not helpful"
                        onClick={() => onRate(c._idx, false)}
                        style={ratingBtnStyle}
                      >
                        <X size={12} aria-hidden />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const ratingBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-tertiary)',
  cursor: 'pointer',
};
