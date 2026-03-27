import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusBadge, UrgencyBadge, STATUSES } from '../components/StatusBadge.jsx';
import ChatMessage from '../components/ChatMessage.jsx';

export default function IntakeDetail() {
  const { id } = useParams();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newStatus, setNewStatus] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    fetchIntake();
  }, [id]);

  async function fetchIntake() {
    setLoading(true);
    try {
      const res = await fetch(`/api/intakes/${id}`);
      if (!res.ok) throw new Error('Intake not found');
      const data = await res.json();
      setIntake(data);
      setNewStatus(data.status);
      setStaffNotes(data.staffNotes || '');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/intakes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, staffNotes }),
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setIntake(updated);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg('Error: ' + err.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: '700px' }}>
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '3.5rem', fontSize: 'var(--text-sm)' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error || !intake) {
    return (
      <div className="page" style={{ maxWidth: '700px' }}>
        <Link to="/dashboard" style={backLinkStyle}>&larr; Dashboard</Link>
        <div className="card" style={{ marginTop: '0.5rem', textAlign: 'center', color: '#dc2626', padding: '2.5rem' }}>
          {error || 'Intake not found'}
        </div>
      </div>
    );
  }

  const createdDate = new Date(intake.createdAt).toLocaleString();
  const updatedDate = new Date(intake.updatedAt).toLocaleString();

  return (
    <div className="page" style={{ maxWidth: '1100px' }}>
      <Link to="/dashboard" style={backLinkStyle}>&larr; Dashboard</Link>

      {/* Header strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginTop: '0.5rem',
        marginBottom: '0.85rem',
      }}>
        <div>
          <h1 style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: '0.35rem',
          }}>
            {intake.clientName || '(unnamed client)'}
          </h1>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={intake.status} />
            <UrgencyBadge level={intake.urgencyFlag} crisisFlag={intake.crisisFlag} />
            {intake.needCategory && (
              <span style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface-raised)',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border-light)',
              }}>
                {intake.needCategory}
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textAlign: 'right', lineHeight: 1.7 }}>
          Created {createdDate}<br />
          Updated {updatedDate}
        </div>
      </div>

      {/* Crisis banner */}
      {intake.crisisFlag && (
        <div style={{
          marginBottom: '0.85rem',
          padding: '0.65rem 1rem',
          background: 'var(--color-crisis-bg)',
          border: '1px solid var(--color-crisis-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-crisis-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '0.7rem' }}>&#9679;</span>
          <span><strong>Crisis indicators detected.</strong> This intake may involve immediate safety concerns.</span>
        </div>
      )}

      <div className="layout-detail">
        {/* ── Main Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* AI Summary */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <h2 style={sectionTitle}>AI Summary</h2>
              {!intake.summary && (
                <button onClick={fetchIntake} style={linkBtnStyle}>Refresh</button>
              )}
            </div>
            {intake.summary ? (
              <p style={{
                color: 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.75,
                fontSize: 'var(--text-md)',
              }}>
                {intake.summary}
              </p>
            ) : (
              <p style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>
                Summary is still being generated. Click refresh or check back shortly.
              </p>
            )}
            <p style={{ marginTop: '0.65rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              AI-generated summary. Verify against the transcript below.
            </p>
          </section>

          {/* Client's own words */}
          {intake.structuredAnswers?.situationSummary && (
            <section className="card">
              <h2 style={sectionTitle}>Client's Own Words</h2>
              <div style={{
                borderLeft: '3px solid var(--color-brand-light)',
                paddingLeft: '1rem',
                marginLeft: '0.15rem',
              }}>
                <p style={{
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.75,
                  fontSize: 'var(--text-md)',
                  fontStyle: 'italic',
                  margin: 0,
                }}>
                  {intake.structuredAnswers.situationSummary}
                </p>
              </div>
            </section>
          )}

          {/* Transcript */}
          <section className="card">
            <h2 style={{ ...sectionTitle, marginBottom: '0.75rem' }}>Conversation Transcript</h2>
            <div style={{
              maxHeight: '560px',
              overflowY: 'auto',
              paddingRight: '0.25rem',
            }}>
              {intake.transcript && intake.transcript.length > 0 ? (
                intake.transcript.map((msg, i) => (
                  <ChatMessage key={i} role={msg.role} content={msg.content} />
                ))
              ) : (
                <p style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>
                  No transcript available.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ── Side Rail ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Case Info */}
          <section style={{
            background: 'var(--color-surface-raised)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            border: '1px solid var(--color-border-light)',
          }}>
            <h2 style={{ ...sectionTitle, marginBottom: '0.85rem' }}>Case Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <Field label="Client Name" value={intake.clientName} />
              <Field label="Preferred Contact" value={intake.contactPreference} />
              <Field label="Area of Need" value={intake.needCategory} />
              <Field label="Urgency" value={intake.urgencyFlag ? intake.urgencyFlag.charAt(0).toUpperCase() + intake.urgencyFlag.slice(1) : ''} />
              <Field label="Crisis" value={intake.crisisFlag ? 'Yes — flagged' : 'No'} />
            </div>
          </section>

          {/* Staff Actions */}
          <section style={{
            background: 'var(--color-surface-raised)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            border: '1px solid var(--color-border-light)',
          }}>
            <h2 style={{ ...sectionTitle, marginBottom: '0.85rem' }}>Staff Actions</h2>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={fieldLabel}>Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-light)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-surface)',
                  fontFamily: 'inherit',
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={fieldLabel}>Notes</label>
              <textarea
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Case notes, follow-up actions, referrals..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.7rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-light)',
                  fontSize: 'var(--text-sm)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.65,
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                style={{
                  fontSize: 'var(--text-sm)',
                  opacity: saving ? 0.55 : 1,
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saveMsg && (
                <span style={{
                  fontSize: 'var(--text-sm)',
                  color: saveMsg.startsWith('Error') ? '#dc2626' : 'var(--color-success)',
                  fontWeight: 500,
                }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <div style={{
        fontSize: 'var(--text-md)',
        color: value ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        fontWeight: value ? 500 : 400,
      }}>
        {value || '(not provided)'}
      </div>
    </div>
  );
}

const backLinkStyle = {
  color: 'var(--color-text-tertiary)',
  fontSize: 'var(--text-sm)',
  textDecoration: 'none',
  fontWeight: 500,
  display: 'inline-block',
  transition: 'color 0.12s',
};

const linkBtnStyle = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-brand)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
};

const sectionTitle = {
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  letterSpacing: '-0.005em',
};

const fieldLabel = {
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.2rem',
};
