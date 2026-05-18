# Architecture

## What we're adding

A single backend module that turns intake Q/A pairs into a structured
analysis JSON, plus a provider abstraction so the LLM call can target Ollama
locally (today) and any hosted provider later (tomorrow).

```
client (React)
    ↓
intake-flow.js  →  on completion  →  analyzer.analyzeIntake(qaPairs, ruleSignals)
                                          ↓
                                     server/llm/analyzer.js
                                          ↓
                                     provider (ollama | azure | bedrock | …)
                                          ↓
                                     validate against schema (zod)
                                          ↓
                                     return AnalysisResult
                                          ↓
                                     persist on the intake record
```

`qaPairs` are now built from two sources, both stitched together by
`buildQAPairs(intake)` in `server/store.js`:

1. The five chat-derived pairs from the existing intake-flow steps.
2. The screening questionnaire — one Q/A per answered question (1–5 Likert
   across 3 sections, 17 questions total) plus one synthetic Q/A per
   answered section summarizing the average. See
   [`11-screening.md`](11-screening.md).

## Backend file layout (new + modified)

```
server/
├── index.js              # unchanged
├── store.js              # extend the intake record fields, no DB change
├── prompts.js            # KEEP — used by the conversational chatReply
├── ollama.js             # KEEP — used by the conversational chatReply
├── intake-flow.js        # MODIFY — call analyzer at completion
├── urgency.js            # KEEP — regex floor for crisis detection
├── help-score.js         # NEW — pure deterministic score function
├── screening-questions.js  # NEW — 17-question screener (server copy of client constants)
├── screening-stats.js      # NEW — section averages + answered counts
├── llm/                  # NEW — everything analyzer-related lives here
│   ├── analyzer.js       # public: analyzeIntake(qaPairs, ruleSignals)
│   ├── schema.js         # zod schema + types for AnalysisResult
│   ├── prompts/
│   │   └── analyzer.md   # the analyzer prompt template
│   ├── providers/
│   │   ├── index.js      # picks provider from LLM_PROVIDER env var
│   │   ├── ollama.js     # local Ollama JSON-mode call
│   │   └── azure.js      # placeholder + interface for the hosted provider
│   └── eval/
│       ├── fixtures/     # golden-set Q/A inputs + expected outputs
│       └── run.js        # `npm run eval:analyzer`
└── routes/
    ├── intake.js         # MODIFY — expose POST /:id/reanalyze
    └── chat.js           # unchanged
```

## Frontend file layout (new + modified)

```
client/src/
├── App.jsx               # MODIFY — add /admin and /reports routes
├── pages/
│   ├── IntakeChat.jsx    # MODIFY — 4-step form stepper replacing chat-driven flow
│   ├── Dashboard.jsx     # MODIFY — add help score column, lucide icons
│   ├── IntakeDetail.jsx  # MODIFY — render new analysis fields
│   ├── Admin.jsx         # NEW
│   └── Reports.jsx       # NEW
├── components/
│   ├── ChatMessage.jsx   # unchanged
│   ├── StatusBadge.jsx   # MODIFY — add SeverityBadge + HelpScore
│   ├── HelpScore.jsx     # NEW — circular score widget with tooltip
│   ├── SeverityPill.jsx  # NEW — analyzer-driven severity (vs urgency rule)
│   ├── AICommentList.jsx # NEW — bullet list with kind-tagged icons
│   └── EmptyState.jsx    # NEW — reusable empty state (lucide icon + copy)
└── lib/
    ├── api.js            # NEW — fetch wrappers, single source of API paths
    └── icons.js          # NEW — single re-export for lucide icons we use
```

## Why a `lib/` folder

Right now every page does its own `fetch('/api/...')` and inlines styles
everywhere. A small `lib/api.js` keeps URL strings in one place; `lib/icons.js`
keeps the lucide tree-shaking import surface predictable so we don't end up
with 50 different lucide imports scattered across files.

## Data flow on intake completion

The intake page is now a **form-based 4-step stepper** (see
[`12-page-intake.md`](12-page-intake.md)). The AI chat assistant is a
side popover, not the primary intake mechanism.

1. The client fills out the form (Welcome → Contact → Health Questionnaire →
   Review & Submit).
2. On submit, the frontend PATCHes `currentStep: 'complete'` and status
   `submitted`, then calls `POST /api/intakes/:id/reanalyze` (which runs
   `runAnalyzer`).
