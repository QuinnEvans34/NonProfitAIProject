import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import EmptyState from '../components/EmptyState.jsx';
import SeverityPill from '../components/SeverityPill.jsx';
import {
  Settings,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  Info,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
} from '../lib/icons.js';

const TABS = [
  { id: 'keywords', label: 'Keywords' },
  { id: 'overrides', label: 'Severity overrides' },
  { id: 'comments', label: 'AI comments' },
];

const LEVEL_LABELS = {
  crisis: 'CRISIS',
  high: 'HIGH URGENCY',
  medium: 'MEDIUM URGENCY',
};

const SEVERITY_RANK = { low: 0, medium: 1, high: 2, crisis: 3 };

const TYPE_META = {
  context: { Icon: Info, color: 'var(--color-text-secondary)', label: 'Context' },
  flag: { Icon: AlertTriangle, color: 'var(--color-sev-medium-text)', label: 'Flag' },
  suggestion: { Icon: Lightbulb, color: 'var(--color-brand)', label: 'Suggestion' },
  clarification: { Icon: HelpCircle, color: 'var(--color-text-tertiary)', label: 'Clarification' },
};

const selectStyle = {
  padding: '0.4rem 0.6rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border-light)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface)',
  fontFamily: 'inherit',
};

const inputStyle = {
  ...selectStyle,
  flex: 1,
  minWidth: 0,
};

export default function Admin() {
  const [tab, setTab] = useState('keywords');

  return (
    <div className="page">
      <header style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Settings size={22} aria-hidden style={{ color: 'var(--color-brand)' }} />
          <h1 style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
            margin: 0,
          }}>Admin</h1>
        </div>
        <p style={{
          margin: '0.35rem 0 0 0',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
        }}>
          Manage keywords, severity overrides, and AI comments.
        </p>
      </header>

      <div className="tab-strip">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-strip-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'keywords' && <KeywordsTab />}
      {tab === 'overrides' && <OverridesTab />}
      {tab === 'comments' && <CommentsTab />}
    </div>
  );
}

// ───────────────────────── Keywords ─────────────────────────

