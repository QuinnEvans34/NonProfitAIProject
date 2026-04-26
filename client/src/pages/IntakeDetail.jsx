import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusBadge, STATUSES } from '../components/StatusBadge.jsx';
import ChatMessage from '../components/ChatMessage.jsx';
import HelpScore from '../components/HelpScore.jsx';
import SeverityPill from '../components/SeverityPill.jsx';
import AICommentList from '../components/AICommentList.jsx';
import EmptyState from '../components/EmptyState.jsx';
import {
  RefreshCw,
  ClipboardList,
  Check,
  Minus,
  Sparkles,
  PROGRAM_ICONS,
} from '../lib/icons.js';
import { api } from '../lib/api.js';

const RISK_FLAG_KEYS = [
  'self_harm',
  'domestic_abuse',
  'child_safety',
  'eviction_imminent',
  'food_insecurity',
  'medical_emergency',
  'substance_abuse',
  'isolation',
];

const RISK_FLAG_LABELS = {
  self_harm: 'Self-harm',
  domestic_abuse: 'Domestic abuse',
  child_safety: 'Child safety',
  eviction_imminent: 'Eviction imminent',
  food_insecurity: 'Food insecurity',
  medical_emergency: 'Medical emergency',
  substance_abuse: 'Substance abuse',
  isolation: 'Isolation',
};

