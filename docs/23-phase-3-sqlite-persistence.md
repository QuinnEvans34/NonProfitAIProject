# 23 — Phase 3: SQLite Persistence

## Goal

Replace the in-memory `Map()`-backed stores (`server/store.js` and `server/admin-store.js`) with a `better-sqlite3` backed implementation that persists across server restarts. Keep the exported function signatures identical so no caller needs to change.

The database file lives at `server/data/intakes.db` and is git-ignored. The seed script in Phase 4 will populate it on demand.

Time estimate: 30–45 minutes.

## Hard rule — DO NOT TOUCH THE INTAKE

This phase touches persistence only. Do not change any of the following:

- `client/src/pages/IntakeChat.jsx` — the form does not need to know about the storage backend
- `client/src/lib/screening-questions.js`
- `server/screening-questions.js`
- `server/intake-flow.js`
- `server/prompts.js`
- The popover chat

The `store.js` API (`create`, `getAll`, `getById`, `update`, plus the helpers added in Phase 2) must keep the same function signatures and return shapes. If a caller imports `store.update(id, patch)` today, it must work identically after this phase.

## Files to read first

- `server/store.js` — current Map-backed implementation
- `server/admin-store.js` — current Map + array implementation
- `server/seed.js` — calls `store.create()`; needs to keep working
- `server/index.js` — calls `seedIfEmpty()`
- `server/screening-questions.js` and `server/screening-stats.js` — imported by `store.js`
- `.gitignore` — current contents (likely just `node_modules`)
- `server/package.json`

## Files to modify

- `server/package.json` — add `better-sqlite3` dependency
- `server/store.js` — rewrite to use SQLite while preserving exports
- `server/admin-store.js` — rewrite to use SQLite while preserving exports
- `.gitignore` — add `server/data/*.db` and journal files

## Files to create

- `server/data/.gitkeep` — empty file so the directory exists in git but the DB itself is ignored

## Background

Today's `store.js`:

```js
const intakes = new Map();

export function create(overrides) { /* puts into Map */ }
export function getAll()          { /* sorts Map values */ }
export function getById(id)       { /* Map.get */ }
export function update(id, patch) { /* mutates + Map.set */ }
```

Today's `admin-store.js`:

- A `Map()` of keyword entries (`{id, pattern, level, description, addedAt}`)
- An array of comment-feedback rows (`{intakeId, commentIdx, helpful, ratedAt}`)
- Seeded from the hardcoded patterns in `server/urgency.js`

Both are wiped on restart. SQLite gives us file-backed persistence with no daemon, no schema migration tool, and a synchronous API (`better-sqlite3`) that matches the existing synchronous call sites.

## Steps

### 1. Add the dependency

In `server/package.json`, add `better-sqlite3` to dependencies:

```json
"dependencies": {
  "better-sqlite3": "^11.5.0",
  "cors": "^2.8.5",
  "express": "^4.21.2",
  "nonprofit-ai-intake": "file:..",
  "zod": "^4.3.6"
}
```

Then install:

```bash
cd server && npm install
```

`better-sqlite3` is a native module; the postinstall step compiles it. On a Mac this works out of the box.

### 2. Add to `.gitignore`

Append to `.gitignore` at the repo root:

```
# SQLite — seeds are code; the DB itself is local-only.
server/data/*.db
server/data/*.db-wal
server/data/*.db-shm
server/data/*.db-journal
```

### 3. Create the data directory placeholder

Create an empty file at `server/data/.gitkeep` so the directory exists in git:

```
(empty file)
```

### 4. Rewrite `server/store.js`

Replace the entire file with the implementation below. Note that the `buildQAPairs`, `buildClientBlock`, and `buildScreeningBlock` helpers from Phase 2 stay in this file — they are pure functions and don't touch storage.