function KeywordsTab() {
  const [data, setData] = useState({ crisis: [], high: [], medium: [] });
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function refresh() {
    try {
      const next = await api.listKeywords();
      setData(next);
    } catch (err) {
      console.error('listKeywords failed:', err);
    }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    const filterList = (list) =>
      list.filter((e) =>
        e.pattern.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q),
      );
    return {
      crisis: filterList(data.crisis),
      high: filterList(data.high),
      medium: filterList(data.medium),
    };
  }, [data, search]);

  async function handleAdd({ pattern, level, description }) {
    setAddError('');
    try {
      await api.addKeyword({ pattern, level, description });
      setAddOpen(false);
      await refresh();
    } catch (err) {
      setAddError(err.message);
    }
  }

  async function handleSaveEdit(id, patch) {
    try {
      await api.updateKeyword(id, patch);
      setEditingId(null);
      await refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteKeyword(id);
      setConfirmDeleteId(null);
      await refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      {/* Search + Add */}
      <div style={{
        display: 'flex',
        gap: '0.6rem',
        alignItems: 'center',
        marginBottom: '0.85rem',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          flex: 1,
          maxWidth: 360,
          padding: '0.4rem 0.6rem',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-surface)',
        }}>
          <Search size={14} aria-hidden style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search patterns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 'var(--text-sm)',
              fontFamily: 'inherit',
              background: 'transparent',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => { setAddOpen((v) => !v); setAddError(''); }}
        >
          <Plus size={14} aria-hidden style={{ marginRight: 4 }} />
          Add pattern
        </button>
      </div>

      {/* Floor rule banner */}
      <div style={{
        background: 'var(--color-brand-light)',
        border: '1px solid var(--color-border-light)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.65rem 0.85rem',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.55,
        marginBottom: '1rem',
      }}>
        <strong style={{ color: 'var(--color-text-primary)' }}>Floor rule:</strong>{' '}
        Patterns are the safety floor. The AI may escalate severity, but cannot
        de-escalate below what these patterns match. Crisis patterns force the
        crisis severity level on any intake they match.
      </div>

      {/* Inline add form */}
      {addOpen && (
        <KeywordForm
          mode="add"
          initial={{ pattern: '', level: 'medium', description: '' }}
          error={addError}
          onSubmit={handleAdd}
          onCancel={() => { setAddOpen(false); setAddError(''); }}
        />
      )}

      {/* Three cards */}
      {['crisis', 'high', 'medium'].map((level) => (
        <section key={level} className="card" style={{ marginBottom: '0.85rem' }}>
          <h2 style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 0.65rem 0',
          }}>
            {LEVEL_LABELS[level]}
            <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
              ({filtered[level].length})
            </span>
          </h2>
          {filtered[level].length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', margin: 0 }}>
              {search ? 'No patterns match your search.' : 'No patterns at this level.'}
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {filtered[level].map((entry) => (
                <KeywordRow
                  key={entry.id}
                  entry={entry}
                  isEditing={editingId === entry.id}
                  isDeleting={confirmDeleteId === entry.id}
                  onEdit={() => { setEditingId(entry.id); setConfirmDeleteId(null); }}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={(patch) => handleSaveEdit(entry.id, patch)}
                  onAskDelete={() => { setConfirmDeleteId(entry.id); setEditingId(null); }}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  onConfirmDelete={() => handleDelete(entry.id)}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function KeywordRow({
  entry,
  isEditing,
  isDeleting,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  if (isEditing) {
    return (
      <li>
        <KeywordForm
          mode="edit"
          initial={{ pattern: entry.pattern, level: entry.level, description: entry.description || '' }}
          onSubmit={onSaveEdit}
          onCancel={onCancelEdit}
        />
      </li>
    );
  }

  return (
    <li style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.45rem 0.5rem',
      borderRadius: 'var(--radius-xs)',
      background: 'var(--color-surface-raised)',
    }}>
      <code
        title={entry.pattern}
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {entry.pattern}
      </code>
      {entry.description ? (
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-tertiary)',
          maxWidth: 220,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }} title={entry.description}>
          {entry.description}
        </span>
      ) : null}
      <span className="pill" style={{ flexShrink: 0 }}>
        {entry.matchCount} {entry.matchCount === 1 ? 'match' : 'matches'}
      </span>
      {isDeleting ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Are you sure?
          </span>
          <button type="button" onClick={onConfirmDelete} style={iconBtnDangerStyle}>Yes</button>
          <button type="button" onClick={onCancelDelete} style={iconBtnGhostStyle}>Cancel</button>
        </span>
      ) : (
        <span style={{ display: 'flex', gap: '0.2rem' }}>
          <button type="button" onClick={onEdit} aria-label="Edit pattern" style={iconBtnGhostStyle}>
            <Edit3 size={14} aria-hidden />
          </button>
          <button type="button" onClick={onAskDelete} aria-label="Delete pattern" style={iconBtnGhostStyle}>
            <Trash2 size={14} aria-hidden />
          </button>
        </span>
      )}
    </li>
  );
}

function KeywordForm({ mode, initial, error, onSubmit, onCancel }) {
  const [pattern, setPattern] = useState(initial.pattern);
  const [level, setLevel] = useState(initial.level);
  const [description, setDescription] = useState(initial.description);
  const [localError, setLocalError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLocalError('');
    if (!pattern.trim()) {
      setLocalError('Pattern is required.');
      return;
    }
    try {
      await onSubmit({ pattern: pattern.trim(), level, description: description.trim() });
    } catch (err) {
      setLocalError(err.message);
    }
  }

  const message = error || localError;

  return (
    <form onSubmit={submit} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      padding: '0.85rem',
      border: '1px solid var(--color-border-light)',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--color-surface)',
      marginBottom: mode === 'add' ? '0.85rem' : 0,
    }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Regex pattern, e.g. \\b(eviction)\\b"
          style={{
            ...inputStyle,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            minWidth: 240,
          }}
        />
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={selectStyle}>
          <option value="crisis">Crisis</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>
      </div>
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional description"
        style={inputStyle}
      />
      {message && (
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-crisis-text)' }}>
          {message}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">
          {mode === 'add' ? 'Add pattern' : 'Save'}
        </button>
      </div>
    </form>
  );
}

const iconBtnGhostStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-tertiary)',
  padding: '0.25rem 0.4rem',
  borderRadius: 'var(--radius-xs)',
  fontSize: 'var(--text-xs)',
  fontFamily: 'inherit',
};
const iconBtnDangerStyle = {
  ...iconBtnGhostStyle,
  color: 'var(--color-crisis-text)',
  fontWeight: 600,
};

// ───────────────────────── Severity overrides ─────────────────────────

function OverridesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState('all');
  const [direction, setDirection] = useState('all');
  const [range, setRange] = useState('30');

  useEffect(() => {
    api.listOverrides()
      .then((r) => { setRows(r); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = range === 'all' ? -Infinity : now - Number(range) * 24 * 60 * 60 * 1000;
    return rows.filter((r) => {
      if (cutoff !== -Infinity && new Date(r.ratedAt).getTime() < cutoff) return false;
      if (staff !== 'all' && r.by !== staff) return false;
      if (direction !== 'all') {
        const aiRank = SEVERITY_RANK[r.aiSeverity] ?? -1;
        const ovRank = SEVERITY_RANK[r.overrideSeverity] ?? -1;
        if (direction === 'escalations' && !(ovRank > aiRank)) return false;
        if (direction === 'deescalations' && !(ovRank < aiRank)) return false;
      }
      return true;
    });
  }, [rows, staff, direction, range]);

  const grouped = useMemo(() => groupByDate(filtered, (r) => r.ratedAt), [filtered]);

  if (!loading && rows.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No overrides yet"
        body="Staff have agreed with the AI's severity calls so far."
      />
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '0.6rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: '0.85rem',
      }}>
        <span style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          marginRight: '0.5rem',
        }}>
          Showing {filtered.length} override{filtered.length === 1 ? '' : 's'}
        </span>
        <Filter size={14} aria-hidden style={{ color: 'var(--color-text-tertiary)' }} />
        <select value={staff} onChange={(e) => setStaff(e.target.value)} style={selectStyle}>
          <option value="all">All staff</option>
        </select>
        <select value={direction} onChange={(e) => setDirection(e.target.value)} style={selectStyle}>
          <option value="all">All directions</option>
          <option value="escalations">Escalations</option>
          <option value="deescalations">De-escalations</option>
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value)} style={selectStyle}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
          No overrides match these filters.
        </p>
      ) : (
        Object.entries(grouped).map(([bucket, list]) => (
          <section key={bucket} style={{ marginBottom: '1rem' }}>
            <h3 style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: '0 0 0.5rem 0',
            }}>
              {bucket}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {list.map((r) => <OverrideRow key={r.intakeId + r.ratedAt} row={r} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function OverrideRow({ row }) {
  return (
    <div className="card" style={{ padding: '0.85rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
          {row.clientName}
        </strong>
        <ArrowRight size={12} aria-hidden style={{ color: 'var(--color-text-tertiary)' }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>AI</span>
        {row.aiSeverity ? <SeverityPill level={row.aiSeverity} /> : <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>—</span>}
        <ArrowRight size={12} aria-hidden style={{ color: 'var(--color-text-tertiary)' }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>override</span>
        <SeverityPill level={row.overrideSeverity} />
      </div>
      {row.reason && (
        <p style={{
          margin: '0.4rem 0 0 0',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          fontStyle: 'italic',
        }}>
          "{row.reason}"
        </p>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0.4rem',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-tertiary)',
      }}>
        <span>{formatDateTime(row.ratedAt)} by {row.by}</span>
        <Link to={`/dashboard/${row.intakeId}`} style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}>
          View intake →
        </Link>
      </div>
    </div>
  );
}

// ───────────────────────── AI comments ─────────────────────────

function CommentsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => {
    const params = {};
    if (type) params.type = type;
    if (severity) params.severity = severity;
    if (category) params.category = category;
    if (debouncedQ) params.q = debouncedQ;
    setLoading(true);
    api.listAIComments(params)
      .then((r) => { setRows(r); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, [type, severity, category, debouncedQ]);

  async function rate(row, helpful) {
    const existing = row.feedback?.[0];
    const nextHelpful = existing && existing.helpful === helpful ? null : helpful;
    if (nextHelpful === null) return; // toggling off not supported by API; ignore
    try {
      await api.rateComment(row.intakeId, row.commentIdx, helpful);
      setRows((rs) =>
        rs.map((r) =>
          r.intakeId === row.intakeId && r.commentIdx === row.commentIdx
            ? { ...r, feedback: [{ intakeId: r.intakeId, commentIdx: r.commentIdx, helpful, ratedAt: new Date().toISOString() }] }
            : r,
        ),
      );
    } catch (err) {
      alert(err.message);
    }
  }

  const noComments = !loading && rows.length === 0 && !type && !severity && !category && !debouncedQ;

  if (noComments) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No comments yet"
        body="No analyses have run yet — complete an intake to populate this feed."
      />
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: '0.85rem',
      }}>
        <Filter size={14} aria-hidden style={{ color: 'var(--color-text-tertiary)' }} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
          <option value="">All types</option>
          <option value="context">Context</option>
          <option value="flag">Flag</option>
          <option value="suggestion">Suggestion</option>
          <option value="clarification">Clarification</option>
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={selectStyle}>
          <option value="">All severity</option>
          <option value="crisis">Crisis</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
          <option value="">All categories</option>
          <option value="Housing">Housing</option>
          <option value="Food">Food</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Employment">Employment</option>
          <option value="Legal">Legal</option>
          <option value="Utilities">Utilities</option>
          <option value="Other">Other</option>
        </select>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          flex: 1,
          minWidth: 200,
          maxWidth: 320,
          padding: '0.4rem 0.6rem',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-surface)',
        }}>
          <Search size={14} aria-hidden style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search comments..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 'var(--text-sm)',
              fontFamily: 'inherit',
              background: 'transparent',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
          No comments match these filters.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {rows.map((r) => <CommentRow key={`${r.intakeId}-${r.commentIdx}`} row={r} onRate={rate} />)}
        </div>
      )}
    </div>
  );
}

