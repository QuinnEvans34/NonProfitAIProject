import { Router } from 'express';
import * as store from '../store.js';
import { NEED_CATEGORIES } from '../intake-flow.js';

const router = Router();

const SEVERITY_LEVELS = ['crisis', 'high', 'medium', 'low'];
const VALID_RANGES = new Set(['7', '30', '90', 'ytd', 'all']);
const DAY_MS = 24 * 60 * 60 * 1000;

function parseRange(rangeParam) {
  const range = VALID_RANGES.has(String(rangeParam)) ? String(rangeParam) : '30';
  const end = new Date();

  if (range === 'all') {
    return { range, start: null, end, prevStart: null, prevEnd: null };
  }

  if (range === 'ytd') {
    const start = new Date(end.getFullYear(), 0, 1);
    const spanMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(start.getTime() - spanMs);
    return { range, start, end, prevStart, prevEnd };
  }

  const days = parseInt(range, 10);
  const start = new Date(end.getTime() - days * DAY_MS);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(start.getTime() - days * DAY_MS);
  return { range, start, end, prevStart, prevEnd };
}

function effectiveCategory(intake) {
  return (
    intake.analysis?.classification?.primary_category ||
    intake.needCategory ||
    'Other'
  );
}

function effectiveSeverity(intake) {
  return (
    intake.severityOverride ||
    intake.analysis?.severity?.level ||
    null
  );
}

