# Prompt 04 — Design Tokens, Lucide Setup, and Shared Components

You are working in the Hope Connect repo. The backend is fully wired
(prompts 01–03). Now we set up the frontend foundation that the page
prompts (05–08) all share: new CSS tokens, lucide-react, the central
icon module, the API helper, and a small set of shared components.

## Read first

1. `docs/04-design-system.md` ← spec for everything in this prompt
2. `docs/10-conventions.md`
3. `client/src/index.css` — to see what tokens already exist
4. `client/src/App.jsx` — current routing
5. `client/src/components/StatusBadge.jsx` — existing badge component

## Your scope

Set up the design foundation. No page rebuilds yet. Specifically:

1. Install `lucide-react` in `client/`.
2. Append the new CSS tokens from `docs/04-design-system.md` to
   `client/src/index.css`.
3. Add new shared CSS classes (`pill`, `severity-pill-*`, `kpi-tile`,
   `score-ring-track`, `score-ring-fill`, `empty-state`).
4. Create `client/src/lib/icons.js` (single named-export module).
5. Create `client/src/lib/api.js` (fetch wrappers, single source of API
   path strings).
6. Create the new shared components:
   - `client/src/components/HelpScore.jsx`
   - `client/src/components/SeverityPill.jsx`
   - `client/src/components/AICommentList.jsx`
   - `client/src/components/EmptyState.jsx`
   - `client/src/components/ScoreRing.jsx`
7. Extend `client/src/components/StatusBadge.jsx` with a new
   `SeverityBadge` export that takes the new four-level severity
   (crisis/high/medium/low). Keep the legacy `UrgencyBadge` working for
   back-compat with existing intakes that have no `analysis`.

## Install

```bash
npm install --prefix client lucide-react
```

## `client/src/lib/icons.js`

Re-export the named lucide icons listed under "Lucide icons" in
`docs/04-design-system.md`. Nothing more, nothing less. Adding a new icon
to the app means adding it to this file first.

## `client/src/lib/api.js`

A thin fetch wrapper. Centralizes URL construction and response parsing.
Roughly:

```js
const BASE = '';  // same-origin via vite proxy

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export const api = {
  // Intakes
  startIntake:        ()       => request('POST',  '/api/intakes/start'),
  sendMessage:        (id, c)  => request('POST',  `/api/intakes/${id}/message`, { content: c }),
  getIntake:          (id)     => request('GET',   `/api/intakes/${id}`),
  listIntakes:        ()       => request('GET',   '/api/intakes'),
  patchIntake:        (id, p)  => request('PATCH', `/api/intakes/${id}`, p),
  reanalyzeIntake:    (id)     => request('POST',  `/api/intakes/${id}/reanalyze`),

  // Admin (placeholders — endpoints come in prompt 07)
  listKeywords:       ()       => request('GET',   '/api/admin/keywords'),
  addKeyword:         (kw)     => request('POST',  '/api/admin/keywords', kw),
  updateKeyword:      (id, kw) => request('PATCH', `/api/admin/keywords/${id}`, kw),
  deleteKeyword:      (id)     => request('DELETE', `/api/admin/keywords/${id}`),
  listOverrides:      ()       => request('GET',   '/api/admin/overrides'),
  listAIComments:     (q)      => request('GET',   `/api/admin/comments${q ? '?' + new URLSearchParams(q) : ''}`),
  rateComment:        (intakeId, idx, helpful) =>
                                   request('POST', `/api/admin/comments/${intakeId}/${idx}/feedback`, { helpful }),

  // Reports (placeholders — endpoints come in prompt 08)
  reportSummary:      (q)      => request('GET',   `/api/reports/summary${q ? '?' + new URLSearchParams(q) : ''}`),
  reportExportUrl:    (q)      => '/api/reports/export' + (q ? '?' + new URLSearchParams(q) : ''),
};
```

The admin and report wrappers will fail at runtime until prompts 07 / 08
ship — that's fine, they're forward-declared so the page prompts have a
clean import.

## `ScoreRing.jsx`

A reusable circular progress ring. Props:

```jsx
<ScoreRing score={78} size={56} severity="high" />
```

- `size` controls overall diameter (28 / 40 / 56 in the app).
- Track color: `var(--score-track)`.
- Fill color: `var(--score-fill-${severity})` mapping crisis/high/medium/low.
- The number is centered, tabular numerals, weight 700.
- Stroke width scales: 4 for size 28, 5 for size 40, 6 for size 56.
- Implementation: SVG with two circles, the second using
  `stroke-dasharray` and `stroke-dashoffset` derived from `score / 100`.
- Add `aria-label={`Help score ${score} of 100`}` and role `img` on the
  outer SVG.

## `HelpScore.jsx`

Composes `ScoreRing` plus the breakdown popover described in
`docs/07-page-intake-detail.md` ("Help Score card"). Props:

```jsx
<HelpScore analysis={analysis} score={score} variant="card" />
```

