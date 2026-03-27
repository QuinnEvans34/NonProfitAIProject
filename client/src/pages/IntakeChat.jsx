import { useState, useEffect, useRef } from 'react';
import ChatMessage from '../components/ChatMessage.jsx';

const STEP_LABELS = [
  'Welcome',
  'Your Name',
  'Contact Preference',
  'Area of Need',
  'Urgency',
  'Your Situation',
  'Confirm',
  'Submitted',
];

export default function IntakeChat() {
  const [intakeId, setIntakeId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/intakes/start', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start intake');
      const data = await res.json();
      setIntakeId(data.id);
      setMessages([{ role: 'assistant', content: data.message }]);
      setStepIndex(data.stepIndex + 1);
      setStarted(true);
    } catch (err) {
      setError('Could not connect to the server. Please make sure the backend and Ollama are running.');
    }
    setLoading(false);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || isComplete) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/intakes/${intakeId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Request failed');
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      setStepIndex(data.stepIndex);

      if (data.isComplete) {
        setIsComplete(true);
        // Poll for summary (generated async on the backend)
        pollForSummary(intakeId);
      }
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'I\'m sorry, something went wrong. Please try sending your message again.',
      }]);
    }
    setLoading(false);
  }

  async function pollForSummary(id) {
    // Summary is generated async — check a few times
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/intakes/${id}`);
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
          return;
        }
      } catch { /* keep polling */ }
    }
    setSummary('Summary is still being generated. A case manager will be able to view it shortly.');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Pre-start screen ──
  if (!started) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <h1 style={{ marginBottom: '0.75rem' }}>Community Intake Assistant</h1>
          <p style={{ color: '#666', maxWidth: '500px', margin: '0 auto 0.5rem' }}>
            This is an <strong>AI-powered</strong> intake assistant. It will ask you a few questions
            to understand your needs. <strong>A human case manager will review your information</strong> and follow up.
          </p>
          <p style={{ color: '#888', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            This assistant cannot make decisions about your eligibility for any program.
            It only collects information to help a real person help you.
          </p>

          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px',
            padding: '0.75rem', maxWidth: '500px', margin: '0 auto 1.5rem',
            fontSize: '0.85rem', color: '#991b1b',
          }}>
            <strong>If you are in immediate danger, call 911.</strong><br />
            National Suicide Prevention Lifeline: <strong>988</strong><br />
            Crisis Text Line: Text <strong>HOME</strong> to <strong>741741</strong>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            style={{
              padding: '0.7rem 2rem', borderRadius: '6px', border: 'none',
              background: '#1a5632', color: 'white', fontSize: '1rem',
              cursor: loading ? 'wait' : 'pointer', fontWeight: 600,
            }}
          >
            {loading ? 'Connecting...' : 'Begin Intake'}
          </button>
          {error && <p style={{ color: '#dc2626', marginTop: '0.75rem', fontSize: '0.9rem' }}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── Active intake screen ──
  return (
    <div className="page" style={{ maxWidth: '700px' }}>
      {/* Progress indicator */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>
          <span>{STEP_LABELS[stepIndex] || ''}</span>
          <span>Step {Math.min(stepIndex + 1, STEP_LABELS.length)} of {STEP_LABELS.length}</span>
        </div>
        <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{
            background: isComplete ? '#22c55e' : '#1a5632',
            height: '100%',
            width: `${((stepIndex + 1) / STEP_LABELS.length) * 100}%`,
            transition: 'width 0.3s ease',
            borderRadius: '4px',
          }} />
        </div>
      </div>

      {/* Chat area */}
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '65vh' }}>
        {/* AI disclosure bar */}
        <div style={{
          padding: '0.5rem 0.9rem', background: '#f0f9f4', borderBottom: '1px solid #e5e7eb',
          fontSize: '0.78rem', color: '#666',
        }}>
          You are speaking with an <strong>AI assistant</strong>. A human case manager will review your intake.
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div style={{ color: '#999', fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}>
              Assistant is typing...
            </div>
          )}
        </div>

        {/* Input area */}
        {!isComplete ? (
          <div style={{
            display: 'flex', gap: '0.5rem', padding: '0.75rem',
            borderTop: '1px solid #e5e7eb', background: '#fafafa',
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              disabled={loading}
              autoFocus
              style={{
                flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px',
                border: '1px solid #d1d5db', fontSize: '0.95rem',
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none',
                background: '#1a5632', color: 'white', fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', opacity: loading || !input.trim() ? 0.6 : 1,
              }}
            >
              Send
            </button>
          </div>
        ) : (
          <div style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb', background: '#f0f9f4' }}>
            <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 600, marginBottom: '0.5rem' }}>
              Intake submitted for review
            </div>
            {summary ? (
              <div style={{ fontSize: '0.85rem', color: '#444' }}>
                <strong>Summary for staff:</strong>
                <p style={{ margin: '0.3rem 0 0', whiteSpace: 'pre-wrap' }}>{summary}</p>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#888' }}>
                Generating summary for case manager...
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p style={{ color: '#dc2626', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>}

      {/* Emergency footer */}
      <div style={{
        marginTop: '0.75rem', fontSize: '0.78rem', color: '#888', textAlign: 'center',
      }}>
        If you are in immediate danger, call <strong>911</strong>. Suicide &amp; Crisis Lifeline: <strong>988</strong>
      </div>
    </div>
  );
}