export default function IntakeDetail() {
  const { id } = useParams();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Staff Actions (existing)
  const [newStatus, setNewStatus] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Re-run analysis
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState('');

  // Copy questions toast
  const [copiedQuestions, setCopiedQuestions] = useState(false);

  // Severity override
  const [overrideDraft, setOverrideDraft] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideMsg, setOverrideMsg] = useState('');

  useEffect(() => {
    fetchIntake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchIntake() {
    setLoading(true);
    try {
      const data = await api.getIntake(id);
      hydrateFromIntake(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function hydrateFromIntake(data) {
    setIntake(data);
    setNewStatus(data.status);
    setStaffNotes(data.staffNotes || '');
    setOverrideDraft(data.severityOverride || '');
    setOverrideReason(data.severityOverrideReason || '');
    setError('');
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await api.patchIntake(id, { status: newStatus, staffNotes });
      hydrateFromIntake(updated);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg('Error: ' + err.message);
    }
    setSaving(false);
  }

  async function handleReanalyze() {
    setReanalyzing(true);
    setReanalyzeError('');
    try {
      const updated = await api.reanalyzeIntake(id);
      hydrateFromIntake(updated);
    } catch (err) {
      setReanalyzeError(err.message);
    }
    setReanalyzing(false);
  }

  async function handleRateComment(idx, helpful) {
    try {
      await api.rateComment(id, idx, helpful);
    } catch (err) {
      // Optimistic — log silently; UI state is owned by AICommentList buttons
      console.error('rateComment failed:', err);
    }
  }

  async function handleCopyQuestions() {
    const questions = intake?.analysis?.follow_up_questions || [];
    if (!questions.length) return;
    try {
      await navigator.clipboard.writeText(questions.join('\n'));
      setCopiedQuestions(true);
      setTimeout(() => setCopiedQuestions(false), 1500);
    } catch (err) {
      console.error('clipboard write failed:', err);
    }
  }

  async function handleSaveOverride() {
    setOverrideSaving(true);
    setOverrideMsg('');
    try {
      const updated = await api.patchIntake(id, {
        severityOverride: overrideDraft || null,
        severityOverrideReason: overrideDraft ? overrideReason : '',
      });
      hydrateFromIntake(updated);
      setOverrideMsg('Saved');
      setTimeout(() => setOverrideMsg(''), 2000);
    } catch (err) {
      setOverrideMsg('Error: ' + err.message);
    }
    setOverrideSaving(false);
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
        <div className="card" style={{ marginTop: '0.5rem', textAlign: 'center', color: 'var(--color-sev-high-text)', padding: '2.5rem' }}>
          {error || 'Intake not found'}
        </div>
      </div>
    );
  }

  const analysis = intake.analysis;
  const isLegacy = !analysis;
  const aiSeverity = analysis?.severity?.level || null;
  const effectiveSeverity =
    intake.severityOverride ||
    aiSeverity ||
    (intake.crisisFlag ? 'crisis' : 'low');
  const primaryCategory = analysis?.classification?.primary_category || intake.needCategory || '';

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
        gap: 'var(--space-4)',
        marginTop: '0.5rem',
        marginBottom: 'var(--space-4)',
      }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h1 style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: 'var(--space-2)',
          }}>
            {intake.clientName || '(unnamed client)'}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <SeverityPill level={effectiveSeverity} />
            <StatusBadge status={intake.status} />
            {primaryCategory && (
              <span className="pill">{primaryCategory}</span>
            )}
            {intake.severityOverride && (
              <span className="pill" style={{ fontWeight: 600 }}>Override</span>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 'var(--space-2)',
        }}>
          <HelpScore variant="inline" score={intake.helpScore ?? 0} analysis={analysis} />
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textAlign: 'right', lineHeight: 1.7 }}>
            Created {createdDate}<br />
            Updated {updatedDate}
          </div>
        </div>
      </div>

      {/* Crisis banner */}
      {intake.crisisFlag && (
        <div style={{
          marginBottom: 'var(--space-4)',
          padding: '0.65rem 1rem',
          background: 'var(--color-crisis-bg)',
          border: '1px solid var(--color-crisis-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-crisis-text)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          <span style={{ fontSize: '0.7rem' }}>&#9679;</span>
          <span><strong>Crisis indicators detected.</strong> This intake may involve immediate safety concerns.</span>
        </div>
      )}

      <div className="layout-detail">
        {/* ── Main Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* AI Summary */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', gap: 'var(--space-2)' }}>
              <h2 style={sectionTitle}>AI Summary</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {reanalyzing && (
                  <span className="typing-dots" style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>···</span>
                )}
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="btn-secondary"
                  style={{
                    fontSize: 'var(--text-xs)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    cursor: reanalyzing ? 'wait' : 'pointer',
                    opacity: reanalyzing ? 0.6 : 1,
                  }}
                >
                  <RefreshCw size={12} aria-hidden />
                  {reanalyzing ? 'Re-running...' : 'Re-run analysis'}
                </button>
              </div>
            </div>

            {isLegacy && (
              <div style={{
                marginBottom: 'var(--space-3)',
                padding: '0.6rem 0.8rem',
                background: 'var(--color-sev-medium-bg)',
                border: '1px solid var(--color-sev-medium-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-sev-medium-text)',
              }}>
                <strong>Analysis pending</strong> — this intake was completed before the analyzer rolled out. Click <em>Re-run analysis</em>.
              </div>
            )}

            {!isLegacy && (
              <p style={{
                color: 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.75,
                fontSize: 'var(--text-md)',
                margin: 0,
              }}>
                {analysis.summary?.staff_facing || '(no summary)'}
              </p>
            )}

            {reanalyzeError && (
              <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-sev-high-text)' }}>
                Error: {reanalyzeError}
              </p>
            )}

            <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              AI-generated. Verify against the transcript below.
            </p>
          </section>

          {/* Help Score breakdown */}
          {!isLegacy && (
            <section className="card">
              <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-3)' }}>Help Score</h2>
              <HelpScore variant="card" score={intake.helpScore ?? 0} analysis={analysis} />
            </section>
          )}

          {/* Recommended Programs */}
          {!isLegacy && (
            <section className="card">
              <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-3)' }}>Recommended Programs</h2>
              {analysis.recommended_programs && analysis.recommended_programs.length > 0 ? (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', margin: 0, padding: 0 }}>
                  {analysis.recommended_programs.map((p, i) => {
                    const Icon = PROGRAM_ICONS[primaryCategory] || Sparkles;
                    return (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <Icon size={16} aria-hidden style={{ flexShrink: 0, marginTop: 3, color: 'var(--color-brand)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                            {p.reason}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No specific programs to recommend yet"
                  body="See follow-up questions below for what to ask first."
                />
              )}
            </section>
          )}

          {/* AI Comments */}
          {!isLegacy && analysis.ai_comments && analysis.ai_comments.length > 0 && (
            <section className="card">
              <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-3)' }}>AI Comments</h2>
              <AICommentList comments={analysis.ai_comments} onRate={handleRateComment} />
            </section>
          )}

          {/* Follow-up Questions */}
          {!isLegacy && analysis.follow_up_questions && analysis.follow_up_questions.length > 0 && (
            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h2 style={sectionTitle}>Follow-up Questions</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {copiedQuestions && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 500 }}>
                      Copied
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Copy questions"
                    onClick={handleCopyQuestions}
                    style={iconBtnStyle}
                  >
                    <ClipboardList size={14} aria-hidden />
                  </button>
                </div>
              </div>
              <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {analysis.follow_up_questions.map((q, i) => (
                  <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', lineHeight: 1.65 }}>
                    {q}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Client's Own Words */}
          <ClientWordsCard intake={intake} />

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Case Info */}
          <section style={sideCardStyle}>
            <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-3)' }}>Case Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Field label="Client Name" value={intake.clientName} />
              <Field label="Preferred Contact" value={intake.contactPreference} />
              <Field label="Area of Need" value={intake.needCategory} />
              <Field label="Urgency" value={intake.urgencyFlag ? intake.urgencyFlag.charAt(0).toUpperCase() + intake.urgencyFlag.slice(1) : ''} />
              <Field label="Crisis" value={intake.crisisFlag ? 'Yes — flagged' : 'No'} />
            </div>
          </section>

          {/* Severity Override */}
          {!isLegacy && (
            <section style={sideCardStyle}>
              <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-3)' }}>Severity Override</h2>
              <div style={fieldLabel}>AI assigned</div>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <SeverityPill level={aiSeverity || 'low'} />
              </div>

              <label style={fieldLabel}>Override</label>
              <select
                value={overrideDraft}
                onChange={(e) => setOverrideDraft(e.target.value)}
                style={selectStyle}
              >
                <option value="">Use AI's call</option>
                <option value="crisis">Crisis</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {overrideDraft && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <label style={fieldLabel}>Reason (required)</label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Why are you overriding the AI's severity call?"
                    rows={3}
                    style={{
                      ...textareaStyle,
                      borderColor: overrideReason.trim() ? 'var(--color-border-light)' : 'var(--color-sev-high-border)',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button
                  onClick={handleSaveOverride}
                  disabled={overrideSaving || (!!overrideDraft && !overrideReason.trim())}
                  className="btn-primary"
                  style={{
                    fontSize: 'var(--text-sm)',
                    opacity: overrideSaving || (!!overrideDraft && !overrideReason.trim()) ? 0.55 : 1,
                    cursor: overrideSaving ? 'wait' : 'pointer',
                  }}
                >
                  {overrideSaving ? 'Saving...' : 'Save override'}
                </button>
                {overrideMsg && (
                  <span style={{
                    fontSize: 'var(--text-sm)',
                    color: overrideMsg.startsWith('Error') ? 'var(--color-sev-high-text)' : 'var(--color-success)',
                    fontWeight: 500,
                  }}>
                    {overrideMsg}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Risk Flags */}
          {!isLegacy && analysis.risk_flags && (
            <section style={sideCardStyle}>
              <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-3)' }}>Risk Flags</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-2)',
              }}>
                {RISK_FLAG_KEYS.map((key) => {
                  const active = analysis.risk_flags[key] === true;
                  const Icon = active ? Check : Minus;
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        padding: '0.3rem 0.5rem',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid',
                        borderColor: active
                          ? `var(--color-sev-${effectiveSeverity}-border)`
                          : 'var(--color-border-light)',
                        background: active
                          ? `var(--color-sev-${effectiveSeverity}-bg)`
                          : 'transparent',
                        color: active
                          ? `var(--color-sev-${effectiveSeverity}-text)`
                          : 'var(--color-text-muted)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <Icon size={12} aria-hidden style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {RISK_FLAG_LABELS[key]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tags & Keywords */}
          {!isLegacy && (
            <section style={sideCardStyle}>
              <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-3)' }}>Tags & Keywords</h2>

              <div className="section-heading">Tags</div>
              {analysis.classification?.tags?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
                  {analysis.classification.tags.map((t) => (
                    <span key={t} className="pill">{t}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
                  (none)
                </div>
              )}

              <div className="section-heading">Keywords</div>
              {analysis.keywords_extracted?.length ? (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
                  {analysis.keywords_extracted.map((k) => `"${k}"`).join(', ')}
                </div>
              ) : (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>(none)</div>
              )}
            </section>
          )}

          {/* Staff Actions */}
          <section style={sideCardStyle}>
            <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-3)' }}>Staff Actions</h2>

            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={fieldLabel}>Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={selectStyle}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={fieldLabel}>Notes</label>
              <textarea
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Case notes, follow-up actions, referrals..."
                rows={5}
                style={textareaStyle}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
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
                  color: saveMsg.startsWith('Error') ? 'var(--color-sev-high-text)' : 'var(--color-success)',
                  fontWeight: 500,
                }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </section>

          {/* Analysis Meta */}
          {!isLegacy && analysis.model_meta && (
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              padding: '0 0.25rem',
            }}>
              {analysis.model_meta.model} · {analysis.model_meta.provider} · {(analysis.model_meta.ms / 1000).toFixed(1)}s · schema {analysis.model_meta.schema_version}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientWordsCard({ intake }) {
  const qaPairs = intake.qaPairs || [];
  const fallback = intake.structuredAnswers?.situationSummary;

  if (!qaPairs.length && !fallback) return null;

  return (
    <section className="card">
      <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-3)' }}>Client's Own Words</h2>

      {qaPairs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {qaPairs.map((pair, i) => (
            <div key={i}>
              <div style={fieldLabel}>{pair.question}</div>
              <div style={{
                fontSize: 'var(--text-md)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
              }}>
                {pair.answer || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>(no answer)</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
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
            {fallback}
          </p>
        </div>
      )}
    </section>
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

const sectionTitle = {
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  letterSpacing: '-0.005em',
  margin: 0,
};

const fieldLabel = {
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.2rem',
  display: 'block',
};

const sideCardStyle = {
  background: 'var(--color-surface-raised)',
  borderRadius: 'var(--radius-md)',
  padding: '1.25rem',
  border: '1px solid var(--color-border-light)',
};

const selectStyle = {
  display: 'block',
  width: '100%',
  padding: '0.45rem 0.6rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border-light)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface)',
  fontFamily: 'inherit',
};

const textareaStyle = {
  width: '100%',
  padding: '0.55rem 0.7rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border-light)',
  fontSize: 'var(--text-sm)',
  resize: 'vertical',
  fontFamily: 'inherit',
  color: 'var(--color-text-primary)',
  lineHeight: 1.65,
};

const iconBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-tertiary)',
  cursor: 'pointer',
};
