import { useRef } from 'react';

/**
 * 1-5 Likert pip selector with keyboard navigation.
 *
 * @param {object} props
 * @param {number|null} props.value - selected value (1..5) or null
 * @param {(n: number) => void} [props.onChange] - selection handler (omit when readOnly)
 * @param {string} props.lowLabel - text anchor for value 1
 * @param {string} props.highLabel - text anchor for value 5
 * @param {string} props.questionId - stable id for ARIA + DOM ids
 * @param {string} props.questionText - aria-label of the radiogroup
 * @param {boolean} [props.readOnly] - render as a non-interactive snapshot
 * @param {boolean} [props.disabled] - render interactive but disabled (e.g. after analysis lock)
 */
export default function ScaleSelector({
  value,
  onChange,
  lowLabel,
  highLabel,
  questionId,
  questionText,
  readOnly = false,
  disabled = false,
}) {
  const groupRef = useRef(null);
  const interactive = !readOnly && !disabled;

  function setValue(n) {
    if (!interactive) return;
    onChange?.(n);
  }

  function handleKeyDown(e) {
    if (!interactive) return;
    const current = value || 1;
    let next = null;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, current - 1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, current + 1);
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 5;
    else if (/^[1-5]$/.test(e.key)) next = Number(e.key);

    if (next !== null) {
      e.preventDefault();
      setValue(next);
      const btn = groupRef.current?.querySelector(`[data-pip="${next}"]`);
      btn?.focus();
    }
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={questionText}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 280 }}>
        {/* Hairline scale bar behind pips */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            top: '50%',
            height: 1,
            background: 'var(--color-border-light)',
            transform: 'translateY(-50%)',
            zIndex: 0,
          }}
        />
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          const isFocusable = interactive && (selected || (value == null && n === 1));
          const Tag = readOnly ? 'span' : 'button';
          return (
            <Tag
              key={n}
              type={readOnly ? undefined : 'button'}
              role="radio"
              aria-checked={selected}
              aria-label={`${n} of 5`}
              data-pip={n}
              id={`${questionId}_pip_${n}`}
              tabIndex={readOnly ? -1 : isFocusable ? 0 : -1}
              disabled={!interactive && !readOnly ? true : undefined}
              onClick={interactive ? () => setValue(n) : undefined}
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${selected ? 'var(--color-brand)' : 'var(--color-border-medium)'}`,
                background: selected ? 'var(--color-brand)' : 'var(--color-surface)',
                color: selected ? '#fff' : 'var(--color-text-tertiary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: interactive ? 'pointer' : 'default',
                transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                fontFamily: 'inherit',
                opacity: disabled && !readOnly ? 0.55 : 1,
              }}
            >
              {n}
            </Tag>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          maxWidth: 280,
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-tertiary)',
          lineHeight: 1.4,
        }}
      >
        <span style={{ maxWidth: '45%' }}>{lowLabel}</span>
        <span style={{ maxWidth: '45%', textAlign: 'right' }}>{highLabel}</span>
      </div>
    </div>
  );
}