function CommentRow({ row, onRate }) {
  const meta = TYPE_META[row.type] || TYPE_META.context;
  const { Icon } = meta;
  const fb = row.feedback?.[0];

  return (
    <div className="card" style={{ padding: '0.85rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Icon size={16} aria-hidden style={{ color: meta.color }} />
        <strong style={{ fontSize: 'var(--text-sm)', color: meta.color }}>{meta.label}</strong>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
          {row.client.name} · {row.client.category || 'Uncategorized'} ·
        </span>
        {row.client.severity ? <SeverityPill level={row.client.severity} /> : null}
      </div>
      <p style={{
        margin: '0.4rem 0 0 0',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-primary)',
        lineHeight: 1.55,
      }}>
        {row.text}
      </p>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0.5rem',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-tertiary)',
      }}>
        <span>
          {formatDate(row.createdAt)} ·{' '}
          <Link to={`/dashboard/${row.intakeId}`} style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}>
            View intake →
          </Link>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ marginRight: 4 }}>Helpful?</span>
          <button
            type="button"
            aria-label="Helpful"
            onClick={() => onRate(row, true)}
            style={thumbStyle(fb?.helpful === true)}
          >
            <ThumbsUp size={14} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Not helpful"
            onClick={() => onRate(row, false)}
            style={thumbStyle(fb?.helpful === false)}
          >
            <ThumbsDown size={14} aria-hidden />
          </button>
        </span>
      </div>
    </div>
  );
}

function thumbStyle(active) {
  return {
    background: active ? 'var(--color-brand-light)' : 'transparent',
    border: '1px solid ' + (active ? 'var(--color-brand)' : 'var(--color-border-light)'),
    color: active ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
    borderRadius: 'var(--radius-xs)',
    padding: '0.2rem 0.35rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  };
}

// ───────────────────────── helpers ─────────────────────────

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function groupByDate(rows, getIso) {
  const today = startOfDay(new Date());
  const yesterday = today - 24 * 60 * 60 * 1000;
  const weekStart = today - 6 * 24 * 60 * 60 * 1000;
  const groups = { Today: [], Yesterday: [], 'This week': [], Earlier: [] };
  for (const r of rows) {
    const t = startOfDay(getIso(r));
    if (t === today) groups.Today.push(r);
    else if (t === yesterday) groups.Yesterday.push(r);
    else if (t >= weekStart) groups['This week'].push(r);
    else groups.Earlier.push(r);
  }
  // Drop empty buckets, preserve order
  const out = {};
  for (const [k, v] of Object.entries(groups)) {
    if (v.length) out[k] = v;
  }
  return out;
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
