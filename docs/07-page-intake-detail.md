# Intake Detail Page — Redesign

Path: `/dashboard/:id`. Audience: case manager doing the review step. The
existing page (`client/src/pages/IntakeDetail.jsx`) has the right bones. We
keep the layout — main column + side rail — and replace the content with
the analyzer's structured output.

## What stays the same

- Two-column layout (`.layout-detail`).
- Crisis banner at top.
- Conversation Transcript card at the bottom of the main column.
- Status select + staff notes textarea + Save button in the side rail.
- Back link to Dashboard.

## What changes

The main column now shows, top to bottom:

1. **Header strip** — client name, severity pill, help-score ring, category pill.
2. **AI Summary card** — staff_facing copy + Re-run analysis button.
3. **Help Score breakdown card** — score, components, "why this score".
4. **Recommended Programs card** — list of programs with reasons.
5. **AI Comments card** — list of comments grouped by type.
6. **Follow-up Questions card** — bullet list for the case manager call.
7. **Client's Own Words card** — kept, but now also shows the full Q/A list.
8. **Conversation Transcript card** — kept.

The side rail gets:

1. **Case Information card** — kept.
2. **Severity Override card** — new; allows staff to override and record reason.
3. **Risk Flags card** — new; the eight booleans, with active flags
   highlighted and inactive flags dimmed.
4. **Tags & Keywords card** — new; the tags and extracted keywords.
5. **Staff Actions card** — kept.
6. **Analysis Meta card** — new; tiny footnote-style card showing model
   name, provider, latency, schema_version. Helps with debugging.

