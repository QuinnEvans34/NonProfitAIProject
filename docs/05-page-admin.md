# Admin Page

Path: `/admin`. Audience: Quinn and the case-manager lead. The job of this
page is to make the AI behavior **manageable** — not a final product, but
clean and honest about what's happening under the hood.

## Layout

Two-column on desktop, collapses to single column under 1100px.

```
┌──────────────────────────────────────────── nav ─────────────────┐
│  Admin                                                           │
│  Manage keywords, severity overrides, and AI comments.           │
│                                                                  │
│  ┌─ Tab strip ─────────────────────────────────────────────────┐ │
│  │  • Keywords    • Severity overrides    • AI comments        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │   tab content                                                ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

Use a tab strip (segmented control) at the top so all three panes are
discoverable on one page without forcing a sub-route. Tabs are local React
state. (Sub-routes are nice but overkill for a demo admin page.)

## Tab 1 — Keywords

Manage the regex patterns that drive `server/urgency.js`. The current file
has them hard-coded; expose them through a `GET /api/admin/keywords` and
`POST /api/admin/keywords` endpoint backed by an in-memory list (since the
DB question is on hold, persistence is not required this sprint — but
structure the code so it's a one-line swap to a DB call later).

UI:

```
┌─ Search [Search icon] ────────────────────────────┐  [Plus] Add pattern
└───────────────────────────────────────────────────┘

  CRISIS
  ──────────────────────────────────────────────────
  ▸ \b(suicid|kill\s*(my|him|her|them)?self|...)\b   ⓘ  matched 3 cases   ✎  ✕
  ▸ \b(abuse|abus(ed|ing)|domestic\s*violence|...)\b ⓘ  matched 1 case    ✎  ✕

  HIGH URGENCY
  ──────────────────────────────────────────────────
  ▸ ...

  MEDIUM URGENCY
  ──────────────────────────────────────────────────
  ▸ ...
```

Each row:
- Pattern (monospace text, truncated with ellipsis after 80 chars).
- Match count chip — a pill showing how many existing intakes contain a hit.
- Edit and delete icon buttons.

Add pattern modal:
- Field: regex string (test it on submit; reject invalid patterns).
- Field: severity level select (crisis / high / medium).
- Field: optional human description.
- Submit button: "Add pattern".

Delete: confirm with a small inline "Are you sure? Yes / Cancel" prompt, no
modal needed.

A read-only block at the top of this tab explains the floor rule:

> Patterns are the safety floor. The AI may escalate severity, but cannot
> de-escalate below what these patterns match. Crisis patterns force the
> crisis severity level on any intake they match.

## Tab 2 — Severity overrides

A log of every case where a staff member overrode the AI's severity. The
intake record gets a `severityOverride` field (null by default). When staff
manually change severity on the IntakeDetail page, store the override + a
required reason, and surface those entries here.

UI:

```
┌──────────────────────────────────────────────────────────────────┐
│  Showing 7 overrides this week                                    │
│  ┌─ Staff filter ──┐  ┌─ Direction ────┐  ┌─ Time range ──┐       │
│  │ All staff      ▾│  │ Escalations   ▾│  │ Last 30 days ▾│       │
│  └─────────────────┘  └────────────────┘  └────────────────┘       │
└──────────────────────────────────────────────────────────────────┘

  ── Today
  Maria Garcia  →  AI medium  →  override high
  "Eviction notice was actually served, not just received in the mail."
  Apr 25, 2026 11:42 AM by quinn      [View intake →]

  Anonymous     →  AI high    →  override crisis
  "Mention of self-harm in follow-up call, not in intake."
  Apr 25, 2026 09:18 AM by t.singh     [View intake →]
```

Each entry: client name (or "Anonymous" if not provided), arrow showing the
direction of the override, the staff-provided reason, timestamp + author,
link to the intake.

This pane is read-only on this tab. The actual override action happens on
the IntakeDetail page; this is the audit log.

Empty state: a `Lightbulb` icon + "No overrides yet — staff have agreed with
the AI's severity calls so far."

## Tab 3 — AI comments

A cross-intake feed of every `ai_comments[]` item the analyzer has generated.
Use this to spot-check quality, find patterns, and build intuition for how
the prompt is performing.

UI:

```
┌─────────────────── filter strip ─────────────────────────────────┐
│ ┌ Type ─┐ ┌ Severity ─┐ ┌ Category ─┐ ┌ Search comments [_____] ┐ │
│ │ All  ▾│ │ All       ▾│ │ All      ▾│ │                        │ │
│ └──────┘  └────────────┘ └────────────┘ └────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

  ▸ [icon] flag        Maria Garcia · Food · medium severity
    "Client mentioned a child with asthma — flag for healthcare follow-up."
    Apr 25, 2026 · [View intake →]

  ▸ [icon] suggestion  James Thompson · Housing · high severity
    "Verify the eviction notice in writing before recommending Legal Aid."
    Apr 25, 2026 · [View intake →]
```

Type icons:
- `context` → `Info` icon, color `--color-text-secondary`
- `flag` → `AlertTriangle` icon, color `--color-sev-medium-text`
- `suggestion` → `Lightbulb` icon, color `--color-brand`
- `clarification` → `HelpCircle` icon, color `--color-text-tertiary`

A small "Helpful?" thumbs-up/thumbs-down on each comment. Persist clicks to
a simple in-memory feedback list (we'll use it later when tuning the prompt).

## Page-level header

```
┌── Settings icon  Admin ───────────────────────────────────────────┐
│   Manage keywords, severity overrides, and AI comments.           │
└───────────────────────────────────────────────────────────────────┘
```

Settings icon + page title + subtitle. Same header treatment as Reports so
the two pages feel like a pair.

## API endpoints (new in `server/routes/admin.js`)

- `GET  /api/admin/keywords` — list patterns grouped by level.
- `POST /api/admin/keywords` — add a pattern. Body: `{ pattern, level, description }`.
- `PATCH /api/admin/keywords/:id` — edit.
- `DELETE /api/admin/keywords/:id`.
- `GET  /api/admin/overrides` — list severity overrides across all intakes,
  joined with intake metadata.
- `GET  /api/admin/comments` — list every AI comment across intakes, joined
  with intake metadata; supports `?type=`, `?severity=`, `?category=`, `?q=`.
- `POST /api/admin/comments/:intakeId/:idx/feedback` — body: `{ helpful: boolean }`.

Admin endpoints don't require auth this sprint but live under `/api/admin/*`
so they're easy to gate later.

## Empty states

Each tab has its own empty state. Don't show a generic "no data" string.

- Keywords: never empty in practice (we seed from `urgency.js`), but if it
  somehow is: `Lightbulb` + "No patterns loaded — check server logs."
- Severity overrides: described above.
- AI comments: `MessageSquare` + "No analyses have run yet — complete an
  intake to populate this feed."

## Visual reference

Header strip uses the page padding from `04-design-system.md`. Tab strip is
a horizontal segmented control with a 1-px bottom border. Inside the tab, a
single `card` per logical group (no nested cards).
