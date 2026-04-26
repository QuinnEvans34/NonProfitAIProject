# Prompt 03 — Wire Analyzer + Help Score Into Intake Flow

You are working in the Hope Connect repo. Prompts 01 and 02 are merged.
The analyzer module exists at `server/llm/`. The help-score function
exists at `server/help-score.js`. Now we replace the legacy
`generateIntakeSummary` call in `intake-flow.js` with a call to the new
analyzer, persist the structured output, and add a re-analyze endpoint.

## Read first

1. `docs/01-architecture.md` — especially the "Data flow on intake
   completion" and "Persistence shape" sections
2. `docs/02-analyzer.md` — for the `AnalysisResult` shape
3. `docs/03-help-score.md` — for what the help score expects to receive
4. `server/intake-flow.js` — the existing flow
5. `server/store.js` — the existing store shape
6. `server/routes/intake.js` — existing intake routes
7. `server/llm/analyzer.js` — what you'll be calling
8. `server/help-score.js` — the new helper

## Your scope

Modify three files:

- `server/store.js` — extend the intake record shape
- `server/intake-flow.js` — replace `generateIntakeSummary` with
  `analyzeIntake` + `computeHelpScore`
- `server/routes/intake.js` — add `POST /api/intakes/:id/reanalyze`

**Do not** touch the database. The store stays in-memory. We're only
extending field shapes.

## `server/store.js` — extend the intake shape

Update `blankIntake()` to include new fields. Existing fields stay
exactly as they are:

```js
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

    // NEW
    qaPairs: [],
    analysis: null,
    helpScore: null,
    severityOverride: null,
    severityOverrideReason: '',
  };
}
```

Add a helper `buildQAPairs(intake)` to `store.js` that produces the
canonical Q/A list from an intake's `clientName`, `contactPreference`,
`needCategory`, the urgency-step user message, and `structuredAnswers.
situationSummary`. Use the canonical question strings from
`docs/02-analyzer.md`:

| Step | Canonical question |
|---|---|
| ask_name | What is your first name? |
| ask_contact | How would you like us to reach you? |
| ask_category | What kind of help do you need? |
| ask_urgency | Is this urgent or are you planning ahead? |
| ask_situation | Tell me about your situation in your own words. |

For `ask_urgency` the answer isn't stored in a single field — pull the
user message that immediately followed the `ask_urgency` step from
`intake.transcript`. (The transcript entries already carry a `step`
field; filter on that.)

Export `buildQAPairs` so `intake-flow.js` and the re-analyze endpoint can
both use it.

## `server/intake-flow.js` — replace summary call

Replace the existing `generateIntakeSummary` function with a new
`runAnalyzer` function. Keep the function name `generateIntakeSummary`
deleted or renamed; we want a clean cut. Then update `processMessage` to
call `runAnalyzer` instead of `generateIntakeSummary` when the intake
completes.

```js
import { analyzeIntake } from './llm/analyzer.js';
import { computeHelpScore } from './help-score.js';
import { buildQAPairs } from './store.js';
import { assessTranscript } from './urgency.js';
// keep the existing imports too
```

The new `runAnalyzer(intakeId)`:

1. Fetch the intake from the store. Bail if missing.
2. Build the `qaPairs` via `buildQAPairs(intake)`. Persist `qaPairs` on
   the intake record so the re-analyze endpoint can replay later.
3. Compute `ruleSignals` via `assessTranscript(intake.transcript)`.
4. Call `analyzeIntake(qaPairs, ruleSignals)`.
5. Compute `helpScore = computeHelpScore(analysis)`.
6. Persist on the intake:
   - `analysis` = the full `AnalysisResult`
   - `helpScore` = the score number (the tooltip uses `analysis` +
     constants from `help-score.js`, so we don't need to also store
     components — they're cheap to recompute)
   - `summary` = `analysis.summary.staff_facing` (back-compat: the existing
     dashboard reads `summary` and we don't want to break it)
   - `urgencyFlag` = `analysis.severity.level` mapped: `crisis → high,
     high → high, medium → medium, low → low` (the legacy field is a
     three-level string; the analyzer adds crisis on top).
   - `crisisFlag` = `analysis.severity.level === 'crisis' || ruleSignals.crisisFlag`
   - `needCategory` = `analysis.classification.primary_category` if it's
     not already set or if the LLM disagrees with the regex-derived value.
     (Specifically: only overwrite if the existing `needCategory` is
     `'Other'` or empty.)
7. Log timing.

Wrap the whole body in try/catch. On failure: write `summary = "AI
analysis unavailable. Please review the transcript and case information
directly."`, leave other new fields as defaults, and `console.error` the
error. Do NOT throw — the intake submission must complete even if the
analyzer is down.

The call site in `processMessage` becomes:

```js
if (isComplete) {
  intake.status = 'submitted';
  runAnalyzer(intake.id).catch((err) =>
    console.error('Analyzer failed for', intake.id, err.message)
  );
}
```

Same fire-and-forget pattern as today.

## `server/routes/intake.js` — re-analyze endpoint

Add `POST /api/intakes/:id/reanalyze`:

- Fetch the intake.
- 404 if missing.
- 400 if `currentStep !== 'complete'` (can't re-analyze something not done).
- Call `runAnalyzer(id)` synchronously (await it).
- Return the updated intake record.

Export `runAnalyzer` from `intake-flow.js` so the route can import it.

## Acceptance criteria

- Completing an intake end-to-end via the existing UI populates
  `analysis`, `helpScore`, `summary` (= analysis.summary.staff_facing),
  and the legacy `urgencyFlag`/`crisisFlag` fields.
- `GET /api/intakes/:id` returns the new fields.
- `POST /api/intakes/:id/reanalyze` re-runs the analyzer and returns the
  updated record. A spurious second call doesn't crash.
- If Ollama is down, the intake still completes, `summary` shows the
  failure note, and no exception bubbles up.
- Severity floor still works: an intake whose transcript contains a
  regex crisis pattern ends up with `analysis.severity.level === 'crisis'`
  and `crisisFlag === true`.
- The two seeded demo intakes from `server/seed.js` still load, even
  though they don't have `analysis` populated. (Legacy compat: if
  `analysis` is null, just don't render the new sections — the UI prompts
  later will handle that.)

## What NOT to do

- Don't change the user-facing chat conversation flow (greeting, name,
  contact, category, urgency, situation, confirm, complete). It stays
  exactly as it is.
- Don't touch `server/prompts.js` or `server/ollama.js` — those are
  used by the conversational chat replies. The analyzer is its own
  thing in `server/llm/`.
- Don't update the dashboard or detail page UI. That's prompts 05 / 06.
- Don't add a database. Quinn's Monday meeting decides that.

## Done means

You can run `npm run dev`, complete a fresh intake, and inspect
`GET /api/intakes/<id>` to see the new structured `analysis` blob and
`helpScore` populated. The re-analyze endpoint works. The seeded demo
intakes still appear on the dashboard.
