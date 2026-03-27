import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusBadge, UrgencyBadge, STATUSES } from '../components/StatusBadge.jsx';
import ChatMessage from '../components/ChatMessage.jsx';

export default function IntakeDetail() {
  const { id } = useParams();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Staff action state
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
    return <div className="page"><div className="card" style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Loading...</div></div>;
  }

  if (error || !intake) {
    return (
      <div className="page">
        <Link to="/dashboard" style={{ color: '#1a5632', fontSize: '0.9rem' }}>&larr; Back to Dashboard</Link>
        <div className="card" style={{ marginTop: '0.75rem', textAlign: 'center', color: '#dc2626', padding: '2rem' }}>
          {error || 'Intake not found'}
        </div>
      </div>
    );
  }

  const createdDate = new Date(intake.createdAt).toLocaleString();
  const updatedDate = new Date(intake.updatedAt).toLocaleString();

  return (
    <div className="page" style={{ maxWidth: '900px' }}>
      <Link to="/dashboard" style={{ color: '#1a5632', fontSize: '0.9rem', textDecoration: 'none' }}>
        &larr; Back to Dashboard
      </Link>

      {/* ── Header ── */}
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>
              {intake.clientName || '(unnamed client)'}
            </h1>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status={intake.status} />
              <UrgencyBadge level={intake.urgencyFlag} crisisFlag={intake.crisisFlag} />
              {intake.needCategory && (
                <span style={{ fontSize: '0.8rem', color: '#666', background: '#f3f4f6', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                  {intake.needCategory}
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888', textAlign: 'right' }}>
            <div>Created: {createdDate}</div>
            <div>Updated: {updatedDate}</div>
          </div>
        </div>

        {/* Crisis banner */}
        {intake.crisisFlag && (
          <div style={{
            marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: '#fef2f2',
            border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b',
          }}>
            <strong>Crisis indicators detected.</strong> This intake may involve immediate safety concerns. Please prioritize review.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>

        {/* ── AI Summary ── */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <h2 style={{ ...sectionTitle, marginBottom: 0 }}>AI Summary</h2>
            {!intake.summary && (
              <button
                onClick={fetchIntake}
                style={{ fontSize: '0.78rem', color: '#1a5632', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Refresh
              </button>
            )}
          </div>
          {intake.summary ? (
            <p style={{ color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{intake.summary}</p>
          ) : (
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              Summary is still being generated. Click refresh or check back shortly.
            </p>
          )}
          <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#aaa' }}>
            This summary was generated by AI and should be verified against the transcript.
          </p>
        </section>

        {/* ── Structured Answers ── */}
        <section className="card">
          <h2 style={sectionTitle}>Intake Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem' }}>
            <Field label="Client Name" value={intake.clientName} />
            <Field label="Preferred Contact" value={intake.contactPreference} />
            <Field label="Area of Need" value={intake.needCategory} />
            <Field label="Urgency Level" value={intake.urgencyFlag ? intake.urgencyFlag.charAt(0).toUpperCase() + intake.urgencyFlag.slice(1) : ''} />
            {intake.structuredAnswers?.situationSummary && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Situation (client's words)" value={intake.structuredAnswers.situationSummary} />
              </div>
            )}
          </div>
        </section>

        {/* ── Transcript ── */}
        <section className="card">
          <h2 style={sectionTitle}>Conversation Transcript</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0.5rem 0' }}>
            {intake.transcript && intake.transcript.length > 0 ? (
              intake.transcript.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))
            ) : (
              <p style={{ color: '#999', fontStyle: 'italic' }}>No transcript available.</p>
            )}
          </div>
        </section>

        {/* ── Staff Actions ── */}
        <section className="card" style={{ background: '#fafafa' }}>
          <h2 style={sectionTitle}>Staff Actions</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div>
              <label style={fieldLabel}>Update Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ display: 'block', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '0.45rem 1.25rem', borderRadius: '6px', border: 'none',
                background: '#1a5632', color: 'white', fontWeight: 600, fontSize: '0.9rem',
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saveMsg && (
              <span style={{ fontSize: '0.85rem', color: saveMsg.startsWith('Error') ? '#dc2626' : '#16a34a', fontWeight: 500 }}>
                {saveMsg}
              </span>
            )}
          </div>

          <div>
            <label style={fieldLabel}>Staff Notes</label>
            <textarea
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              placeholder="Add case notes, follow-up actions, referral details..."
              rows={4}
              style={{
                width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px',
                border: '1px solid #d1d5db', fontSize: '0.9rem', resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ fontSize: '0.95rem', color: value ? '#1a1a1a' : '#999' }}>
        {value || '(not provided)'}
      </div>
    </div>
  );
}

const sectionTitle = { fontSize: '1rem', fontWeight: 600, marginBottom: '0.6rem', color: '#374151' };
const fieldLabel = { fontSize: '0.75rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.15rem' };
