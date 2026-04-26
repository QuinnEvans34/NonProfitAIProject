# Prompt 07 — Build the Admin Page

You are working in the Hope Connect repo. Backend analyzer is wired
(01–03), frontend foundation set up (04), detail and dashboard polished
(05–06). Now build the Admin page — Quinn's slice for managing keywords,
severity overrides, and AI comments.

## Read first

1. `docs/05-page-admin.md` ← the spec
2. `docs/04-design-system.md`
3. `docs/02-analyzer.md` — to know what `ai_comments[]` looks like
4. `server/urgency.js` — the regex patterns we'll be exposing
5. `server/store.js` — the intake fields we'll be reading from
6. `client/src/lib/api.js`, `client/src/lib/icons.js`
7. The new shared components from prompt 04

## Your scope

Two parallel pieces:

### Backend — `server/routes/admin.js` + an in-memory keyword store

Create:

```
server/
├── admin-store.js          # NEW — in-memory keyword + feedback storage
└── routes/
    └── admin.js            # NEW — /api/admin/* routes
```

Wire `admin.js` into `server/index.js` (`app.use('/api/admin', adminRoutes)`).

#### `server/admin-store.js`

In-memory storage for two things:

1. **Editable keyword patterns.** Seed on module load from the existing
   constant arrays in `server/urgency.js` (`CRISIS_PATTERNS`,
   `HIGH_URGENCY_PATTERNS`, `MEDIUM_URGENCY_PATTERNS`). Each entry:
   `{ id, pattern: string, level: 'crisis'|'high'|'medium', description?: string, addedAt }`.

2. **AI comment feedback.** A list of
   `{ intakeId, commentIdx, helpful: boolean, ratedAt }`.

Export functions:

```js
export function listKeywords();             // grouped: { crisis: [...], high: [...], medium: [...] }
export function addKeyword({ pattern, level, description });
export function updateKeyword(id, patch);
export function removeKeyword(id);
export function getActivePatterns();        // returns { CRISIS: RegExp[], HIGH: RegExp[], MEDIUM: RegExp[] }
export function rateComment({ intakeId, commentIdx, helpful });
export function getCommentFeedback();
```

`getActivePatterns()` is the API the runtime urgency detector should
eventually call. **Don't change `urgency.js` to read from this yet** —
that's a future swap. For now, the admin store is a parallel surface
that the admin page reads/writes; it doesn't influence live detection.
Document this in the file's top-comment so we don't forget.

#### `server/routes/admin.js`

Endpoints exactly as listed in `docs/05-page-admin.md`:

- `GET    /api/admin/keywords`
- `POST   /api/admin/keywords`         body `{ pattern, level, description? }`
- `PATCH  /api/admin/keywords/:id`     body `{ pattern?, level?, description? }`
- `DELETE /api/admin/keywords/:id`
- `GET    /api/admin/overrides`        joins `severityOverride` records across all intakes from `server/store.js`
- `GET    /api/admin/comments`         supports `?type=&severity=&category=&q=`
- `POST   /api/admin/comments/:intakeId/:idx/feedback`  body `{ helpful: boolean }`

Validation:
- Reject invalid regex on POST/PATCH (`new RegExp(pattern)` in try/catch).
- Reject `level` not in `['crisis','high','medium']`.
- Return `{ error: '...' }` with status 400 on validation errors.

For `/api/admin/comments`, build the response by walking every intake
in the store and flattening its `analysis.ai_comments` array into:

```js
{
  intakeId, commentIdx, type, text,
  client: { name, category, severity },
  createdAt: intake.updatedAt,
  feedback: getCommentFeedback().filter(...),  // 0 or 1 entries
}
```

Sort newest first.

For `/api/admin/overrides`, walk every intake where
`severityOverride !== null`, and return:

```js
{
  intakeId, clientName, aiSeverity, overrideSeverity,
  reason, ratedAt: intake.updatedAt, by: 'staff'  // we don't track author yet
}
```

### Frontend — `client/src/pages/Admin.jsx`

Replace the placeholder route from prompt 04 with the real page.

Layout: page header (icon + title + subtitle), then a tab strip
(`Keywords`, `Severity overrides`, `AI comments`), then the active tab
content. Tabs are local state, no sub-routes.

Tab strip styling: a horizontal segmented control. Active tab has the
brand-colored bottom border, inactive tabs are tertiary text. Same
treatment as the existing nav links. Add a tab strip class to
`index.css` so we can reuse it.

#### Keywords tab

Header row: a `Search` input and a primary `[Plus] Add pattern` button
that opens an inline form (not a modal — keep it on the page) above the
list. Cancel button closes the form without submitting.

Below: three `<section className="card">` blocks, one per level
(CRISIS / HIGH URGENCY / MEDIUM URGENCY). Each card has a row per
pattern with:

- Pattern in monospace, truncated with title attribute on hover for
  full text.
- Match count chip — count of intakes whose `transcript` contains a
  message matching this pattern. Compute server-side in the
  `/api/admin/keywords` response (add a `matchCount` field per entry).
- Edit button (`Edit3` icon) — clicking flips the row to edit mode
  inline. Save / Cancel.
- Delete button (`Trash2` icon) — clicking shows an inline "Are you
  sure? Yes / Cancel" prompt.

Above the cards, a static info banner explaining the floor rule (verbatim
from `docs/05-page-admin.md`).

#### Severity overrides tab

Filter strip at the top: staff filter, direction filter, time range.
For Sprint 1 staff filter just has "All staff" since we don't track
authors. Direction has Escalations / De-escalations / All. Time range
matches the Reports page (Last 7 / 30 / 90 days, etc.).

Below: a list grouped by date (Today, Yesterday, This week, Earlier).
Each entry per the spec. Each row has a "View intake" link.

Empty state: `Lightbulb` + spec copy.

#### AI comments tab

Filter strip at the top: type, severity, category, search. Use native
`<select>`s for the dropdowns and a debounced text `<input>` for search.

Below: a list of comments. Each row:

- Type icon (per spec).
- Type label and metadata strip (client name · category · severity).
- Comment text.
- Date · "View intake" link.
- Helpful? thumbs-up / thumbs-down. Active state when feedback exists.

Empty state: `MessageSquare` + spec copy.

## Acceptance criteria

- `/admin` loads and the three tabs all work.
- Adding a keyword posts to the API and appears immediately in the
  matching level card.
- Editing a keyword inline updates the entry.
- Deleting a keyword removes it after confirmation.
- The match count for each keyword reflects how many intakes contain
  it.
- The severity overrides tab lists every intake where a staff member
  set `severityOverride`.
- The AI comments tab can filter by type / severity / category / search,
  and feedback persists across page reloads.
- The page uses only the colors and components from the design system.
- Server has no auth on these endpoints (matches existing demo posture)
  but they all live under `/api/admin/*` so they're easy to gate later.

## What NOT to do

- Don't change `server/urgency.js`. The admin keyword store is a parallel
  surface for now.
- Don't add user accounts, RBAC, or any auth. Document the gap in code
  comments.
- Don't pull a table library. Vanilla `<table>` is fine.
- Don't try to test regex patterns against historical intakes server-side
  beyond a simple `match` check. No JIT-recompiling the floor.

## Done means

Quinn can demo the Admin page: add a keyword, watch its match count
update, see severity overrides logged, and skim AI comments across all
intakes. Looks clean, works.
