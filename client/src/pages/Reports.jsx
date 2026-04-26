import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import EmptyState from '../components/EmptyState.jsx';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Filter,
  Download,
  ArrowUpRight,
  Tag,
  Hash,
} from '../lib/icons.js';

const NEED_CATEGORIES = ['Housing', 'Food', 'Healthcare', 'Employment', 'Legal', 'Utilities', 'Other'];
const SEVERITY_LEVELS = ['crisis', 'high', 'medium', 'low'];
const SEVERITY_LABEL = { crisis: 'Crisis', high: 'High', medium: 'Medium', low: 'Low' };
const SEVERITY_COLOR = {
  crisis: 'var(--score-fill-crisis)',
  high: 'var(--score-fill-high)',
  medium: 'var(--score-fill-med)',
  low: 'var(--score-fill-low)',
};

const DEFAULT_FILTERS = { range: '30', category: 'all', severity: 'all' };

const selectStyle = {
  padding: '0.4rem 0.6rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border-light)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)',
  background: 'var(--color-surface)',
  fontFamily: 'inherit',
};

function fmtDelta(curr, prev, { invert = false } = {}) {
  if (curr === prev) return { text: '0', polarity: 'flat' };
  const diff = curr - prev;
  const sign = diff > 0 ? '+' : '';
  // For metrics where increases are bad (crisis count, high+crisis count),
  // invert polarity so "down" reads as success.
  const isGood = invert ? diff < 0 : diff > 0;
  const polarity = isGood ? 'up' : 'down';
  const display = Number.isInteger(curr) && Number.isInteger(prev)
    ? `${sign}${diff}`
    : `${sign}${(Math.round(diff * 10) / 10)}`;
  return { text: display, polarity };
}

function KpiTile({ label, value, delta, icon: Icon }) {
  const polarityColor =
    delta?.polarity === 'up'
      ? 'var(--color-success)'
      : delta?.polarity === 'down'
        ? 'var(--color-text-secondary)'
        : 'var(--color-text-tertiary)';

  return (
    <div className="kpi-tile">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: 'var(--text-xs)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-tertiary)',
        fontWeight: 600,
      }}>
        {Icon && <Icon size={14} aria-hidden />}
        {label}
      </div>
      <div style={{
        fontSize: 'var(--text-3xl)',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        fontFeatureSettings: '"tnum"',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 'var(--text-xs)',
        color: polarityColor,
        fontWeight: 600,
        minHeight: '1em',
      }}>
        {delta ? `${delta.text} vs prior` : ' '}
      </div>
    </div>
  );
}