## Header strip

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Dashboard                                                      │
│                                                                  │
│ Maria Garcia                                          [Score 78] │
│ ┌──────┐ ┌──────────┐ ┌────────┐                                │
│ │ HIGH │ │ Submitted│ │ Housing│   Created Apr 25 · Updated 11h │
│ └──────┘ └──────────┘ └────────┘                                │
└──────────────────────────────────────────────────────────────────┘
```

The score ring is right-aligned, 56-px diameter, fill color tied to
severity band.

## AI Summary card

```
┌─ AI Summary ─────────────────── [RefreshCw] Re-run analysis ──┐
│                                                               │
│  Client reports an eviction notice for next week and that      │
│  two children have not eaten regularly in recent days. Client  │
│  lost his job last month. Situation may benefit from urgent    │
│  housing stabilization and food assistance referrals. Should   │
│  be reviewed for child welfare considerations given the food   │
│  insecurity disclosed.                                         │
│                                                               │
│  ⓘ AI-generated. Verify against the transcript below.         │
└───────────────────────────────────────────────────────────────┘
```

Re-run analysis button calls `POST /api/intakes/:id/reanalyze`, sets a
loading state on the card, then refreshes the whole page's data.

## Help Score card

```
┌─ Help Score ─────────────────────────────────────────────────┐
│                                                              │
│   ╭──────╮                                                   │
│   │  78  │   high severity                                   │
│   ╰──────╯   needs attention this week                       │
│                                                              │
│   How this score was computed                                │
│   • Severity band (high)             65                      │
│   • Risk flags (3 active)             9                      │
│   • Urgency window (this_week)        3                      │
│   • Secondary categories (1)          2                      │
│   ───────────────────────────────────────                    │
│                                       78                     │
│                                                              │
│   Rubric v1.0 · Reproducible from analyzer output            │
└──────────────────────────────────────────────────────────────┘
```

This is non-negotiable: if a case manager asks "why is this 78?", the
answer is on screen, not in someone's head.

## Recommended Programs card

```
┌─ Recommended Programs ───────────────────────────────────────┐
│                                                              │
│  [Heart] SNAP                                                │
│   Client reports children are food-insecure; should be       │
│   reviewed for SNAP eligibility.                             │
│                                                              │
│  [Home] Local shelter network                                │
│   Eviction is imminent; staff should connect to short-term   │
│   housing options.                                           │
│                                                              │
│  [Activity] LIHEAP                                           │
│   May benefit from energy assistance to free household       │
│   funds for rent.                                            │
└──────────────────────────────────────────────────────────────┘
```

Pick a lucide icon based on a small mapping in `client/src/lib/icons.js` —
e.g. SNAP/WIC/Food → `Heart`, housing → `Home`, healthcare → `Activity`,
employment → `User`, legal → `FileText`, utilities → `Lightbulb`. Default
fallback is `Sparkles`.

If empty: show empty state — `Sparkles` + "No specific programs to
recommend yet — see follow-up questions below for what to ask first."

## AI Comments card

Group comments by type with a small section header per type. Within each
group, render a list with the type's icon (see design system) and the text.

```
┌─ AI Comments ─────────────────────────────────────────────────┐
│                                                              │
│  CONTEXT                                                     │
│   [Info] Client mentioned the children have not eaten        │
│   properly in recent days; flag for child welfare            │
│   considerations.                                            │
│                                                              │
│  SUGGESTION                                                  │
│   [Lightbulb] Verify the eviction notice in writing before   │
│   recommending Legal Aid referral.                           │
│                                                              │
│  FLAG                                                        │
│   [AlertTriangle] Job ended last month — possible            │
│   Unemployment Insurance eligibility not yet asked about.    │
└──────────────────────────────────────────────────────────────┘
```

Each comment has a tiny "Helpful?" thumbs-up/down (same as on the Admin
AI-comments tab). State persists to the same feedback endpoint.

## Follow-up Questions card

A simple ordered list. Each item is a question. Optional "Copy questions"
button at the top right that copies the list to clipboard, since case
managers prep notes outside the app.

## Client's Own Words card

Already exists for `situationSummary`. Extend to show the full Q/A list:

```
┌─ Client's Own Words ─────────────────────────────────────────┐
│  Q: What kind of help do you need?                           │
│  A: housing                                                  │
│                                                              │
│  Q: Is this urgent?                                          │
│  A: yes, eviction notice for next week                       │
│                                                              │
│  Q: Tell me about your situation.                            │
│  A: got eviction notice, two kids haven't eaten properly...  │
└──────────────────────────────────────────────────────────────┘
```

Question label uses the field-label eyebrow style. Answer is the body.

## Side rail — Severity Override card

```
┌─ Severity Override ──────────────────────────────────────────┐
│  AI assigned: HIGH                                           │
│                                                              │
│  Override level                                              │
│  ┌──────────────────────────┐                                │
│  │ Use AI's call         ▾  │                                │
│  └──────────────────────────┘                                │
│                                                              │
│  Reason for override (required if not "Use AI's call")       │
│  ┌──────────────────────────┐                                │
│  │                          │                                │
│  └──────────────────────────┘                                │
│                                                              │
│  [ ] Save override                                           │
└──────────────────────────────────────────────────────────────┘
```

Saving an override:
- Posts to `PATCH /api/intakes/:id` with `severityOverride` and
  `severityOverrideReason`.
- Surface the override on the Admin "Severity overrides" tab.
- The displayed severity in the header strip switches to the override
  value, with a small badge "(override)" next to it.

## Side rail — Risk Flags card

A 2-column grid of all eight flags. Active flags get the severity color
treatment; inactive flags are dimmed.

```
┌─ Risk Flags ─────────────────────────────────────────────────┐
│  ✓ Eviction imminent       ✓ Food insecurity                 │
│  ✓ Child safety            ─ Self-harm                       │
│  ─ Domestic abuse          ─ Medical emergency               │
│  ─ Substance abuse         ─ Isolation                       │
└──────────────────────────────────────────────────────────────┘
```

## Side rail — Tags & Keywords card

```
┌─ Tags & Keywords ────────────────────────────────────────────┐
│  TAGS                                                        │
│  [Tag] eviction_notice  [Tag] two_minor_children             │
│  [Tag] recent_job_loss  [Tag] food_insecure                  │
│                                                              │
│  KEYWORDS                                                    │
│  "eviction notice"  "next week"  "two kids"                  │
│  "haven't eaten properly"  "in days"  "job ended"            │
└──────────────────────────────────────────────────────────────┘
```

## Side rail — Analysis Meta card

```
┌──────────────────────────────────────────────────────────────┐
│  qwen3:30b · ollama · 8.4s · schema 1.0                      │
└──────────────────────────────────────────────────────────────┘
```

Tiny single-line card, `--text-xs`, color tertiary. This is a debugging
detail more than a UI element.

## Empty / partial states

- Analyzer didn't run yet (still seeing the stale legacy summary): show a
  warning band at the top of the AI Summary card: "Analysis pending — this
  intake was completed before the analyzer rolled out. Click Re-run analysis."
- Analyzer failed: show the failure message (from `summary.staff_facing`)
  and a retry button. Don't hide the rest of the page — the transcript and
  case info are still useful.

## Mobile (<768px)

Side rail collapses below the main column. The header strip stacks: title,
then a row of pills, then the score ring on its own row.

## What we're not doing

- No streaming. Re-run is a one-shot synchronous call.
- No comparison view (old analysis vs new). Just overwrite. Keep history out
  of scope this sprint.
- No transcript scrubbing or message selection. The transcript stays
  read-only.