function inWindow(intake, start, end) {
  const t = new Date(intake.createdAt).getTime();
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

function applyFilters(intakes, { category, severity, start, end }) {
  return intakes.filter((i) => {
    if (!inWindow(i, start, end)) return false;
    if (category && category !== 'all' && effectiveCategory(i) !== category) return false;
    if (severity && severity !== 'all' && effectiveSeverity(i) !== severity) return false;
    return true;
  });
}

function helpScoreOf(intake) {
  if (typeof intake.helpScore === 'number') return intake.helpScore;
  if (typeof intake.helpScore?.score === 'number') return intake.helpScore.score;
  if (typeof intake.analysis?.severity?.score === 'number') return intake.analysis.severity.score;
  return null;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function aggregateKpis(intakes) {
  const total = intakes.length;
  const pending = intakes.filter((i) => !i.analysis).length;
  const analyzed = intakes.filter((i) => i.analysis);
  const scores = analyzed.map(helpScoreOf).filter((s) => typeof s === 'number');
  const avg = scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highOrCrisis = analyzed.filter((i) => {
    const lvl = effectiveSeverity(i);
    return lvl === 'high' || lvl === 'crisis';
  }).length;
  const crisisFlagged = intakes.filter((i) => i.crisisFlag).length;
  return {
    totalIntakes: total,
    pendingAnalysisCount: pending,
    averageHelpScore: avg,
    highOrCrisisCount: highOrCrisis,
    crisisFlaggedCount: crisisFlagged,
  };
}

function isoDay(d) {
  // YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoWeekMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Monday-based: getDay 0=Sun..6=Sat, shift so Monday=0
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return isoDay(d);
}

function buildScoreOverTime(analyzed, { start, end, range }) {
  if (analyzed.length === 0) return [];

  let useDaily;
  if (range === 'all') {
    useDaily = false;
  } else if (range === 'ytd') {
    const spanDays = (end.getTime() - start.getTime()) / DAY_MS;
    useDaily = spanDays <= 60;
  } else {
    useDaily = parseInt(range, 10) <= 60;
  }

  const bins = new Map(); // bin -> { sum, count }
  for (const i of analyzed) {
    const created = new Date(i.createdAt);
    const key = useDaily ? isoDay(created) : isoWeekMonday(created);
    const score = helpScoreOf(i);
    if (typeof score !== 'number') continue;
    const cur = bins.get(key) || { sum: 0, count: 0 };
    cur.sum += score;
    cur.count += 1;
    bins.set(key, cur);
  }

  return Array.from(bins.entries())
    .map(([bin, { sum, count }]) => ({
      bin,
      averageHelpScore: round1(sum / count),
      count,
    }))
    .sort((a, b) => a.bin.localeCompare(b.bin));
}

function topCounts(items, total, limit = 10) {
  const counts = new Map();
  for (const v of items) {
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      count,
      pct: total > 0 ? round1((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

router.get('/summary', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : 'all';
  const severity = typeof req.query.severity === 'string' ? req.query.severity : 'all';
  const { range, start, end, prevStart, prevEnd } = parseRange(req.query.range);

  const all = store.getAll();
  const current = applyFilters(all, { category, severity, start, end });
  const prev = prevStart
    ? applyFilters(all, { category, severity, start: prevStart, end: prevEnd })
    : null;

  const kpisCur = aggregateKpis(current);
  const kpisPrev = prev ? aggregateKpis(prev) : null;

  const analyzed = current.filter((i) => i.analysis);

  const categoryDistribution = NEED_CATEGORIES.map((cat) => {
    const primary = analyzed.filter(
      (i) => i.analysis?.classification?.primary_category === cat
    ).length;
    const secondary = analyzed.filter((i) =>
      (i.analysis?.classification?.secondary_categories || []).includes(cat)
    ).length;
    return { category: cat, primary, secondary };
  });

  const severityDistribution = SEVERITY_LEVELS.map((level) => ({
    level,
    count: analyzed.filter((i) => effectiveSeverity(i) === level).length,
  }));

  const scoreOverTime = buildScoreOverTime(analyzed, { start, end, range });

  const tagItems = analyzed.flatMap((i) => i.analysis?.classification?.tags || []);
  const keywordItems = analyzed.flatMap((i) => i.analysis?.keywords_extracted || []);

  const topTags = topCounts(tagItems, kpisCur.totalIntakes).map(({ key, count, pct }) => ({
    tag: key,
    count,
    pct,
  }));
  const topKeywords = topCounts(keywordItems, kpisCur.totalIntakes).map(({ key, count, pct }) => ({
    keyword: key,
    count,
    pct,
  }));

  res.json({
    filterApplied: { range, category, severity },
    kpis: {
      totalIntakes: kpisCur.totalIntakes,
      totalIntakesPrev: kpisPrev ? kpisPrev.totalIntakes : kpisCur.totalIntakes,
      averageHelpScore: kpisCur.averageHelpScore,
      averageHelpScorePrev: kpisPrev ? kpisPrev.averageHelpScore : kpisCur.averageHelpScore,
      highOrCrisisCount: kpisCur.highOrCrisisCount,
      highOrCrisisCountPrev: kpisPrev ? kpisPrev.highOrCrisisCount : kpisCur.highOrCrisisCount,
      crisisFlaggedCount: kpisCur.crisisFlaggedCount,
      crisisFlaggedCountPrev: kpisPrev ? kpisPrev.crisisFlaggedCount : kpisCur.crisisFlaggedCount,
      pendingAnalysisCount: kpisCur.pendingAnalysisCount,
    },
    categoryDistribution,
    severityDistribution,
    scoreOverTime,
    topTags,
    topKeywords,
  });
});

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvEscapeQuoted(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

router.get('/export', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : 'all';
  const severity = typeof req.query.severity === 'string' ? req.query.severity : 'all';
  const { start, end } = parseRange(req.query.range);

  const rows = applyFilters(store.getAll(), { category, severity, start, end });

  const header = [
    'id',
    'createdAt',
    'clientName',
    'category',
    'secondary_categories',
    'severity',
    'help_score',
    'crisis_flag',
    'tags',
    'staff_facing_summary',
  ];

  const lines = [header.join(',')];

  for (const i of rows) {
    const score = helpScoreOf(i);
    const summary = i.analysis?.summary?.staff_facing || i.summary || '';
    const fields = [
      csvEscape(i.id),
      csvEscape(i.createdAt),
      csvEscape(i.clientName || ''),
      csvEscape(effectiveCategory(i)),
      csvEscape((i.analysis?.classification?.secondary_categories || []).join(';')),
      csvEscape(effectiveSeverity(i) || ''),
      csvEscape(score == null ? '' : score),
      csvEscape(i.crisisFlag ? 'true' : 'false'),
      csvEscape((i.analysis?.classification?.tags || []).join(';')),
      csvEscapeQuoted(summary),
    ];
    lines.push(fields.join(','));
  }

  const ts = Math.floor(Date.now() / 1000);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="hope-connect-export-${ts}.csv"`);
  res.send(lines.join('\r\n'));
});

export default router;
