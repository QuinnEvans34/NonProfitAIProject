import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage.jsx';
import ScaleSelector from '../components/ScaleSelector.jsx';
import { MessageSquare, X } from '../lib/icons.js';
import { SCREENING_SECTIONS } from '../lib/screening-questions.js';
import { countAnswered, computeSectionAverages } from '../lib/screening-stats.js';
import { api } from '../lib/api.js';

const EMPTY_SCREENING = { mental_health: {}, physical_health: {}, quality_of_life: {} };
const EMPTY_COMMENTS = { mental_health: '', physical_health: '', quality_of_life: '', general: '' };
const EMPTY_CONTACT = {
  firstName: '', lastName: '', phone: '', email: '',
  address: '', city: '', zip: '',
};

const SCREENING_SUBSTEPS = ['Mental health', 'Physical health', 'Quality of life', 'General'];

const MAIN_STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'contact', label: 'Contact info' },
  { id: 'screening', label: 'Health questionnaire' },
  { id: 'review', label: 'Review & submit' },
];

export default function IntakeChat() {
  // ── Main flow state ──
  const [mainStep, setMainStep] = useState(0);
  const [intakeId, setIntakeId] = useState(null);
  const [error, setError] = useState('');

  // Contact form
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [contactError, setContactError] = useState('');
  const [contactSaving, setContactSaving] = useState(false);

  // Screening
  const [screening, setScreening] = useState(EMPTY_SCREENING);
  const [screeningStep, setScreeningStep] = useState(0);
  const [screeningComments, setScreeningComments] = useState(EMPTY_COMMENTS);
  const [screeningError, setScreeningError] = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [summary, setSummary] = useState('');

  // Chat (side helper)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatComplete, setChatComplete] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const latestScreeningRef = useRef(EMPTY_SCREENING);
  const latestCommentsRef = useRef(EMPTY_COMMENTS);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, chatLoading]);

  useEffect(() => {
    if (chatStarted && !chatComplete && !chatLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatLoading, chatStarted, chatComplete]);

  // ── Welcome → Contact ──
  async function handleBeginIntake() {
    setError('');
    try {
      const res = await fetch('/api/intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to create intake');
      const data = await res.json();
      setIntakeId(data.id);
      setMainStep(1);
    } catch {
      setError("Couldn't connect to the server. Please try again.");
    }
  }

  // ── Contact → Screening ──
  async function handleSaveContact() {
    const trimmed = Object.fromEntries(
      Object.entries(contact).map(([k, v]) => [k, (v || '').trim()])
    );
    setContactError('');
    setContactSaving(true);
    try {
      const fullName = [trimmed.firstName, trimmed.lastName].filter(Boolean).join(' ');
      const preference = trimmed.phone
        ? `phone: ${trimmed.phone}`
        : `email: ${trimmed.email}`;
      await api.patchIntake(intakeId, {
        clientName: fullName,
        contactPreference: preference,
        structuredAnswers: { ...trimmed },
      });
      setMainStep(2);
    } catch {
      setContactError("Couldn't save your information. Please try again.");
    }
    setContactSaving(false);
  }

  // ── Screening autosave ──
  function scheduleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!intakeId) return;
      try {
        await api.saveScreening(intakeId, latestScreeningRef.current, latestCommentsRef.current);
        setScreeningError('');
      } catch (err) {
        console.error('saveScreening failed:', err);
        setScreeningError("Couldn't save — retrying on next change.");
      }
    }, 400);
  }

  function handleAnswerChange(sectionId, questionId, value) {
    setScreening((prev) => {
      const next = { ...prev, [sectionId]: { ...prev[sectionId], [questionId]: value } };
      latestScreeningRef.current = next;
      return next;
    });
    scheduleSave();
  }

  function handleCommentChange(key, text) {
    setScreeningComments((prev) => {
      const next = { ...prev, [key]: text };
      latestCommentsRef.current = next;
      return next;
    });
    scheduleSave();
  }

  // Sub-step navigation on the screening step
  function handleScreeningBack() {
    if (screeningStep === 0) {
      setMainStep(1);
    } else {
      setScreeningStep((s) => s - 1);
    }
  }

  function handleScreeningNext() {
    if (screeningStep < SCREENING_SUBSTEPS.length - 1) {
      setScreeningStep((s) => s + 1);
    } else {
      setMainStep(3);
    }
  }

  // ── Submit ──
  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      try {
        await api.saveScreening(intakeId, screening, screeningComments);
      } catch { /* okay */ }
      await api.patchIntake(intakeId, {
        currentStep: 'complete',
        status: 'submitted',
      });
      api.reanalyzeIntake(intakeId).catch((err) =>
        console.error('reanalyze failed:', err)
      );
      setSubmitted(true);
      pollForSummary(intakeId);
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    }
    setSubmitting(false);
  }

  async function pollForSummary(id) {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const data = await api.getIntake(id);
        if (data?.summary) {
          setSummary(data.summary);
          return;
        }
      } catch { /* keep polling */ }
    }
  }

  function handleNewIntake() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setMainStep(0);
    setIntakeId(null);
    setContact(EMPTY_CONTACT);
    setContactError('');
    setScreening(EMPTY_SCREENING);
    setScreeningStep(0);
    setScreeningComments(EMPTY_COMMENTS);
    setScreeningError('');
    latestScreeningRef.current = EMPTY_SCREENING;
    latestCommentsRef.current = EMPTY_COMMENTS;
    setSubmitting(false);
    setSubmitted(false);
    setSummary('');
    setError('');
    setChatOpen(false);
    setChatStarted(false);
    setChatId(null);
    setMessages([]);
    setInput('');
    setChatLoading(false);
    setChatComplete(false);
    setChatUnread(false);
  }

  // ── Chat helper (independent AI conversation) ──
  async function handleStartChat() {
    setChatLoading(true);
    try {
      const res = await fetch('/api/intakes/start', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start chat');
      const data = await res.json();
      setChatId(data.id);
      setMessages([{ role: 'assistant', content: data.message }]);
      setChatStarted(true);
    } catch {
      setMessages([{
        role: 'assistant',
        content: 'Sorry, the assistant is unavailable right now.',
      }]);
    }
    setChatLoading(false);
  }

  async function handleSendChat() {
    const text = input.trim();
    if (!text || chatLoading || chatComplete || !chatId) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/intakes/${chatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      setChatUnread((prev) => prev || !chatOpen);
      if (data.isComplete) setChatComplete(true);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "Sorry, something went wrong. Please try again.",
      }]);
    }
    setChatLoading(false);
  }

  function handleChatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  }

  function openChat() {
    setChatOpen(true);
    setChatUnread(false);
    if (!chatStarted && !chatLoading) {
      handleStartChat();
    }
  }

  // ── Derived ──
  const screeningCounts = countAnswered(screening);
  const screeningLocked = submitted;
  const currentSection = screeningStep < 3 ? SCREENING_SECTIONS[screeningStep] : null;

  // ── Render ──
  return (
    <div className="intake-page">
      <div
        className="layout-split"
        style={{ margin: 0, borderRadius: 0, border: 'none', boxShadow: 'none' }}
      >
        {/* ── Left Rail ── */}
        <aside className="sidebar-panel">
          <div className="sidebar-desktop-only" style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem',
            }}>
              Intake Session
            </div>
            <div style={{
              fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}>
              {submitted ? 'Submitted' : `Step ${mainStep + 1} of ${MAIN_STEPS.length}`}
            </div>
          </div>

          <div className="stepper" style={{ marginBottom: '1.5rem' }}>
            {MAIN_STEPS.map((step, i) => {
              let state = 'pending';
              if (submitted || i < mainStep) state = 'completed';
              else if (i === mainStep) state = 'active';
              return (
                <div key={step.id} className={`stepper-item ${state}`}>
                  <span className="stepper-dot" />
                  <span className="stepper-label">{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className="sidebar-desktop-only" style={{
            padding: '0.85rem 0.9rem', background: 'var(--color-surface)',
            border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-sm)',
            marginBottom: '0.75rem',
          }}>
            <div style={{
              fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem',
            }}>
              About this intake
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Your answers go to a human case manager who will follow up directly. There's no cost to you.
            </p>
          </div>

          {mainStep >= 2 && (
            <div className="sidebar-desktop-only" style={{
              padding: '0.85rem 0.9rem', background: 'var(--color-surface)',
              border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-sm)',
              marginBottom: '0.75rem',
            }}>
              <div style={{
                fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.45rem',
              }}>
                Screening
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                {screeningCounts.total} of {screeningCounts.totalPossible} answered
              </div>
              <div className="screening-progress-bar" aria-hidden>
                <div
                  className="screening-progress-fill"
                  style={{ width: `${(screeningCounts.total / screeningCounts.totalPossible) * 100}%` }}
                />
              </div>
            </div>
          )}
        </aside>

        {/* ── Right Panel ── */}
        <div style={{
          overflowY: 'auto', background: 'var(--color-surface)',
          padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column',
        }}>
          {submitted ? (
            <SubmittedView clientName={contact.firstName} summary={summary} />
          ) : mainStep === 0 ? (
            <WelcomeStep onBegin={handleBeginIntake} error={error} />
          ) : mainStep === 1 ? (
            <ContactStep
              contact={contact}
              setContact={setContact}
              serverError={contactError}
              saving={contactSaving}
              onBack={() => setMainStep(0)}
              onNext={handleSaveContact}
            />
          ) : mainStep === 2 ? (
            <ScreeningStep
              screening={screening}
              screeningStep={screeningStep}
              setScreeningStep={setScreeningStep}
              screeningComments={screeningComments}
              screeningError={screeningError}
              currentSection={currentSection}
              screeningLocked={screeningLocked}
              counts={screeningCounts}
              onAnswerChange={handleAnswerChange}
              onCommentChange={handleCommentChange}
              onBack={handleScreeningBack}
              onNext={handleScreeningNext}
            />
          ) : (
            <ReviewStep
              contact={contact}
              screening={screening}
              screeningComments={screeningComments}
              submitting={submitting}
              error={error}
              onBack={() => setMainStep(2)}
              onEditContact={() => setMainStep(1)}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>

      <footer className="intake-footer">
        <span style={{ color: 'var(--color-crisis-text)', fontWeight: 600 }}>Emergency:</span> Call <strong>911</strong>
        &ensp;&middot;&ensp;
        Crisis Lifeline: <strong>988</strong>
        &ensp;&middot;&ensp;
        Crisis Text: Text <strong>HOME</strong> to <strong>741741</strong>
      </footer>

      {/* ── Floating chat popover (bottom-LEFT to avoid Next button) ── */}
      {chatOpen && (
        <div className="chat-popover" role="dialog" aria-label="Help assistant chat">
          <div className="chat-popover-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={15} aria-hidden style={{ color: 'var(--color-brand)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Help assistant
              </span>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0' }}>
                <span style={{ color: 'var(--color-brand)' }}>
                  <span className="typing-dots">...</span>
                </span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  Thinking
                </span>
              </div>
            )}
            {messages.length === 0 && !chatLoading && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
              }}>
                Starting conversation…
              </div>
            )}
          </div>

          {!chatComplete ? (
            <div className="composer" style={{ borderTop: '1px solid var(--color-border-light)', background: 'var(--color-surface)' }}>
              <div className="composer-inner">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask a question…"
                  disabled={chatLoading || !chatStarted}
                  className="composer-input"
                />
                <button
                  onClick={handleSendChat}
                  disabled={chatLoading || !input.trim() || !chatStarted}
                  className="composer-send"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '0.75rem 1.25rem', borderTop: '1px solid var(--color-success-border)',
              background: 'var(--color-success-bg)', textAlign: 'center', fontSize: 'var(--text-sm)',
              color: 'var(--color-success)', fontWeight: 500,
            }}>
              Chat complete
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={chatOpen ? () => setChatOpen(false) : openChat}
        aria-label={chatOpen ? 'Close chat' : 'Open help chat'}
        aria-expanded={chatOpen}
      >
        {chatUnread && !chatOpen && <span className="chat-fab-badge" aria-label="New message" />}
        {chatOpen ? <X size={22} aria-hidden /> : <MessageSquare size={22} aria-hidden />}
      </button>
    </div>
  );
}

// ── Step Components ──

function WelcomeStep({ onBegin, error }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        maxWidth: '560px', width: '100%', textAlign: 'center',
        padding: 'var(--space-8) var(--space-6)',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
          background: 'var(--color-brand)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto var(--space-5)',
          color: 'white', fontSize: '1.2rem', fontWeight: 800,
        }}>
          CI
        </div>
        <h1 style={{
          fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-3)', letterSpacing: '-0.02em', lineHeight: 1.2,
        }}>
          Welcome — we're here to help.
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)', fontSize: 'var(--text-md)',
          lineHeight: 1.7, marginBottom: 'var(--space-3)',
        }}>
          We connect people with food, housing, healthcare, and other community resources. A <strong>human case manager</strong> will read what you share and follow up with you directly.
        </p>
        <p style={{
          color: 'var(--color-text-secondary)', fontSize: 'var(--text-md)',
          lineHeight: 1.7, marginBottom: 'var(--space-3)',
        }}>
          <strong>This service is free.</strong> There's no cost to you, and you don't need insurance or paperwork to get started.
        </p>
        <p style={{
          color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)',
          marginBottom: 'var(--space-6)',
        }}>
          The intake takes about 5 minutes. Are you ready to go?
        </p>
        <button
          onClick={onBegin}
          className="btn-primary"
          style={{
            padding: '0.7rem 2.25rem', fontSize: 'var(--text-md)',
            borderRadius: 'var(--radius-md)', minWidth: '220px',
          }}
        >
          I'm ready — let's begin
        </button>
        {error && (
          <p style={{ color: '#dc2626', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{error}</p>
        )}
      </div>
    </div>
  );
}

