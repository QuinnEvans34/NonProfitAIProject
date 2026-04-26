# Prompt 05 — Redesign IntakeDetail to Surface the Analyzer Output

You are working in the Hope Connect repo. The backend is wired (01–03)
and the frontend foundation is set up (04). Now we rebuild the
case-manager-facing intake detail page to surface every field the
analyzer produces.

## Read first

1. `docs/07-page-intake-detail.md` ← the spec
2. `docs/04-design-system.md`
3. `docs/02-analyzer.md` — for the `AnalysisResult` shape
4. `docs/03-help-score.md`
5. `client/src/pages/IntakeDetail.jsx` — what's there today
6. `client/src/components/HelpScore.jsx`,
   `SeverityPill.jsx`, `AICommentList.jsx`, `ScoreRing.jsx`,
   `EmptyState.jsx` — built in prompt 04
7. `client/src/lib/api.js`, `client/src/lib/icons.js`

## Your scope

Rebuild `client/src/pages/IntakeDetail.jsx` per the spec. The two-column
layout stays. The bones (header strip, transcript, status select, staff
notes, save) stay. Everything else is new.

## Implementation order

Build top to bottom. Render and check after each section:

1. **Header strip with score ring.** Replace the existing pill row with
   the spec's layout: client name on the left, severity + status +
   category pills below the name, score ring (size 56) on the right
   showing `helpScore`, then the created/updated timestamps under the
   ring.
2. **Crisis banner** (existing, keep).
3. **AI Summary card** with the **Re-run analysis** button. Wire to
   `api.reanalyzeIntake(id)` from `lib/api.js`. While re-running, show
   the existing `.typing-dots` indicator inside the card and disable the
   button. On success, refetch the intake and replace state.
4. **Help Score card** (the breakdown view). Use `<HelpScore variant="card">`
   from prompt 04 if it accepts the full breakdown, or just render the
   breakdown inline if `HelpScore` is inline-only — match what was built.
5. **Recommended Programs card.** Map each program to a lucide icon via
   the small mapping in `lib/icons.js` (Heart for food, Home for housing,
   etc. — define the mapping if it's not there yet). Empty state:
   `Sparkles` + "No specific programs to recommend yet — see follow-up
   questions below for what to ask first."
6. **AI Comments card** using `<AICommentList comments={analysis.ai_comments}
   onRate={…} />`. Wire `onRate` to `api.rateComment(intakeId, idx,
   helpful)`.
7. **Follow-up Questions card.** Ordered list. Add a "Copy questions"
   icon-button (lucide `ClipboardList`) at the top right that copies
   the joined list to clipboard. Show a small "Copied" toast for 1.5s.
8. **Client's Own Words card.** Render the full `qaPairs` list (each
   pair as a Q/A block with the eyebrow-style label for the question).
   If `qaPairs` is empty, fall back to the legacy
   `structuredAnswers.situationSummary`.
9. **Conversation Transcript card** (existing, keep).
10. **Side rail — Case Information** (existing, keep).
11. **Side rail — Severity Override card** (new). Read the analyzer's
    severity from `analysis.severity.level` and the current effective
    severity from `intake.severityOverride || analysis.severity.level`.
    Select control with options `Use AI's call`, `Crisis`, `High`,
    `Medium`, `Low`. Reason textarea is required if the override is
    not "Use AI's call". Save calls `api.patchIntake(id, {
    severityOverride: <value or null>, severityOverrideReason: <text> })`.
    On save, show "Saved" inline for 2s, then refetch.
12. **Side rail — Risk Flags card** (new). 2-column grid of the eight
    flags from `analysis.risk_flags`. Active ones use the severity-color
    treatment and a small `Check` icon. Inactive ones use
    `--color-text-muted` and a small `Minus` icon.
13. **Side rail — Tags & Keywords card** (new). Tags as pills (using
    the `pill` styles from prompt 04). Keywords as quoted strings,
    comma-separated.
14. **Side rail — Staff Actions card** (existing, keep).
15. **Side rail — Analysis Meta card** (new). Single tiny line:
    `qwen3:30b · ollama · 8.4s · schema 1.0`. Use `--text-xs` and
    `--color-text-tertiary`. Show only if `analysis?.model_meta` exists.

## Legacy compatibility

If `intake.analysis` is null (legacy intake from `seed.js` or pre-rollout):

- Show the AI Summary card with a warning banner: "Analysis pending —
  this intake was completed before the analyzer rolled out. Click Re-run
  analysis." Keep the Re-run button enabled.
- Hide the Help Score card, Recommended Programs card, AI Comments card,
  Follow-up Questions card, Risk Flags card, Tags & Keywords card,
  Severity Override card (because there's nothing to override against),
  and Analysis Meta card.
- Show the Client's Own Words card with the legacy
  `structuredAnswers.situationSummary` only.

## Mobile (<768px)

Side rail collapses below the main column. The header strip stacks:
title row, then a row of pills, then the score ring on its own row.

## Acceptance criteria

- A completed intake (one that ran through the new analyzer) shows
  every section populated.
- A legacy intake (from `seed.js`) shows the warning banner and the
  Re-run button works to upgrade it.
- Re-run analysis: spinner appears, then the page repopulates with the
  new analysis when done.
- Severity override saves and persists across page reloads.
- AI comment thumbs-up/down posts to the rating endpoint without page
  reload (optimistic update is fine; revert on error).
- All icons come from `lib/icons.js`. No direct `lucide-react` imports
  in this file.
- All colors come from CSS variables. No hex literals in JSX.
- Component renders in <100ms on the demo machine.

## What NOT to do

- Don't change the Conversation Transcript layout. The existing
  `ChatMessage` component is good as-is.
- Don't rebuild the existing status select / staff notes — only add the
  Severity Override card alongside.
- Don't add edit-in-place for `clientName`, `contactPreference`,
  `needCategory`. Those are owned by the intake flow.
- Don't add a print stylesheet, an export-to-PDF button, or a "share
  this case" feature. Out of scope.

## Done means

The case manager opens an intake detail and sees a complete, navigable,
visually clean review surface that shows everything the analyzer
produced. The legacy fallback works. The override flow works.
