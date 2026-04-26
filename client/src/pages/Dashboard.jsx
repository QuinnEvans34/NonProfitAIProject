import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, STATUSES } from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import SeverityPill from '../components/SeverityPill.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import {
  RefreshCw,
  ClipboardList,
  ShieldAlert,
  Filter,
  AlertTriangle,
  Sparkles,
  CATEGORY_ICON,
} from '../lib/icons.js';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

const URGENCY_BORDER = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: 'transparent',
};

const SpinningRefresh = (props) => (
  <RefreshCw {...props} style={{ animation: 'dashboard-spin 1s linear infinite' }} />
);

export default function Dashboard() {
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchIntakes();
    const interval = setInterval(fetchIntakes, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchIntakes() {
    try {
      const res = await fetch('/api/intakes');
      const data = await res.json();
      setIntakes(data);
      setLastRefreshed(new Date());
    } catch { /* silent */ }
    setLoading(false);
  }

  const filtered = intakes.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    const effectiveLevel = i.analysis?.severity?.level || i.urgencyFlag;
    if (urgencyFilter !== 'all' && effectiveLevel !== urgencyFilter) return false;
    return true;
  });

  const urgentCount = intakes.filter((i) => i.urgencyFlag === 'high' && i.status !== 'closed').length;
  const activeFilters = statusFilter !== 'all' || urgencyFilter !== 'all';

  const selectStyle = {
    padding: '0.4rem 0.6rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border-light)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
    background: 'var(--color-surface)',
    fontFamily: 'inherit',
  };

  return (
    <div className="page">
      <style>{`@keyframes dashboard-spin { to { transform: rotate(360deg); } }`}</style>
      <div className="layout-dashboard">
        {/* Header bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <h1 style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}>
              Dashboard
            </h1>
            <span style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-tertiary)',
            }}>
              {intakes.length} intake{intakes.length !== 1 ? 's' : ''}
            </span>
            {urgentCount > 0 && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                color: 'var(--color-crisis-text)',
                background: 'var(--color-crisis-bg)',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-crisis-border)',
              }}>
                <AlertTriangle size={12} aria-hidden />
                {urgentCount} urgent
              </span>
            )}
          </div>

          {/* Inline filters */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={14} aria-hidden style={{ color: 'var(--color-text-tertiary)' }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
              ))}
            </select>
            <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} style={selectStyle}>
              <option value="all">All severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {activeFilters && (
              <button
                onClick={() => { setStatusFilter('all'); setUrgencyFilter('all'); }}
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-brand)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '0.25rem 0.4rem',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <EmptyState icon={SpinningRefresh} title="Loading intakes..." />
          ) : filtered.length === 0 ? (
            intakes.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No intakes yet"
                body="Complete an intake to see it here."
              />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No matches"
                body="No intakes match the current filters."
              />
            )
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <th style={th}>Client</th>
                  <th style={th}>Category</th>
                  <th style={th}>Severity</th>
                  <th style={th}>Score</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'right' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((intake) => {
                  const borderColor = intake.crisisFlag
                    ? '#ef4444'
                    : URGENCY_BORDER[intake.urgencyFlag] || 'transparent';
                  const rowBg = intake.crisisFlag
                    ? 'var(--color-crisis-bg)'
                    : intake.urgencyFlag === 'high'
                      ? 'var(--color-urgent-bg)'
                      : 'var(--color-surface)';
                  const severityLevel = intake.analysis?.severity?.level || intake.urgencyFlag || 'low';
                  const isLegacy = !intake.analysis;
                  const CategoryIcon = intake.needCategory
                    ? (CATEGORY_ICON[intake.needCategory] || Sparkles)
                    : null;

                  return (
                    <tr
                      key={intake.id}
                      className="intake-row"
                      onClick={() => navigate(`/dashboard/${intake.id}`)}
                      style={{
                        borderBottom: '1px solid var(--color-border-light)',
                        borderLeft: `4px solid ${borderColor}`,
                        background: rowBg,
                      }}
                    >
                      <td style={td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {intake.crisisFlag && (
                            <ShieldAlert
                              size={14}
                              aria-hidden
                              style={{ color: 'var(--color-crisis-text)' }}
                            />
                          )}
                          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                            {intake.clientName || '(unnamed)'}
                          </span>
                        </span>
                      </td>
                      <td style={{ ...td, color: 'var(--color-text-secondary)' }}>
                        {intake.needCategory ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CategoryIcon
                              size={14}
                              aria-hidden
                              style={{ color: 'var(--color-text-tertiary)' }}
                            />
                            {intake.needCategory}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <SeverityPill level={severityLevel} />
                          {isLegacy && (
                            <span style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-text-tertiary)',
                            }}>
                              (legacy)
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={td}>
                        {intake.helpScore != null ? (
                          <ScoreRing
                            score={intake.helpScore}
                            size={28}
                            severity={severityLevel}
                          />
                        ) : (
                          <span style={{ color: 'var(--color-text-tertiary)' }}>&mdash;</span>
                        )}
                      </td>
                      <td style={td}>
                        <StatusBadge status={intake.status} />
                      </td>
                      <td style={{ ...td, color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', textAlign: 'right' }}>
                        {timeAgo(intake.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {intakes.length > 0 && (
          <div style={{
            marginTop: '0.85rem',
            textAlign: 'center',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
          }}>
            Updated automatically every 10 seconds
            {lastRefreshed && (
              <> &middot; Last refreshed {lastRefreshed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const th = {
  padding: '0.65rem 1rem',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'left',
  background: 'var(--color-surface-raised)',
};

const td = {
  padding: '0.75rem 1rem',
  fontSize: 'var(--text-base)',
};