function ContactStep({ contact, setContact, serverError, saving, onBack, onNext }) {
  const [fieldErrors, setFieldErrors] = useState({});

  function update(key, value) {
    setContact((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field (and paired fields) as soon as user types
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      if (key === 'phone' || key === 'email') { delete next.phone; delete next.email; }
      if (key === 'city' || key === 'zip') { delete next.city; delete next.zip; }
      return next;
    });
  }

  function handleNext() {
    const t = Object.fromEntries(Object.entries(contact).map(([k, v]) => [k, (v || '').trim()]));
    const errs = {};
    if (!t.firstName) errs.firstName = 'Required';
    if (!t.phone && !t.email) { errs.phone = 'Enter phone or email'; errs.email = 'Enter phone or email'; }
    if (!t.city && !t.zip) { errs.city = 'Enter city or ZIP'; errs.zip = 'Enter city or ZIP'; }
    setFieldErrors(errs);
    if (Object.keys(errs).length === 0) onNext();
  }

  function err(key) { return fieldErrors[key] || null; }

  return (
    <>
      <StepHeader
        title="Contact information"
        subtitle="So a case manager can follow up with you. We use this only to reach you."
      />

      <div style={{
        display: 'grid', gap: 'var(--space-4)', maxWidth: '640px',
        marginBottom: 'var(--space-5)',
      }}>
        <FieldRow>
          <Field label="First name" required error={err('firstName')}>
            <input
              type="text"
              value={contact.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              className={`form-input${err('firstName') ? ' form-input--error' : ''}`}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name">
            <input
              type="text"
              value={contact.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              className="form-input"
              autoComplete="family-name"
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Phone number" error={err('phone')}>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={`form-input${err('phone') ? ' form-input--error' : ''}`}
              autoComplete="tel"
              placeholder="(555) 123-4567"
            />
          </Field>
          <Field label="Email" error={err('email')}>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => update('email', e.target.value)}
              className={`form-input${err('email') ? ' form-input--error' : ''}`}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
        </FieldRow>

        <Field label="Street address (optional)">
          <input
            type="text"
            value={contact.address}
            onChange={(e) => update('address', e.target.value)}
            className="form-input"
            autoComplete="street-address"
          />
        </Field>

        <FieldRow>
          <Field label="City" error={err('city')}>
            <input
              type="text"
              value={contact.city}
              onChange={(e) => update('city', e.target.value)}
              className={`form-input${err('city') ? ' form-input--error' : ''}`}
              autoComplete="address-level2"
            />
          </Field>
          <Field label="ZIP code" error={err('zip')}>
            <input
              type="text"
              value={contact.zip}
              onChange={(e) => update('zip', e.target.value)}
              className={`form-input${err('zip') ? ' form-input--error' : ''}`}
              autoComplete="postal-code"
              inputMode="numeric"
            />
          </Field>
        </FieldRow>
      </div>

      {serverError && (
        <p style={{ color: '#dc2626', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
          {serverError}
        </p>
      )}

      <StepNav onBack={onBack} onNext={handleNext} nextLabel={saving ? 'Saving…' : 'Next →'} nextDisabled={saving} />
    </>
  );
}

function ScreeningStep({
  screening, screeningStep, setScreeningStep, screeningComments, screeningError,
  currentSection, screeningLocked, counts, onAnswerChange, onCommentChange,
  onBack, onNext,
}) {
  return (
    <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <StepHeader
        title="Health questionnaire"
        subtitle="A few short questions about how you're doing. Skip anything you'd rather not answer."
      />

      <div className="tab-strip" role="tablist" aria-label="Screening sections">
        {SCREENING_SUBSTEPS.map((label, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === screeningStep}
            onClick={() => setScreeningStep(i)}
            className={`tab-strip-item${i === screeningStep ? ' active' : ''}`}
          >
            {i < screeningStep ? `✓ ${label}` : label}
          </button>
        ))}
      </div>

      <div className="screening-slide">
        {currentSection ? (
          <>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                {counts.by_section[currentSection.id]} of {currentSection.questions.length} answered
              </div>
            </div>

            {currentSection.questions.map((q) => (
              <div key={q.id} className="screening-question">
                <div className="screening-question-text">{q.text}</div>
                <ScaleSelector
                  value={screening[currentSection.id]?.[q.id] ?? null}
                  onChange={(n) => onAnswerChange(currentSection.id, q.id, n)}
                  lowLabel={q.lowLabel}
                  highLabel={q.highLabel}
                  questionId={q.id}
                  questionText={q.text}
                  disabled={screeningLocked}
                />
              </div>
            ))}

            <div style={{ marginTop: 'var(--space-5)' }}>
              <label style={{
                display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600,
                color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: 'var(--space-2)',
              }}>
                {currentSection.label} comments (optional)
              </label>
              <textarea
                value={screeningComments[currentSection.id]}
                onChange={(e) => onCommentChange(currentSection.id, e.target.value)}
                disabled={screeningLocked}
                placeholder="Any additional context for this section…"
                rows={3}
                className="form-textarea"
              />
            </div>
          </>
        ) : (
          <>
            <p style={{
              fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)',
              lineHeight: 1.6, marginBottom: 'var(--space-4)',
            }}>
              Anything else you'd like your case manager to know.
            </p>
            <textarea
              value={screeningComments.general}
              onChange={(e) => onCommentChange('general', e.target.value)}
              disabled={screeningLocked}
              placeholder="Optional general comments…"
              rows={6}
              className="form-textarea"
            />
          </>
        )}
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        backLabel={screeningStep === 0 ? '← Back' : '← Previous section'}
        nextLabel={screeningStep === SCREENING_SUBSTEPS.length - 1 ? 'Review →' : 'Next section →'}
        center={
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            {screeningStep + 1} of {SCREENING_SUBSTEPS.length}
          </span>
        }
      />

      {screeningError && (
        <p style={{
          marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)',
          color: 'var(--color-sev-high-text)', textAlign: 'center',
        }}>
          {screeningError}
        </p>
      )}
    </div>
  );
}

