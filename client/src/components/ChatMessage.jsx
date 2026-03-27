export default function ChatMessage({ role, content }) {
  const isAssistant = role === 'assistant';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isAssistant ? 'flex-start' : 'flex-end',
      marginBottom: '0.65rem',
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '0.55rem 0.85rem',
        borderRadius: isAssistant ? '12px 12px 12px 3px' : '12px 12px 3px 12px',
        background: isAssistant ? '#f0f4f0' : '#1a5632',
        color: isAssistant ? '#1a1a1a' : 'white',
        fontSize: '0.93rem',
        lineHeight: '1.55',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {isAssistant && (
          <div style={{ fontSize: '0.68rem', color: '#999', marginBottom: '0.15rem', fontWeight: 600, letterSpacing: '0.02em' }}>
            AI ASSISTANT
          </div>
        )}
        {content}
      </div>
    </div>
  );
}
