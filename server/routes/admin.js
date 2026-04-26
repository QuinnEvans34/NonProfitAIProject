import { Router } from 'express';
import * as store from '../store.js';
import * as adminStore from '../admin-store.js';

const router = Router();

const VALID_LEVELS = ['crisis', 'high', 'medium'];

function countMatches(patternSrc) {
  let re;
  try {
    re = new RegExp(patternSrc, 'i');
  } catch {
    return 0;
  }
  let count = 0;
  for (const intake of store.getAll()) {
    const transcript = intake.transcript || [];
    const hit = transcript.some(
      (m) => m.role === 'user' && typeof m.content === 'string' && re.test(m.content),
    );
    if (hit) count++;
  }
  return count;
}

function annotateMatchCounts(grouped) {
  const out = { crisis: [], high: [], medium: [] };
  for (const level of VALID_LEVELS) {
    out[level] = grouped[level].map((entry) => ({
      ...entry,
      matchCount: countMatches(entry.pattern),
    }));
  }
  return out;
}

// GET /api/admin/keywords — list patterns grouped by level with match counts
router.get('/keywords', (_req, res) => {
  res.json(annotateMatchCounts(adminStore.listKeywords()));
});

// POST /api/admin/keywords — add a pattern
router.post('/keywords', (req, res) => {
  const { pattern, level, description } = req.body || {};
  try {
    const entry = adminStore.addKeyword({ pattern, level, description });
    res.status(201).json({ ...entry, matchCount: countMatches(entry.pattern) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/admin/keywords/:id — edit
router.patch('/keywords/:id', (req, res) => {
  const { pattern, level, description } = req.body || {};
  try {
    const entry = adminStore.updateKeyword(req.params.id, { pattern, level, description });
    if (!entry) return res.status(404).json({ error: 'Keyword not found' });
    res.json({ ...entry, matchCount: countMatches(entry.pattern) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/keywords/:id
router.delete('/keywords/:id', (req, res) => {
  const removed = adminStore.removeKeyword(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Keyword not found' });
  res.status(204).end();
});

// GET /api/admin/overrides — every intake with a staff severity override
router.get('/overrides', (_req, res) => {
  const rows = store
    .getAll()
    .filter((i) => i.severityOverride !== null && i.severityOverride !== undefined)
    .map((i) => ({
      intakeId: i.id,
      clientName: i.clientName || 'Anonymous',
      aiSeverity: i.analysis?.severity?.level ?? null,
      overrideSeverity: i.severityOverride,
      reason: i.severityOverrideReason || '',
      ratedAt: i.updatedAt,
      by: 'staff',
    }))
    .sort((a, b) => new Date(b.ratedAt) - new Date(a.ratedAt));
  res.json(rows);
});

// GET /api/admin/comments — flatten ai_comments[] across all intakes, with filters
router.get('/comments', (req, res) => {
  const { type, severity, category, q } = req.query;
  const allFeedback = adminStore.getCommentFeedback();
  const rows = [];

  for (const intake of store.getAll()) {
    const comments = intake.analysis?.ai_comments || [];
    comments.forEach((c, idx) => {
      rows.push({
        intakeId: intake.id,
        commentIdx: idx,
        type: c.type,
        text: c.text,
        client: {
          name: intake.clientName || 'Anonymous',
          category: intake.needCategory || '',
          severity: intake.analysis?.severity?.level ?? null,
        },
        createdAt: intake.updatedAt,
        feedback: allFeedback.filter(
          (f) => f.intakeId === intake.id && f.commentIdx === idx,
        ),
      });
    });
  }

  let filtered = rows;
  if (type) filtered = filtered.filter((r) => r.type === type);
  if (severity) filtered = filtered.filter((r) => r.client.severity === severity);
  if (category) filtered = filtered.filter((r) => r.client.category === category);
  if (q) {
    const needle = String(q).toLowerCase();
    filtered = filtered.filter((r) => r.text.toLowerCase().includes(needle));
  }
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(filtered);
});

// POST /api/admin/comments/:intakeId/:idx/feedback — thumbs up/down
router.post('/comments/:intakeId/:idx/feedback', (req, res) => {
  const { helpful } = req.body || {};
  const idx = Number.parseInt(req.params.idx, 10);
  if (!Number.isInteger(idx) || idx < 0) {
    return res.status(400).json({ error: 'idx must be a non-negative integer' });
  }
  if (typeof helpful !== 'boolean') {
    return res.status(400).json({ error: 'helpful must be a boolean' });
  }
  const intake = store.getById(req.params.intakeId);
  if (!intake) return res.status(404).json({ error: 'Intake not found' });
  const comments = intake.analysis?.ai_comments || [];
  if (idx >= comments.length) {
    return res.status(404).json({ error: 'Comment index out of range' });
  }
  try {
    const row = adminStore.rateComment({
      intakeId: req.params.intakeId,
      commentIdx: idx,
      helpful,
    });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