function CategoryBars({ rows, animateKey }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.primary, r.secondary)));
  const total = rows.reduce((sum, r) => sum + r.primary, 0);

  // Animate width: render at 0 then update on mount.
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => setAnimated(true), 30);
    return () => clearTimeout(t);
  }, [animateKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {rows.map((r) => {
        const primaryPct = (r.primary / max) * 100;
        const secondaryPct = (r.secondary / max) * 100;
        const pctOfTotal = total > 0 ? Math.round((r.primary / total) * 1000) / 10 : 0;
        return (
          <div key={r.category} className="reports-bar-row">
            <div className="reports-bar-label">{r.category}</div>
            <div className="reports-bar-track">
              <div
                className="reports-bar-fill reports-bar-fill--secondary"
                style={{ width: animated ? `${secondaryPct}%` : '0%' }}
              />
              <div
                className="reports-bar-fill reports-bar-fill--primary"
                style={{ width: animated ? `${primaryPct}%` : '0%' }}
              />
              <div className="reports-bar-end-label">
                {r.primary}{r.secondary > 0 ? ` (+${r.secondary} sec)` : ''}{total > 0 ? ` · ${pctOfTotal}%` : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  // Angles in radians, 0 = top, clockwise.
  const x1 = cx + r * Math.sin(startAngle);
  const y1 = cy - r * Math.cos(startAngle);
  const x2 = cx + r * Math.sin(endAngle);
  const y2 = cy - r * Math.cos(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function SeverityDonut({ rows }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const strokeWidth = 22;

  let cursor = 0;
  const segments = rows.map((row) => {
    if (row.count === 0 || total === 0) return null;
    const fraction = row.count / total;
    const startAngle = cursor * 2 * Math.PI;
    const endAngle = (cursor + fraction) * 2 * Math.PI;
    cursor += fraction;
    return {
      level: row.level,
      d: arcPath(cx, cy, r, startAngle, endAngle - 0.001),
      color: SEVERITY_COLOR[row.level],
      count: row.count,
      fraction,
    };
  }).filter(Boolean);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
      <svg width={size} height={size} role="img" aria-label="Severity distribution donut chart">
        {total === 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border-light)" strokeWidth={strokeWidth} />
        )}
        {segments.length === 1 && total > 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={segments[0].color} strokeWidth={strokeWidth} />
        ) : (
          segments.map((seg) => (
            <path key={seg.level} d={seg.d} fill="none" stroke={seg.color} strokeWidth={strokeWidth} />
          ))
        )}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            fill: 'var(--color-text-primary)',
            fontFeatureSettings: '"tnum"',
          }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: 'var(--text-xs)',
            fill: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          analyzed
        </text>
      </svg>
      <div className="reports-donut-legend">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0;
          return (
            <div key={row.level} className="reports-legend-row">
              <span
                className="reports-legend-swatch"
                style={{ background: SEVERITY_COLOR[row.level] }}
              />
              <span className="reports-legend-label">{SEVERITY_LABEL[row.level]}</span>
              <span className="reports-legend-count">{row.count}</span>
              <span className="reports-legend-pct">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreOverTime({ points }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const width = 900;
  const height = 220;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  if (!points || points.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
        No analyzed intakes in this range yet.
      </div>
    );
  }

  const xs = points.map((_, i) =>
    points.length === 1 ? padL + innerW / 2 : padL + (i / (points.length - 1)) * innerW
  );
  const ys = points.map((p) => padT + innerH - (p.averageHelpScore / 100) * innerH);

  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const areaPath = `${linePath} L ${xs[xs.length - 1]} ${padT + innerH} L ${xs[0]} ${padT + innerH} Z`;

  // Pick 4–6 evenly spaced labels.
  const labelTargets = Math.min(points.length, 6);
  const labelStep = Math.max(1, Math.floor((points.length - 1) / Math.max(1, labelTargets - 1)));
  const labelIdxs = [];
  for (let i = 0; i < points.length; i += labelStep) labelIdxs.push(i);
  if (labelIdxs[labelIdxs.length - 1] !== points.length - 1 && points.length > 1) {
    labelIdxs.push(points.length - 1);
  }

  function onMove(e) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < xs.length; i += 1) {
      const d = Math.abs(xs[i] - localX);
      if (d < nearestDist) { nearestDist = d; nearest = i; }
    }
    setHover(nearest);
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: 'block' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Average help score over time"
      >
        {/* Y gridlines at 0/50/100 */}
        {[0, 50, 100].map((tick) => {
          const y = padT + innerH - (tick / 100) * innerH;
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--color-border-light)" strokeDasharray="2 3" />
              <text x={padL - 6} y={y} textAnchor="end" dominantBaseline="middle" style={{
                fontSize: 'var(--text-xs)',
                fill: 'var(--color-text-tertiary)',
                fontFeatureSettings: '"tnum"',
              }}>
                {tick}
              </text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaPath} fill="var(--color-brand-light)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--color-brand)" strokeWidth={2} />
        {/* Points */}
        {xs.map((x, i) => (
          <circle
            key={points[i].bin}
            cx={x}
            cy={ys[i]}
            r={hover === i ? 5 : 3}
            fill="var(--color-brand)"
          />
        ))}
        {/* X labels */}
        {labelIdxs.map((i) => (
          <text
            key={`xlbl-${i}`}
            x={xs[i]}
            y={height - 8}
            textAnchor="middle"
            style={{
              fontSize: 'var(--text-xs)',
              fill: 'var(--color-text-tertiary)',
            }}
          >
            {points[i].bin}
          </text>
        ))}
        {/* Hover indicator line */}
        {hover != null && (
          <line
            x1={xs[hover]} x2={xs[hover]}
            y1={padT} y2={padT + innerH}
            stroke="var(--color-brand-muted)"
            strokeDasharray="2 3"
          />
        )}
      </svg>
      {hover != null && (
        <div
          className="reports-line-tooltip"
          style={{
            left: `calc(${(xs[hover] / width) * 100}% + 0px)`,
          }}
        >
          <div style={{ fontWeight: 600 }}>{points[hover].bin}</div>
          <div>Avg score: <strong>{points[hover].averageHelpScore}</strong></div>
          <div style={{ color: 'var(--color-text-tertiary)' }}>{points[hover].count} intake{points[hover].count !== 1 ? 's' : ''}</div>
        </div>
      )}
    </div>
  );
}

function TopList({ icon: Icon, title, rows, valueKey }) {
  const navigate = useNavigate();
  return (
    <div className="reports-card">
      <div className="reports-card-header">
        {Icon && <Icon size={16} aria-hidden />}
        <h3>{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div style={{
          padding: 'var(--space-6)',
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--text-sm)',
        }}>
          No data yet.
        </div>
      ) : (
        <table className="reports-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{valueKey === 'tag' ? 'Tag' : 'Keyword'}</th>
              <th style={{ textAlign: 'right' }}>Count</th>
              <th style={{ textAlign: 'right' }}>% of intakes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const value = row[valueKey];
              return (
                <tr
                  key={value}
                  onClick={() => {
                    // TODO: dashboard search isn't built yet — pass ?search=<value> once available.
                    navigate('/dashboard');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{value}</td>
                  <td style={{ textAlign: 'right', fontFeatureSettings: '"tnum"' }}>{row.count}</td>
                  <td style={{ textAlign: 'right', fontFeatureSettings: '"tnum"', color: 'var(--color-text-secondary)' }}>{row.pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Reports() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.reportSummary(filters)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load reports'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters.range, filters.category, filters.severity]);

  const activeFilters =
    filters.range !== DEFAULT_FILTERS.range ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.severity !== DEFAULT_FILTERS.severity;

  const animateKey = useMemo(
    () => `${filters.range}-${filters.category}-${filters.severity}`,
    [filters.range, filters.category, filters.severity]
  );

  return (
    <div className="page reports-page">
      {/* Header strip */}
      <div className="reports-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BarChart3 size={22} aria-hidden style={{ color: 'var(--color-brand)' }} />
          <div>
            <h1 style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.01em',
              color: 'var(--color-text-primary)',
            }}>
              Reports
            </h1>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
              Aggregate view of submitted intakes.
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="reports-filter-bar">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={14} aria-hidden style={{ color: 'var(--color-text-tertiary)' }} />
          <select
            value={filters.range}
            onChange={(e) => setFilters((f) => ({ ...f, range: e.target.value }))}
            style={selectStyle}
            aria-label="Time range"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="ytd">Year to date</option>
            <option value="all">All time</option>
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            style={selectStyle}
            aria-label="Category"
          >
            <option value="all">All categories</option>
            {NEED_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
            style={selectStyle}
            aria-label="Severity"
          >
            <option value="all">All severity</option>
            {SEVERITY_LEVELS.map((s) => (
              <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>
            ))}
          </select>
          {activeFilters && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="reports-clear-link"
            >
              Clear
            </button>
          )}
        </div>
        <button
          className="reports-download-btn"
          onClick={() => { window.location.href = api.reportExportUrl(filters); }}
        >
          <Download size={14} aria-hidden />
          Download CSV
        </button>
      </div>

      {loading && !data && (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          Loading…
        </div>
      )}
      {error && (
        <div style={{ padding: 'var(--space-6)', color: 'var(--color-crisis-text)' }}>
          {error}
        </div>
      )}

      {data && data.kpis.totalIntakes === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No intakes in this range"
          body="Try a wider time range, or complete an intake to populate reports."
        />
      )}

      {data && data.kpis.totalIntakes > 0 && (
        <>
          {/* KPI tiles */}
          <div className="reports-kpi-grid">
            <KpiTile
              label="Total intakes"
              value={data.kpis.totalIntakes}
              delta={fmtDelta(data.kpis.totalIntakes, data.kpis.totalIntakesPrev)}
              icon={TrendingUp}
            />
            <KpiTile
              label="Avg help score"
              value={data.kpis.averageHelpScore}
              delta={fmtDelta(data.kpis.averageHelpScore, data.kpis.averageHelpScorePrev, { invert: true })}
              icon={BarChart3}
            />
            <KpiTile
              label="High + Crisis"
              value={data.kpis.highOrCrisisCount}
              delta={fmtDelta(data.kpis.highOrCrisisCount, data.kpis.highOrCrisisCountPrev, { invert: true })}
              icon={AlertTriangle}
            />
            <KpiTile
              label="Crisis flagged"
              value={data.kpis.crisisFlaggedCount}
              delta={fmtDelta(data.kpis.crisisFlaggedCount, data.kpis.crisisFlaggedCountPrev, { invert: true })}
              icon={ShieldAlert}
            />
          </div>

          {data.kpis.pendingAnalysisCount === data.kpis.totalIntakes ? (
            <div className="reports-pending-notice">
              All intakes in this range are pending analysis. Charts populate once the analyzer runs.
            </div>
          ) : (
            <>
              {/* Two-column grid: category bars + severity donut */}
              <div className="reports-grid-2">
                <div className="reports-card">
                  <div className="reports-card-header">
                    <BarChart3 size={16} aria-hidden />
                    <h3>Category distribution</h3>
                  </div>
                  <CategoryBars rows={data.categoryDistribution} animateKey={animateKey} />
                </div>
                <div className="reports-card">
                  <div className="reports-card-header">
                    <ArrowUpRight size={16} aria-hidden />
                    <h3>Severity distribution</h3>
                  </div>
                  <SeverityDonut rows={data.severityDistribution} />
                </div>
              </div>

              {/* Score over time (full width) */}
              <div className="reports-card">
                <div className="reports-card-header">
                  <TrendingUp size={16} aria-hidden />
                  <h3>Average help score over time</h3>
                </div>
                <ScoreOverTime points={data.scoreOverTime} />
              </div>

              {/* Top tags / keywords */}
              <div className="reports-grid-2">
                <TopList
                  icon={Tag}
                  title="Top tags"
                  rows={data.topTags}
                  valueKey="tag"
                />
                <TopList
                  icon={Hash}
                  title="Top keywords"
                  rows={data.topKeywords}
                  valueKey="keyword"
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
