# 11 — Screening Questionnaire

A 17-question 1–5 Likert screener presented as **step 3 of the intake form**
(see [`12-page-intake.md`](12-page-intake.md)). Answers persist to the intake
record, are fed to the analyzer LLM as Q/A context, and surface on the staff
detail page under a "Screening overview" card.

## Sections and questions

Three sections, 17 questions total. Question text is verbatim and lives in
two source files (see [Dual-copy rule](#dual-copy-rule) below):

- **Mental health** (5 questions, ids `mh_1`..`mh_5`)
- **Physical health** (5 questions, ids `ph_1`..`ph_5`)
- **Quality of life** (7 questions, ids `qol_1`..`qol_7`)

Each question has `lowLabel` (anchor for value 1) and `highLabel` (anchor for
value 5). The full list is in
[`client/src/lib/screening-questions.js`](../client/src/lib/screening-questions.js)
and its server twin
[`server/screening-questions.js`](../server/screening-questions.js).

## Polarity caveat

Some questions are **negatively worded** (higher value = worse outcome) and
others **positively worded** (higher value = better outcome). For example:

- `mh_4` "How often do you feel lonely or isolated?" — higher = worse.
- `qol_1` "How satisfied are you with your overall quality of life?" — higher
  = better.

Section averages are computed as **raw means** of answered questions in the
section. We do not normalize polarity. This is intentional: the report
expansion panel shows each question's full text alongside the user's answer
so staff can interpret correctly. Do **not** treat cross-section average
comparisons as meaningful without consulting the per-question text.

If you want polarity-aware aggregates in the future, add a `direction:
'positive' | 'negative'` field per question and a `computeNormalizedAverages`
helper next to `computeSectionAverages`.

## Data model

`blankIntake()` in [`server/store.js`](../server/store.js) initializes:

```js
screeningAnswers: { mental_health: {}, physical_health: {}, quality_of_life: {} },
screeningUpdatedAt: null,
```

Each section sub-object is keyed by `questionId` with integer values 1–5.
Unanswered questions are simply absent.

## Endpoint

```
PUT /api/intakes/:id/screening
Body: { screeningAnswers: { mental_health: { mh_1: 4, ... }, ... } }
```

Idempotent — the body is the **complete** screening state; the server
overwrites. Validation:

- 404 if intake does not exist.
- 400 if `intake.currentStep === 'complete'` AND `intake.analysis` is set.
  This locks edits once the analyzer has finished, keeping `qaPairs` stable.
- 400 if any value is not an integer 1–5.
- 400 if any section id or question id is unknown.

The server lives in
[`server/routes/intake.js`](../server/routes/intake.js); validation uses
`SCREENING_QUESTION_INDEX` from `server/screening-questions.js`.

The frontend auto-saves with a 400ms debounce after each pip click via
`handleAnswerChange` in `IntakeChat.jsx`. A final explicit save is sent on
form submission before the intake is marked complete.

## Analyzer integration

`buildQAPairs(intake)` in `server/store.js` appends to the existing 5
chat-derived pairs:

1. One Q/A per **answered** screening question, deterministic order
   (section then question id):
   ```
   Q: 'Mental health screening — Over the past two weeks, how often have you felt little interest or pleasure in doing things? (1 = Not at all, 5 = Nearly every day)'
   A: '4 of 5 (closer to "Nearly every day")'
   ```
2. One synthetic Q/A per section with at least one answer, summarizing the
   section average:
   ```
   Q: 'Mental health screening — section average'
   A: '3.4 of 5 across 5 answered questions'
   ```

`runAnalyzer` in `server/intake-flow.js` already calls `buildQAPairs` at
completion and on re-run, so screening flows into the analyzer LLM with no
edits to `analyzer.js` or its prompt.

`formatScaleAnswer(value, lowLabel, highLabel)` in
`server/screening-questions.js` produces the answer strings.

## What screening does NOT affect

- **Help score.** The deterministic rubric in
  [`server/help-score.js`](../server/help-score.js) reads only from
  `analysis.severity`. Screening influences the LLM's severity assessment
  but not the scoring math.
- **Rule-based urgency.** `assessTranscript` in
  [`server/urgency.js`](../server/urgency.js) scans text for crisis keywords;
  numeric scale answers without surrounding text are not fed to it.

## Report rendering

[`client/src/pages/IntakeDetail.jsx`](../client/src/pages/IntakeDetail.jsx)
renders the `ScreeningOverviewCard` between **AI Summary** and **Help Score**.

- Card header: "Screening overview" + "12 of 17 answered" right-aligned.
- Polarity caveat in muted small text.
- Three rows (one per section): label, average to 1 decimal (or "—" if
  unanswered), `View questions` toggle button.
- Expanded section: each question text + a read-only `ScaleSelector` showing
  the picked pip, or "Not answered" when null.
- Empty state via `<EmptyState>` when no answers exist anywhere.

The screening Q/As also flow into "Client's Own Words" automatically because
that card renders `intake.qaPairs` produced by the analyzer run.

## Dual-copy rule

`screening-questions.js` exists twice — once on the client, once on the
server. The repo has no workspace setup and the convention (per
[10-conventions.md](10-conventions.md)) is to add no extra build steps.

**When you change the question list, edit both files together.** A short
smoke check that exercises the server module (e.g. `node --input-type=module
-e "import('./server/screening-questions.js').then(m =>
console.log(m.ALL_QUESTION_IDS.length))"`) catches the most common drift —
mismatched id counts.

The same dual-copy rule applies to `screening-stats.js`. The two files
should be byte-for-byte identical apart from the import path of
`screening-questions.js`.

## Files

- `client/src/lib/screening-questions.js` — questions + anchors (client)
- `server/screening-questions.js` — questions + anchors + `formatScaleAnswer` (server)
- `client/src/lib/screening-stats.js` — `computeSectionAverages`, `countAnswered`, `isEmpty`
- `server/screening-stats.js` — same helpers, server side
- `client/src/components/ScaleSelector.jsx` — 1–5 pip radio group with keyboard navigation and a `readOnly` snapshot mode
- `client/src/pages/IntakeChat.jsx` — step 3 of the intake form; flat tab-strip section navigation
- `client/src/pages/IntakeDetail.jsx` — `ScreeningOverviewCard` between AI Summary and Help Score
- `server/routes/intake.js` — `PUT /api/intakes/:id/screening`
- `server/store.js` — `blankIntake` shape and `buildQAPairs` extension
