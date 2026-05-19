// Parallel surface for the admin page. The runtime urgency detector in
// `server/urgency.js` does NOT yet read from this store — `getActivePatterns()`
// is the future swap point. Until that swap, edits here change what the admin
// UI sees but do NOT influence live severity classification.
//
// Storage is SQLite-backed (server/data/intakes.db). The same DB file is shared
// with the intake store; better-sqlite3 in WAL mode handles intra-process access.
// Endpoints live under /api/admin/* so they're easy to gate later.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CRISIS_PATTERNS,
  HIGH_URGENCY_PATTERNS,
  MEDIUM_URGENCY_PATTERNS,
} from './urgency.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'intakes.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS keywords (
    id          TEXT PRIMARY KEY,
    pattern     TEXT NOT NULL,
    level       TEXT NOT NULL CHECK (level IN ('crisis','high','medium')),
    description TEXT NOT NULL DEFAULT '',
    added_at    TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS comment_feedback (
    intake_id    TEXT NOT NULL,
    comment_idx  INTEGER NOT NULL,
    helpful      INTEGER NOT NULL,
    rated_at     TEXT NOT NULL,
    PRIMARY KEY (intake_id, comment_idx)
  );
`);

const stmts = {
  insertKw: db.prepare(`INSERT INTO keywords (id, pattern, level, description, added_at) VALUES (?, ?, ?, ?, ?)`),
  updateKw: db.prepare(`UPDATE keywords SET pattern = ?, level = ?, description = ? WHERE id = ?`),
  deleteKw: db.prepare(`DELETE FROM keywords WHERE id = ?`),
  selKw:    db.prepare(`SELECT * FROM keywords WHERE id = ?`),
  listKw:   db.prepare(`SELECT * FROM keywords ORDER BY added_at ASC`),
  countKw:  db.prepare(`SELECT COUNT(*) AS n FROM keywords`),
  upsertFb: db.prepare(`
    INSERT INTO comment_feedback (intake_id, comment_idx, helpful, rated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(intake_id, comment_idx) DO UPDATE SET
      helpful = excluded.helpful,
      rated_at = excluded.rated_at
  `),
  listFb:   db.prepare(`SELECT * FROM comment_feedback`),
};

const VALID_LEVELS = ['crisis', 'high', 'medium'];

function makeId() {
  return 'kw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function nowIso() {
  return new Date().toISOString();
}

function seedFromUrgency() {
  if (stmts.countKw.get().n > 0) return;
  const seedAt = nowIso();
  const groups = [
    { level: 'crisis', list: CRISIS_PATTERNS },
    { level: 'high', list: HIGH_URGENCY_PATTERNS },
    { level: 'medium', list: MEDIUM_URGENCY_PATTERNS },
  ];
  const insert = db.transaction(() => {
    for (const { level, list } of groups) {
      for (const re of list) {
        stmts.insertKw.run(makeId(), re.source, level, '', seedAt);
      }
    }
  });
  insert();
}
seedFromUrgency();

function compileOrThrow(pattern) {
  try {
    return new RegExp(pattern, 'i');
  } catch (err) {
    throw new Error(`Invalid regex: ${err.message}`);
  }
}

function rowToKeyword(row) {
  return {
    id: row.id,
    pattern: row.pattern,
    level: row.level,
    description: row.description || '',
    addedAt: row.added_at,
  };
}

export function listKeywords() {
  const grouped = { crisis: [], high: [], medium: [] };
  for (const row of stmts.listKw.all()) {
    grouped[row.level].push(rowToKeyword(row));
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
  const entry = {
    id: makeId(),
    pattern: pattern.trim(),
    level,
    description: typeof description === 'string' ? description.trim() : '',
    addedAt: nowIso(),
  };
  stmts.insertKw.run(entry.id, entry.pattern, entry.level, entry.description, entry.addedAt);
  return entry;
}

export function updateKeyword(id, patch) {
  const existing = stmts.selKw.get(id);
  if (!existing) return null;
  const next = rowToKeyword(existing);
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
  stmts.updateKw.run(next.pattern, next.level, next.description, id);
  return next;
}

export function removeKeyword(id) {
  const result = stmts.deleteKw.run(id);
  return result.changes > 0;
}

export function getActivePatterns() {
  const out = { CRISIS: [], HIGH: [], MEDIUM: [] };
  const bucket = { crisis: 'CRISIS', high: 'HIGH', medium: 'MEDIUM' };
  for (const row of stmts.listKw.all()) {
    try {
      out[bucket[row.level]].push(new RegExp(row.pattern, 'i'));
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
  stmts.upsertFb.run(intakeId, commentIdx, helpful ? 1 : 0, ratedAt);
  return { intakeId, commentIdx, helpful, ratedAt };
}

export function getCommentFeedback() {
  return stmts.listFb.all().map((row) => ({
    intakeId: row.intake_id,
    commentIdx: row.comment_idx,
    helpful: row.helpful === 1,
    ratedAt: row.rated_at,
  }));
}
