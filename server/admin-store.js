// Parallel surface for the admin page. The runtime urgency detector in
// `server/urgency.js` does NOT yet read from this store — `getActivePatterns()`
// is the future swap point. Until that swap, edits here change what the admin
// UI sees but do NOT influence live severity classification.
//
// Storage is in-memory: restarts wipe everything. No auth gate this sprint;
// endpoints live under /api/admin/* so they're easy to gate later.

import {
  CRISIS_PATTERNS,
  HIGH_URGENCY_PATTERNS,
  MEDIUM_URGENCY_PATTERNS,
} from './urgency.js';

const VALID_LEVELS = ['crisis', 'high', 'medium'];

const keywords = new Map();
const feedback = [];

function makeId() {
  return 'kw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function nowIso() {
  return new Date().toISOString();
}

function seedFromUrgency() {
  const seedAt = nowIso();
  const groups = [
    { level: 'crisis', list: CRISIS_PATTERNS },
    { level: 'high', list: HIGH_URGENCY_PATTERNS },
    { level: 'medium', list: MEDIUM_URGENCY_PATTERNS },
  ];
  for (const { level, list } of groups) {
    for (const re of list) {
      const id = makeId();
      keywords.set(id, {
        id,
        pattern: re.source,
        level,
        description: '',
        addedAt: seedAt,
      });
    }
  }
}
seedFromUrgency();

function compileOrThrow(pattern) {
  try {
    return new RegExp(pattern, 'i');
  } catch (err) {
    throw new Error(`Invalid regex: ${err.message}`);
  }
}

export function listKeywords() {
  const grouped = { crisis: [], high: [], medium: [] };
  for (const entry of keywords.values()) {
    grouped[entry.level].push({ ...entry });
  }
  for (const level of VALID_LEVELS) {
    grouped[level].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  }
  return grouped;
}

export function addKeyword({ pattern, level, description }) {
  if (typeof pattern !== 'string' || !pattern.trim()) {
    throw new Error('Pattern is required');
  }
  if (!VALID_LEVELS.includes(level)) {
    throw new Error(`Invalid level: must be one of ${VALID_LEVELS.join(', ')}`);
  }
  compileOrThrow(pattern);
  const id = makeId();
  const entry = {
    id,
    pattern: pattern.trim(),
    level,
    description: typeof description === 'string' ? description.trim() : '',
    addedAt: nowIso(),
  };
  keywords.set(id, entry);
  return { ...entry };
}

export function updateKeyword(id, patch) {
  const existing = keywords.get(id);
  if (!existing) return null;
  const next = { ...existing };
  if (patch.pattern !== undefined) {
    if (typeof patch.pattern !== 'string' || !patch.pattern.trim()) {
      throw new Error('Pattern is required');
    }
    compileOrThrow(patch.pattern);
    next.pattern = patch.pattern.trim();
  }
  if (patch.level !== undefined) {
    if (!VALID_LEVELS.includes(patch.level)) {
      throw new Error(`Invalid level: must be one of ${VALID_LEVELS.join(', ')}`);
    }
    next.level = patch.level;
  }
  if (patch.description !== undefined) {
    next.description = typeof patch.description === 'string' ? patch.description.trim() : '';
  }
  keywords.set(id, next);
  return { ...next };
}

export function removeKeyword(id) {
  return keywords.delete(id);
}

export function getActivePatterns() {
  const out = { CRISIS: [], HIGH: [], MEDIUM: [] };
  const bucket = { crisis: 'CRISIS', high: 'HIGH', medium: 'MEDIUM' };
  for (const entry of keywords.values()) {
    try {
      out[bucket[entry.level]].push(new RegExp(entry.pattern, 'i'));
    } catch {
      // Skip invalid; defensive — add/update validate at write time.
    }
  }
  return out;
}

export function rateComment({ intakeId, commentIdx, helpful }) {
  if (typeof intakeId !== 'string' || !intakeId) {
    throw new Error('intakeId is required');
  }
  if (!Number.isInteger(commentIdx) || commentIdx < 0) {
    throw new Error('commentIdx must be a non-negative integer');
  }
  if (typeof helpful !== 'boolean') {
    throw new Error('helpful must be a boolean');
  }
  const ratedAt = nowIso();
  const existingIdx = feedback.findIndex(
    (f) => f.intakeId === intakeId && f.commentIdx === commentIdx,
  );
  const row = { intakeId, commentIdx, helpful, ratedAt };
  if (existingIdx >= 0) {
    feedback[existingIdx] = row;
  } else {
    feedback.push(row);
  }
  return { ...row };
}

export function getCommentFeedback() {
  return feedback.map((f) => ({ ...f }));
}