```js
// SQLite-backed intake store. File location: server/data/intakes.db (git-ignored).
// API is intentionally identical to the previous in-memory implementation so
// no callers need to change.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCREENING_SECTIONS, SCREENING_QUESTION_INDEX, formatScaleAnswer } from './screening-questions.js';
import { computeSectionAverages, countAnswered } from './screening-stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'intakes.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS intakes (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    data        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_intakes_created_at ON intakes(created_at DESC);
`);

const stmts = {
  insert: db.prepare(`INSERT INTO intakes (id, created_at, updated_at, data) VALUES (?, ?, ?, ?)`),
  selOne: db.prepare(`SELECT data FROM intakes WHERE id = ?`),
  selAll: db.prepare(`SELECT data FROM intakes ORDER BY datetime(created_at) DESC`),
  update: db.prepare(`UPDATE intakes SET data = ?, updated_at = ? WHERE id = ?`),
  count:  db.prepare(`SELECT COUNT(*) AS n FROM intakes`),
};

function makeId() {
  return 'ink_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function blankIntake() {
  return {
    id: makeId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'new',
    currentStep: null,
    clientName: '',
    contactPreference: '',
    needCategory: '',
    urgencyFlag: 'low',
    crisisFlag: false,
    transcript: [],
    structuredAnswers: {},
    summary: '',
    staffNotes: '',
    qaPairs: [],
    analysis: null,
    helpScore: null,
    severityOverride: null,
    severityOverrideReason: '',
    screeningAnswers: { mental_health: {}, physical_health: {}, quality_of_life: {} },
    screeningComments: { mental_health: '', physical_health: '', quality_of_life: '', general: '' },
    screeningUpdatedAt: null,
    isDemoData: false,
  };
}

// ── Pure helpers (unchanged from Phase 2) ─────────────────────────────────

export function buildQAPairs(intake) {
  // ... keep existing implementation from Phase 2 ...
}

export function buildClientBlock(intake) {
  // ... keep existing implementation from Phase 2 ...
}

