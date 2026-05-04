# 12 — Intake Page (`IntakeChat.jsx`)

The intake page is a **4-step form-based stepper** that collects client
information, runs the health questionnaire, and submits it for case-manager
review. The old AI-driven chat conversation is now a **side help popover**
rather than the primary flow.

## Steps

| # | ID | Label | What happens |
|---|---|---|---|
| 1 | `welcome` | Welcome | Static intro card. Clicking "I'm ready — let's begin" calls `POST /api/intakes` (raw create, no AI) and advances to step 2. |
| 2 | `contact` | Contact info | Form: first name, last name, phone, email, address, city, ZIP. On Next, PATCHes `clientName`, `contactPreference`, and `structuredAnswers` onto the intake. |
| 3 | `screening` | Health questionnaire | The 17-question Likert screener (see [`11-screening.md`](11-screening.md)). Sections shown via a flat tab-strip. Autosaves to `PUT /api/intakes/:id/screening` on each answer change (400ms debounce). |
| 4 | `review` | Review & submit | Read-only summary of contact info + screening averages. Submit PATCHes `currentStep: 'complete'` then fires `POST /api/intakes/:id/reanalyze` (async, does not block the UI). |

## Left rail stepper

Four items matching the steps above. Uses the existing `.stepper` /
`.stepper-item` / `.stepper-dot` CSS classes. State:
- `pending` — not yet reached
- `active` — current step (green dot with halo)
- `completed` — already passed (filled dot)

The verbose sidebar boxes ("About this intake", screening progress) are hidden
on small viewports via `.sidebar-desktop-only { display: none }`.

## Layout

```
<div class="intake-page">         ← flex-column, height: 100vh - nav
  <div class="layout-split">      ← flex: 1, grid 340px | 1fr
    <aside class="sidebar-panel"> ← left rail
    <div>                         ← right panel, overflowY: auto
  </div>
  <footer class="intake-footer">  ← emergency contact line
</div>
```

`min-width: 769px` on `body` prevents the layout from ever reaching the
768px stacking breakpoint — the browser shows a horizontal scrollbar
instead of collapsing the grid.

## Contact form validation

Validation runs client-side inside `ContactStep` before the PATCH is sent.
Required rules:

| Field(s) | Rule |
|---|---|
| `firstName` | Non-empty |
| `phone` + `email` | At least one must be non-empty |
| `city` + `zip` | At least one must be non-empty |

On failure: the field label turns red and shows an inline "— {message}"
suffix; the input border switches to `border-color: #dc2626` via
`.form-input--error`. Errors clear immediately on any keystroke in the
affected field(s). Server-side save errors (network failures) show as a
paragraph below the form.

## Health questionnaire navigation (step 3)

Four sub-sections rendered as a flat `.tab-strip`:

```
[Mental health]  [Physical health]  [Quality of life]  [General]
```

Completed tabs show a ✓ prefix. Clicking any tab jumps directly to it.
The Back/Next buttons at the bottom walk sub-sections in sequence; Back on
sub-section 0 returns to the Contact step, Next on the last sub-section
advances to Review.

## Submit flow

1. `PUT /api/intakes/:id/screening` — final save of screening answers.
2. `PATCH /api/intakes/:id` — `{ currentStep: 'complete', status: 'submitted' }`.
3. `POST /api/intakes/:id/reanalyze` — fires and is not awaited; the
   submission UI doesn't wait for analysis to finish.
4. Frontend polls `GET /api/intakes/:id` every 2.5 s (up to 50 s) waiting
   for `intake.summary` to appear.

## Help chat (side popover)

A floating button (`chat-fab--left`) in the bottom-left corner opens a chat
popover (`chat-popover--left`). The chat uses `POST /api/intakes/start` and
`POST /api/intakes/:id/message` — the standard AI-driven intake flow — but
as a **separate intake record**, not the form record. It exists purely for
clients who want to ask free-text questions while filling out the form.

The chat FAB lives on the left side so it never overlaps the form's
bottom-right Next/Submit button.

## CSS classes (intake-specific)

| Class | Purpose |
|---|---|
| `.intake-page` | Outer flex-column shell; `height: 100vh - nav`, `overflow: hidden` |
| `.intake-footer` | Emergency contact line pinned below the split layout |
| `.sidebar-desktop-only` | Hidden on `≤768px`; used for sidebar info boxes |
| `.form-input` | Standard text/email/tel/number input styling |
| `.form-input--error` | Red border + red focus ring for validation errors |
| `.form-textarea` | Matches `.form-input` but for `<textarea>` |
| `.chat-fab--left` | Positions the chat FAB at bottom-left instead of bottom-right |
| `.chat-popover--left` | Positions the chat popover at bottom-left |

## Files

- `client/src/pages/IntakeChat.jsx` — entire intake page + sub-components
- `client/src/lib/screening-questions.js` — question definitions
- `client/src/lib/screening-stats.js` — `countAnswered`, `computeSectionAverages`
- `client/src/components/ScaleSelector.jsx` — 1–5 Likert pip selector
- `client/src/index.css` — `.intake-page`, `.intake-footer`, `.form-input*`, responsive rules
