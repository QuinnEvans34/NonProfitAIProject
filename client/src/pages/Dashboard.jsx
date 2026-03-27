import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge, UrgencyBadge, STATUSES } from '../components/StatusBadge.jsx';

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

export default function Dashboard() {
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  useEffect(() => {
    fetchIntakes();
    // Poll every 10s so new intakes show up during demo
    const interval = setInterval(fetchIntakes, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchIntakes() {
    try {
      const res = await fetch('/api/intakes');
      const data = await res.json();
      setIntakes(data);
    } catch { /* silent */ }
    setLoading(false);
  }

  const filtered = intakes.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (urgencyFilter !== 'all' && i.urgencyFlag !== urgencyFilter) return false;
    return true;
  });

  return (
    <div className="page" style={{ maxWidth: '960px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h1 style={{ fontSize: '1.4rem' }}>Staff Dashboard</h1>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>
          {intakes.length} intake{intakes.length !== 1 ? 's' : ''} total
        </span>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '0.6rem 1rem', marginBottom: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666' }}>Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
        >
          <option value="all">All urgency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(statusFilter !== 'all' || urgencyFilter !== 'all') && (
          <button
            onClick={() => { setStatusFilter('all'); setUrgencyFilter('all'); }}
            style={{ fontSize: '0.8rem', color: '#1a5632', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            {intakes.length === 0
              ? 'No intakes yet. Complete an intake from the "New Intake" page to see it here.'
              : 'No intakes match the current filters.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', background: '#fafafa' }}>
                <th style={th}>Client</th>
                <th style={th}>Category</th>
                <th style={th}>Urgency</th>
                <th style={th}>Status</th>
                <th style={th}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((intake) => (
                <tr
                  key={intake.id}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: intake.crisisFlag ? '#fef2f2' : intake.urgencyFlag === 'high' ? '#fffbeb' : 'white',
                  }}
                >
                  <td style={td}>
                    <Link to={`/dashboard/${intake.id}`} style={{ color: '#1a5632', fontWeight: 500, textDecoration: 'none' }}>
                      {intake.clientName || '(unnamed)'}
                    </Link>
                  </td>
                  <td style={td}>{intake.needCategory || '—'}</td>
                  <td style={td}>
                    <UrgencyBadge level={intake.urgencyFlag} crisisFlag={intake.crisisFlag} />
                  </td>
                  <td style={td}><StatusBadge status={intake.status} /></td>
                  <td style={{ ...td, color: '#888', fontSize: '0.85rem' }}>{timeAgo(intake.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th = { padding: '0.6rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.03em' };
const td = { padding: '0.6rem 0.75rem', fontSize: '0.9rem' };