export function buildScreeningBlock(intake) {
  // ... keep existing implementation from Phase 2 ...
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export function create(overrides = {}) {
  const intake = { ...blankIntake(), ...overrides };
  intake.id = intake.id || makeId();
  stmts.insert.run(intake.id, intake.createdAt, intake.updatedAt, JSON.stringify(intake));
  return intake;
}

export function getAll() {
  return stmts.selAll.all().map((row) => JSON.parse(row.data));
}

export function getById(id) {
  const row = stmts.selOne.get(id);
  return row ? JSON.parse(row.data) : null;
}

export function update(id, patch) {
  const existing = getById(id);
  if (!existing) return null;
  const updatedAt = new Date().toISOString();
  const merged = { ...existing, ...patch, updatedAt };
  stmts.update.run(JSON.stringify(merged), updatedAt, id);
  return merged;
}

export function isEmpty() {
  return stmts.count.get().n === 0;
}
```

When you implement, do not literally write `// ... keep existing implementation from Phase 2 ...` — copy the actual function bodies from the existing `store.js`. The placeholder above is for spec brevity.

A new `isEmpty()` export is added. The Phase 4 seed script will use it. The current `seed.js` uses `store.getAll().length > 0`; that still works but `isEmpty()` is the more efficient idiom for SQLite.

### 5. Rewrite `server/admin-store.js`

Same approach. Two tables: `keywords` (regex patterns for urgency detection) and `comment_feedback` (thumbs up/down on AI comments).

```js
import Database from 'better-sqlite3';
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
    helpful      INTEGER NOT NULL,  -- 0 or 1
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

function nowIso() { return new Date().toISOString(); }

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
  try { return new RegExp(pattern, 'i'); }
  catch (err) { throw new Error(`Invalid regex: ${err.message}`); }
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
  if (typeof pattern !== 'string' || !pattern.trim()) throw new Error('Pattern is required');
  if (!VALID_LEVELS.includes(level)) throw new Error(`Invalid level: must be one of ${VALID_LEVELS.join(', ')}`);
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
    if (typeof patch.pattern !== 'string' || !patch.pattern.trim()) throw new Error('Pattern is required');
    compileOrThrow(patch.pattern);
    next.pattern = patch.pattern.trim();
  }
  if (patch.level !== undefined) {
    if (!VALID_LEVELS.includes(patch.level)) throw new Error(`Invalid level: must be one of ${VALID_LEVELS.join(', ')}`);
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
    try { out[bucket[row.level]].push(new RegExp(row.pattern, 'i')); }
    catch { /* skip invalid */ }
  }
  return out;
}

export function rateComment({ intakeId, commentIdx, helpful }) {
  if (typeof intakeId !== 'string' || !intakeId) throw new Error('intakeId is required');
  if (!Number.isInteger(commentIdx) || commentIdx < 0) throw new Error('commentIdx must be a non-negative integer');
  if (typeof helpful !== 'boolean') throw new Error('helpful must be a boolean');
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
```

Both `store.js` and `admin-store.js` open the same SQLite file (`intakes.db`). `better-sqlite3` handles concurrent prepared statements within one process via WAL.

### 6. Confirm `server/seed.js` still works

The existing seed script calls `store.create(...)`. Because the new `store.create` has the same signature, the seed should run without modification. Phase 4 will replace the seed contents with richer cases, but Phase 3 should not change the seed file itself.

### 7. Boot the server and confirm persistence

```bash
cd server && npm install
cd ..
npm run dev
```

The server should boot, run `seedIfEmpty()` (which sees the empty DB and creates the two existing demo records), and serve traffic normally.

Then restart the server. The seeded records (and any new intakes) should still be present — proving persistence.

## Acceptance criteria

- `server/package.json` lists `better-sqlite3` as a dependency.
- `npm install --prefix server` completes without errors.
- `.gitignore` excludes `server/data/*.db*` files.
- `server/data/.gitkeep` exists so the directory is tracked.
- `server/store.js` and `server/admin-store.js` use SQLite and expose the same public function names with the same signatures.
- The app boots and the dashboard renders the existing seeded data.
- After restart, all data is still present.
- The eval harness (`npm run eval:analyzer`) still passes.
- No call site of `store.*` or `adminStore.*` needs to be modified.

## Verification steps

1. `rm -rf server/data/intakes.db*` to start clean.
2. `npm run dev` — observe the log line `Seeded 2 demo intakes ...` from `seed.js`.
3. Hit `http://localhost:5173/dashboard` — the two seeds appear.
4. Walk a fresh intake to completion in the browser.
5. `Ctrl-C` the server. Restart with `npm run dev`. The seed log line should NOT appear (DB is no longer empty). The fresh intake from step 4 should still be in the dashboard.
6. Open `server/data/intakes.db` with the `sqlite3` CLI: `sqlite3 server/data/intakes.db "SELECT id, created_at FROM intakes;"` — confirms rows exist.

## Rollback

If something goes wrong:

1. Revert `server/store.js` and `server/admin-store.js` from git.
2. Remove `better-sqlite3` from `server/package.json` and run `npm install --prefix server` to clean up.
3. Delete `server/data/` (and its `.gitkeep`).
4. Restore the original `.gitignore`.

The data lost is only what was in the SQLite file, which is local and easy to re-seed.

## Notes

- `better-sqlite3` is synchronous — no callbacks or promises. This matches the existing call sites perfectly.
- WAL mode (`journal_mode = WAL`) keeps reads non-blocking and writes fast for a single-process server.
- The schema is intentionally simple: one row per intake with the entire intake JSON in a TEXT column. The dashboard already filters / sorts in JS, so SQL-side queries beyond "select all" are unnecessary at this scale.
- If the demo needs to start with a clean DB each boot, the engineer can `rm server/data/intakes.db*` before `npm run dev`. The seed step from Phase 4 will repopulate it.
- For future migration to a stricter schema (separate columns for created_at, severity, etc.), the existing JSON column is forward-compatible — we can add indexed columns as needed without losing data.