function ReviewStep({ contact, screening, screeningComments, submitting, error, onBack, onEditContact, onSubmit }) {
  const averages = computeSectionAverages(screening);
  const counts = countAnswered(screening);
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '—';

  return (
    <>
      <StepHeader
        title="Review and submit"
        subtitle="Take a quick look. When you submit, a case manager will start working on a plan to help and contact you shortly."
      />

      <div style={{ display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <ReviewCard title="Contact information" onEdit={onEditContact}>
          <ReviewRow label="Name" value={fullName} />
          <ReviewRow label="Phone" value={contact.phone || '—'} />
          <ReviewRow label="Email" value={contact.email || '—'} />
          <ReviewRow label="Address" value={contact.address || '—'} />
          <ReviewRow
            label="City / ZIP"
            value={[contact.city, contact.zip].filter(Boolean).join(' · ') || '—'}
          />
        </ReviewCard>

        <ReviewCard title="Health questionnaire">
          <ReviewRow
            label="Questions answered"
            value={`${counts.total} of ${counts.totalPossible}`}
          />
          {SCREENING_SECTIONS.map((section) => {
            const avg = averages[section.id];
            return (
              <ReviewRow
                key={section.id}
                label={section.label}
                value={
                  avg == null
                    ? 'Not answered'
                    : `Avg ${avg.toFixed(1)} of 5 · ${counts.by_section[section.id]} / ${section.questions.length} answered`
                }
              />
            );
          })}
          {screeningComments.general?.trim() && (
            <ReviewRow label="General comments" value={screeningComments.general.trim()} multiline />
          )}
        </ReviewCard>
      </div>

      {error && (
        <p style={{ color: '#dc2626', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
          {error}
        </p>
      )}

      <StepNav
        onBack={onBack}
        onNext={onSubmit}
        nextLabel={submitting ? 'Submitting…' : 'Submit intake'}
        nextDisabled={submitting}
        nextPrimary
      />
    </>
  );
}

function SubmittedView({ clientName, summary }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: 'var(--radius-full)',
          background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-5)', color: 'var(--color-success)',
          fontSize: '1.5rem', fontWeight: 800,
        }}>
          ✓
        </div>
        <h1 style={{
          fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-3)', letterSpacing: '-0.02em',
        }}>
          Thank you{clientName ? `, ${clientName}` : ''}.
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)', fontSize: 'var(--text-md)',
          lineHeight: 1.7, marginBottom: 'var(--space-3)',
        }}>
          Your intake has been submitted. A <strong>case manager</strong> will start thinking of a plan to help you and will contact you shortly.
        </p>
        {summary ? (
          <p style={{
            color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)',
            lineHeight: 1.7, marginBottom: 'var(--space-4)',
          }}>
            Your information is saved. You can close this window.
          </p>
        ) : (
          <p style={{
            color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-4)',
          }}>
            <span className="typing-dots">...</span> Generating a summary for the case manager.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Tiny helpers ──

function StepHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <h2 style={{
        fontSize: 'var(--text-xl)', fontWeight: 700,
        color: 'var(--color-text-primary)', letterSpacing: '-0.01em',
        margin: '0 0 var(--space-2)',
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function StepNav({ onBack, onNext, backLabel = '← Back', nextLabel = 'Next →', nextDisabled, nextPrimary, center }) {
  return (
    <div className="screening-nav" style={{ marginTop: 'auto' }}>
      <button
        type="button"
        onClick={onBack}
        className="btn-secondary"
        style={{ visibility: onBack ? 'visible' : 'hidden' }}
      >
        {backLabel}
      </button>
      {center || <span />}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={nextPrimary ? 'btn-primary' : 'btn-secondary'}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1, minWidth: 0 }}>
      <span style={{
        fontSize: 'var(--text-xs)', fontWeight: 600,
        color: error ? '#dc2626' : 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
        {required && <span style={{ color: '#dc2626' }}> *</span>}
        {error && <span style={{ fontWeight: 500, textTransform: 'none', marginLeft: '0.35rem' }}>— {error}</span>}
      </span>
      {children}
    </label>
  );
}

function FieldRow({ children }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
      {children}
    </div>
  );
}

function ReviewCard({ title, onEdit, children }) {
  return (
    <div style={{
      background: 'var(--color-surface-raised)',
      border: '1px solid var(--color-border-light)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4) var(--space-5)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 'var(--space-3)',
      }}>
        <h3 style={{
          fontSize: 'var(--text-md)', fontWeight: 600,
          color: 'var(--color-text-primary)', margin: 0,
        }}>
          {title}
        </h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-xs)', color: 'var(--color-brand)', fontWeight: 600,
              padding: 0,
            }}
          >
            Edit
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        {children}
      </div>
    </div>
  );
}

function ReviewRow({ label, value, multiline }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: multiline ? '1fr' : '160px 1fr',
      gap: 'var(--space-2)',
      fontSize: 'var(--text-sm)',
    }}>
      <span style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
      <span style={{
        color: 'var(--color-text-primary)',
        whiteSpace: multiline ? 'pre-wrap' : 'normal',
      }}>
        {value}
      </span>
    </div>
  );
}
