export default function ChatMessage({ role, content }) {
  const isAssistant = role === 'assistant';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isAssistant ? 'flex-start' : 'flex-end',
      marginBottom: '0.75rem',
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '0.6rem 0.9rem',
        borderRadius: isAssistant ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
        background: isAssistant ? '#f0f4f0' : '#1a5632',
        color: isAssistant ? '#1a1a1a' : 'white',
        fontSize: '0.95rem',
        lineHeight: '1.5',
      }}>
        {isAssistant && (
          <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.2rem', fontWeight: 600 }}>
            AI Assistant
          </div>
        )}
        {content}
      </div>
    </div>
  );
}