Variants:
- `card` — full breakdown view, used on IntakeDetail
- `inline` — just the ring, used in the dashboard table and the detail
  header strip

The breakdown content:

```
Severity band (high)              65
Risk flags (3 active)              9
Urgency window (this_week)         3
Secondary categories (1)           4
─────────────────────────────────
                                  78

Rubric v1.0 · Reproducible from analyzer output
```

Component imports the score constants (`SEVERITY_BAND_BASE`,
`URGENCY_WINDOW_BONUS`, etc.) — but those live in `server/help-score.js`.
Don't reach across the server/client boundary. Instead, this prompt also
creates `client/src/lib/help-score-rubric.js` that mirrors the constants
from `server/help-score.js`. Add a comment at the top: "Mirror of
server/help-score.js — keep these in sync. Both files reference rubric
v1.0."

(Yes, this is duplicative. The right fix later is a shared package or
TypeScript types or just shipping the constants from the server in the
analysis response. For the demo, mirror is fine.)

## `SeverityPill.jsx`

Maps severity level to color tokens and an icon, renders a pill:

```jsx
<SeverityPill level="high" />          // High [AlertTriangle]
<SeverityPill level="crisis" />        // Crisis [ShieldAlert]
<SeverityPill level="medium" />        // Medium [AlertCircle]
<SeverityPill level="low" />           // Low [Check]
```

Use the `--color-sev-*` tokens from `docs/04-design-system.md`. Don't
fall back to `--color-crisis-*` — the new severity scheme is
intentionally a different shade family.

## `AICommentList.jsx`

Renders the `analysis.ai_comments` array. Groups by `type`. Each group
gets an eyebrow label (`CONTEXT`, `FLAG`, `SUGGESTION`, `CLARIFICATION`)
in the field-label style, then a list of comments with a per-type icon.

Props:

```jsx
<AICommentList comments={analysis.ai_comments} onRate={(idx, helpful) => …} />
```

If `onRate` is provided, render a tiny thumbs-up / thumbs-down pair
after each comment. If not, omit the rating UI.

## `EmptyState.jsx`

```jsx
<EmptyState
  icon={ClipboardList}
  title="No intakes yet"
  body="When a client completes intake, they'll show up here."
  action={<button className="btn-secondary" onClick={…}>Reset filters</button>}
/>
```

Centered column, 32-px tertiary-color icon, `--text-md` 600 title,
`--text-sm` secondary body, optional action below.

## `StatusBadge.jsx` extension

The file currently exports `StatusBadge`, `UrgencyBadge`, and `STATUSES`.
Add a `SeverityBadge` export that handles the new four-level severity
(it reuses the same color+icon mapping as `SeverityPill` but with a
slightly different visual treatment if you want — or just re-export
`SeverityPill` from here for convenience). Keep `UrgencyBadge` for legacy.

## `App.jsx` — register the new routes

Add the routes (the page components don't exist yet — wire them as a
"coming soon" placeholder for now):

```jsx
<Route path="/admin" element={<AdminPlaceholder />} />
<Route path="/reports" element={<ReportsPlaceholder />} />
```

Where `AdminPlaceholder` and `ReportsPlaceholder` are inline components
that just render `<EmptyState icon={…} title="Coming soon" body="…" />`.
Prompt 07 and 08 replace these.

Also wire the new nav links in the existing `<nav>`:

```jsx
<Link to="/admin" className={…}>
  <Settings size={16} /> Admin
</Link>
<Link to="/reports" className={…}>
  <BarChart3 size={16} /> Reports
</Link>
```

Prepend a 16-px lucide icon before each existing nav link too:
- New Intake → `MessageSquare`
- Dashboard → `LayoutDashboard`

Add a `gap: 0.4rem` between icon and label. Update `index.css`'s
`nav .nav-link` selector if needed to handle the icon child.

## Acceptance criteria

- `npm run dev` starts cleanly.
- The nav shows icons before each label, including new Admin and Reports
  links that route to placeholder pages.
- `import { Settings } from '../lib/icons'` works from any component.
- `<ScoreRing score={62} size={56} severity="high" />` renders correctly
  in isolation (test by dropping it into IntakeDetail temporarily, then
  reverting).
- `<SeverityPill level="crisis" />` renders pink-magenta with the
  `ShieldAlert` icon.
- The new CSS tokens are present and used by the new components.
- No existing page is visually broken.

## What NOT to do

- Don't redesign IntakeDetail / Dashboard yet — those are prompts 05 / 06.
- Don't build the Admin / Reports pages yet.
- Don't migrate existing inline styles to the new tokens. Existing pages
  stay as they are except the small nav update.
- Don't add a CSS framework. We're staying with vanilla CSS + tokens.
- Don't add storybook or any component playground.

## Done means

The foundation is in place. Every page prompt that follows imports from
`lib/icons.js`, `lib/api.js`, and `components/`. Quinn runs prompt 05 next.