3. `runAnalyzer` calls `buildQAPairs(intake)` to assemble the Q/A list from
   structured fields + screening answers, then calls
   `analyzer.analyzeIntake(qaPairs, ruleSignals)`:
   - `qaPairs` comes from `clientName`, `contactPreference`, and the 17
     screening questions (see [`11-screening.md`](11-screening.md)).
   - `ruleSignals` is `assessTranscript(intake.transcript)` — the regex
     floor. For form-only intakes the transcript is empty, so `ruleSignals`
     contributes no triggers; the LLM verdict is used as-is.
4. The analyzer hits the configured provider (Ollama by default), parses the
   response as JSON, validates against the zod schema, retries once if
   invalid, then returns a typed `AnalysisResult`.
5. `runAnalyzer` applies the floor rule, computes `helpScore`, and persists
   everything onto the intake record.
6. The frontend polls `GET /api/intakes/:id` every 2.5 s until `summary`
   appears, then shows it on the confirmation screen.

## Persistence shape

The intake record gains an `analysis` object plus a `helpScore` number. Other
fields stay backward-compatible so the existing dashboard keeps working
during the transition.

```jsonc
{
  // existing fields kept
  "id": "ink_…",
  "createdAt": "…",
  "updatedAt": "…",
  "status": "submitted",
  "currentStep": "complete",
  "clientName": "…",
  "contactPreference": "…",
  "needCategory": "…",
  "urgencyFlag": "high",        // kept; reflects the floor (max of regex+LLM)
  "crisisFlag": false,
  "transcript": [ … ],
  "structuredAnswers": { … },
  "summary": "…",                // kept; mirrors analysis.summary.staff_facing
  "staffNotes": "",

  // new fields
  "qaPairs": [                   // canonical Q/A list the analyzer sees
    { "question": "What is your first name?", "answer": "Maria" },
    { "question": "How would you like us to reach you?", "answer": "phone" },
    { "question": "What kind of help do you need?", "answer": "food" },
    { "question": "Is this urgent?", "answer": "yeah we have nothing tonight" },
    { "question": "Tell me about your situation.", "answer": "lost job last month…" }
  ],
  "analysis": { … AnalysisResult … },
  "helpScore": 78,
  "severityOverride": null,      // staff override; null = use analyzer.severity.level
  "severityOverrideReason": ""
}
```

## Provider interface

Every provider exports one async function with the same signature:

```js
// server/llm/providers/ollama.js
export async function generateAnalysis({ systemPrompt, userPrompt, jsonSchema }) {
  // returns the raw JSON string from the model
}
```

`analyzer.js` is the only caller and it's the only place that does:
- prompt assembly
- JSON parsing
- schema validation
- retry on validation failure
- floor enforcement

So providers stay dumb — they're just transports. Swapping them is a one-file
change.

## Regex floor rule (severity safety net)

After the analyzer returns:

```js
const ranks = { low: 0, medium: 1, high: 2, crisis: 3 };
const ruleLevel = ruleSignals.crisisFlag ? 'crisis' : ruleSignals.urgencyFlag;
const floored = ranks[analysis.severity.level] >= ranks[ruleLevel]
  ? analysis.severity.level
  : ruleLevel;
analysis.severity.level = floored;
analysis.severity.signals = [
  ...analysis.severity.signals,
  ...ruleSignals.triggers,                 // surface what the regex flagged
];
```

The LLM may escalate (e.g., model decides this is crisis even if regex
didn't). It cannot de-escalate (regex says crisis, model can't downgrade it).

## Re-analysis endpoint

`POST /api/intakes/:id/reanalyze` — staff-triggered. Re-runs `analyzeIntake`
on the stored `qaPairs` and overwrites `analysis` + `helpScore`. The original
analyzer call is async on intake completion; this endpoint is synchronous and
returns the new analysis directly. Used by the "Re-run analysis" button on
the detail page.

## Failure modes and fallbacks

| Failure | Behavior |
|---|---|
| Provider unreachable | `analysis = null`, `summary` set to a clear "AI unavailable" string, urgencyFlag still set from regex. Submission completes. |
| Provider returns invalid JSON | Retry once with the validation error appended to the prompt. If still invalid, fall back as above. |
| Provider returns schema-valid but partial data | Take what's there, fill missing optional fields with sensible defaults, log to console. |
| Severity floor disagrees with LLM | Apply floor silently. Surface both in `severity.signals` so staff see what fired. |
