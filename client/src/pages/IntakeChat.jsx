import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage.jsx';

const STEP_LABELS = [
  'Welcome',
  'Your Name',
  'Contact',
  'Area of Need',
  'Urgency',
  'Your Situation',
  'Review',
  'Complete',
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
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Refocus input after each assistant reply
  useEffect(() => {
    if (started && !isComplete && !loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, started, isComplete]);

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
    } catch {
      setError('Could not connect to the server. Make sure the backend and Ollama are running.');
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
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const res = await fetch(`/api/intakes/${id}`);
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
          return;
        }
      } catch { /* keep polling */ }
    }
    setSummary('Summary is still being generated. A case manager will be able to view it on the dashboard.');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleNewIntake() {
    setIntakeId(null);
    setMessages([]);
    setInput('');
    setLoading(false);
    setIsComplete(false);
    setStepIndex(0);
    setSummary('');
    setError('');
    setStarted(false);
  }

  // ── Pre-start screen ──
  if (!started) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Community Intake Assistant</h1>
          <p style={{ color: '#555', maxWidth: '480px', margin: '0 auto 0.75rem', lineHeight: 1.6 }}>
            This is an <strong>AI-powered</strong> intake assistant. It will ask a few short questions
            to understand your needs. <strong>A human case manager will review your information</strong> and follow up with you.
          </p>
          <p style={{ color: '#888', fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
            This assistant does not make decisions about eligibility.
            It only collects information so a real person can help you.
          </p>

          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
            padding: '0.75rem 1rem', maxWidth: '420px', margin: '0 auto 1.5rem',
            fontSize: '0.84rem', color: '#991b1b', lineHeight: 1.5,
          }}>
            <strong>If you are in immediate danger, call 911.</strong><br />
            Suicide &amp; Crisis Lifeline: <strong>988</strong> | Crisis Text Line: Text <strong>HOME</strong> to <strong>741741</strong>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            style={{
              padding: '0.7rem 2.5rem', borderRadius: '8px', border: 'none',
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
  const progressPct = isComplete ? 100 : ((stepIndex + 1) / STEP_LABELS.length) * 100;

  return (
    <div className="page" style={{ maxWidth: '700px' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#999', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 500 }}>{STEP_LABELS[Math.min(stepIndex, STEP_LABELS.length - 1)]}</span>
          <span>{Math.min(stepIndex + 1, STEP_LABELS.length)} / {STEP_LABELS.length}</span>
        </div>
        <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
          <div style={{
            background: isComplete ? '#22c55e' : '#1a5632',
            height: '100%',
            width: `${progressPct}%`,
            transition: 'width 0.4s ease',
            borderRadius: '4px',
          }} />
        </div>
      </div>

      {/* Chat container */}
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '65vh' }}>
        {/* AI disclosure bar */}
        <div style={{
          padding: '0.45rem 0.9rem', background: '#f0f9f4', borderBottom: '1px solid #e5e7eb',
          fontSize: '0.76rem', color: '#555',
        }}>
          You are speaking with an <strong>AI assistant</strong>. A human case manager will review your intake.
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.5rem' }}>
              <span style={{ color: '#1a5632', fontSize: '0.85rem' }}>
                <span className="typing-dots">...</span>
              </span>
              <span style={{ color: '#999', fontSize: '0.82rem' }}>Assistant is thinking</span>
            </div>
          )}
        </div>

        {/* Input or completion state */}
        {!isComplete ? (
          <div style={{
            display: 'flex', gap: '0.5rem', padding: '0.65rem 0.75rem',
            borderTop: '1px solid #e5e7eb', background: '#fafafa',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              disabled={loading}
              autoFocus
              style={{
                flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px',
                border: '1px solid #d1d5db', fontSize: '0.95rem', outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none',
                background: '#1a5632', color: 'white', fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </div>
        ) : (
          <div style={{ padding: '1rem', borderTop: '1px solid #d1fae5', background: '#f0fdf4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <span style={{ color: '#16a34a', fontSize: '1.1rem' }}>&#10003;</span>
              <span style={{ fontSize: '0.95rem', color: '#15803d', fontWeight: 600 }}>
                Intake submitted for case manager review
              </span>
            </div>
            {summary ? (
              <div style={{ fontSize: '0.85rem', color: '#444', background: 'white', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.3rem' }}>
                  Summary generated for staff
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{summary}</p>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="typing-dots">...</span> Generating summary for case manager
              </div>
            )}
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleNewIntake}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db',
                  background: 'white', color: '#374151', fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Start New Intake
              </button>
              <Link
                to="/dashboard"
                style={{
                  padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db',
                  background: 'white', color: '#1a5632', fontSize: '0.85rem', textDecoration: 'none',
                }}
              >
                View Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: '#dc2626', marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>}

      {/* Emergency footer */}
      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#aaa', textAlign: 'center' }}>
        If you are in immediate danger, call <strong>911</strong>. Suicide &amp; Crisis Lifeline: <strong>988</strong>
      </div>
    </div>
  );
}
