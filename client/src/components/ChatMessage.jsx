export default function ChatMessage({ role, content }) {
  const isAssistant = role === 'assistant';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isAssistant ? 'flex-start' : 'flex-end',
      marginBottom: '0.85rem',
    }}>
      <div style={{
        maxWidth: '70%',
        padding: '0.7rem 1rem',
        borderRadius: isAssistant
          ? '2px var(--radius-lg) var(--radius-lg) var(--radius-lg)'
          : 'var(--radius-lg) 2px var(--radius-lg) var(--radius-lg)',
        background: isAssistant ? 'var(--color-surface-raised)' : 'var(--color-brand)',
        color: isAssistant ? 'var(--color-text-primary)' : 'white',
        fontSize: 'var(--text-md)',
        lineHeight: '1.65',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: isAssistant ? '1px solid var(--color-border-light)' : 'none',
      }}>
        {content}
      </div>
    </div>
  );
}
