import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage.jsx';

const STEP_LABELS = [
  'Welcome',
  'Your Name',
  'Contact Info',
  'Area of Need',
  'Urgency',
  'Situation',
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

  // ── Landing / Pre-start ──
  if (!started) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - var(--nav-height))',
        padding: '2rem 1.5rem',
        background: 'var(--color-bg)',
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border-light)',
          boxShadow: 'var(--shadow-lg)',
          padding: '3rem 2.5rem 2.5rem',
          textAlign: 'center',
        }}>
          {/* Brand mark */}
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 800,
          }}>
            CI
          </div>

          <h1 style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '0.6rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            Community Intake
          </h1>

          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-md)',
            lineHeight: 1.7,
            marginBottom: '0.4rem',
          }}>
            An AI assistant will ask a few short questions to understand your needs. A <strong>human case manager</strong> will review your information and follow up.
          </p>

          <p style={{
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--text-sm)',
            marginBottom: '2rem',
          }}>
            This assistant does not make eligibility decisions.
          </p>

          <button
            onClick={handleStart}
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '0.7rem 2.25rem',
              fontSize: 'var(--text-md)',
              borderRadius: 'var(--radius-md)',
              cursor: loading ? 'wait' : 'pointer',
              width: '100%',
              maxWidth: '280px',
            }}
          >
            {loading ? 'Connecting...' : 'Begin Intake'}
          </button>

          {error && (
            <p style={{ color: '#dc2626', marginTop: '0.85rem', fontSize: 'var(--text-sm)' }}>{error}</p>
          )}

          {/* Emergency — muted aside, not alarm-style */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--color-border-light)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
            lineHeight: 1.7,
          }}>
            <span style={{ color: 'var(--color-crisis-text)', fontWeight: 600 }}>If you are in immediate danger, call 911.</span>
            <br />
            Suicide &amp; Crisis Lifeline: <strong style={{ color: 'var(--color-text-secondary)' }}>988</strong>
            {' '}&middot;{' '}
            Crisis Text Line: Text <strong style={{ color: 'var(--color-text-secondary)' }}>HOME</strong> to <strong style={{ color: 'var(--color-text-secondary)' }}>741741</strong>
          </div>
        </div>
      </div>
    );
  }

  // ── Active intake workspace ──
  return (
    <div style={{ height: `calc(100vh - var(--nav-height))`, overflow: 'hidden' }}>
      <div className="layout-split" style={{
        height: '100%',
        margin: 0,
        borderRadius: 0,
        border: 'none',
        boxShadow: 'none',
      }}>
        {/* ── Left Rail ── */}
        <aside className="sidebar-panel">
          {/* Session heading */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.35rem',
            }}>
              Intake Session
            </div>
            <div style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}>
              {isComplete ? 'Completed' : `Step ${Math.min(stepIndex + 1, STEP_LABELS.length)} of ${STEP_LABELS.length}`}
            </div>
          </div>

          {/* Stepper */}
          <div className="stepper" style={{ marginBottom: '1.5rem' }}>
            {STEP_LABELS.map((label, i) => {
              let state = 'pending';
              if (isComplete || i < stepIndex) state = 'completed';
              else if (i === stepIndex) state = 'active';

              return (
                <div key={label} className={`stepper-item ${state}`}>
                  <span className="stepper-dot" />
                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          {/* AI Disclosure */}
          <div style={{
            padding: '0.85rem 0.9rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-light)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '0.75rem',
          }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.4rem',
            }}>
              About this session
            </div>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: 0,
            }}>
              You are speaking with an AI assistant. A human case manager will review everything shared here.
            </p>
          </div>

          {/* Completion block */}
          {isComplete && (
            <div style={{
              padding: '0.85rem 0.9rem',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '0.75rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginBottom: '0.5rem',
                color: 'var(--color-success)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
              }}>
                <span>&#10003;</span> Intake submitted
              </div>

              {summary ? (
                <div style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                }}>
                  <div style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '0.3rem',
                  }}>
                    Summary for staff
                  </div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{summary}</p>
                </div>
              ) : (
                <div style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}>
                  <span className="typing-dots">...</span> Generating summary
                </div>
              )}

              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button onClick={handleNewIntake} className="btn-secondary" style={{ width: '100%' }}>
                  Start New Intake
                </button>
                <Link
                  to="/dashboard"
                  className="btn-secondary"
                  style={{ textDecoration: 'none', textAlign: 'center', width: '100%' }}
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Emergency — footer of rail */}
          <div style={{
            marginTop: 'auto',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--color-border-light)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
            lineHeight: 1.7,
          }}>
            <span style={{ color: 'var(--color-crisis-text)', fontWeight: 600 }}>Emergency:</span> Call <strong>911</strong>
            <br />
            Crisis: <strong>988</strong> &middot; Text <strong>HOME</strong> to <strong>741741</strong>
          </div>
        </aside>

        {/* ── Chat Panel ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--color-surface)',
        }}>
          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem 2rem',
            }}
          >
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}
            {loading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0',
              }}>
                <span style={{ color: 'var(--color-brand)' }}>
                  <span className="typing-dots">...</span>
                </span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  Thinking
                </span>
              </div>
            )}

            {/* Empty state anchor */}
            {messages.length === 0 && !loading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
              }}>
                Starting conversation...
              </div>
            )}
          </div>

          {/* Composer */}
          {!isComplete ? (
            <div className="composer">
              <div className="composer-inner">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your response..."
                  disabled={loading}
                  autoFocus
                  className="composer-input"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="composer-send"
                >
                  Send
                </button>
              </div>
              {error && (
                <p style={{
                  color: '#dc2626',
                  marginTop: '0.5rem',
                  fontSize: 'var(--text-xs)',
                  textAlign: 'center',
                }}>
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div style={{
              padding: '0.85rem 1.5rem',
              borderTop: '1px solid var(--color-success-border)',
              background: 'var(--color-success-bg)',
              textAlign: 'center',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-success)',
              fontWeight: 500,
            }}>
              Intake complete — see sidebar for summary and next steps
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
