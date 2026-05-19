# 22 — Phase 2: Analyzer Prompt Slim & Input Restructure

## Goal

Cut the analyzer's input token count roughly in half by (a) rewriting `prompts/analyzer.md` to a compact form, (b) removing the schema-documentation block from the prompt entirely (Zod validates server-side; Ollama's `format: 'json'` enforces structure), and (c) restructuring how client and screening data are presented to the model — replacing 20+ verbose Q/A lines with two compact, scannable blocks.

This is the single biggest quality and speed improvement available. It addresses the "AI feels off" concern because the model will get well-structured input rather than a wall of synthetic Q/A pairs.

Time estimate: 45–60 minutes including eval harness verification.

## Hard rule — DO NOT TOUCH THE INTAKE

This phase touches only the analyzer pipeline and helper functions in `server/store.js`. Do not change any of the following:

- `client/src/pages/IntakeChat.jsx`
- `client/src/lib/screening-questions.js`
- `server/screening-questions.js` — the questions, IDs, labels, and polarity are company-approved and used both during intake AND by this phase's helpers. Read them, do not modify them.
- `server/intake-flow.js` — only the `runAnalyzer` function at the bottom is editable in this phase (its call signature needs to change). The `STEPS` object, `startIntake`, and `processMessage` are off-limits.
- `server/prompts.js`
- The popover chat behavior

The `buildQAPairs` function in `server/store.js` MUST remain exported and functional because `client/src/pages/IntakeDetail.jsx` renders it in the "Client's Own Words" card. Do not delete `buildQAPairs`; you are **adding** two new exports beside it.

## Files to read first

- `server/llm/prompts/analyzer.md` — current prompt (will be fully replaced)
- `server/llm/analyzer.js` — current analyzer pipeline
- `server/llm/schema.js` — Zod validation (no changes needed, but understand what it accepts)
- `server/store.js` — current `buildQAPairs`
- `server/screening-questions.js` — section IDs, question IDs, polarity hints
- `server/screening-stats.js` — helpers for averages and counts
- `server/intake-flow.js` — find `runAnalyzer` near the bottom; this is where the analyzer is invoked
- `server/llm/eval/fixtures/*.json` — the 10 eval fixtures; the new prompt must keep these passing
- `server/llm/eval/run.js` — eval harness
- `server/llm/providers/ollama.js` — confirms `format: 'json'` is already in use

## Files to modify

- `server/llm/prompts/analyzer.md` — full replacement (text provided below)
- `server/llm/analyzer.js` — drop the `SCHEMA_BLOCK` constant, change the `substitute()` call, change the `analyzeIntake()` signature
- `server/store.js` — add `buildClientBlock` and `buildScreeningBlock` exports (keep `buildQAPairs`)
- `server/intake-flow.js` — update the `runAnalyzer` call site to pass the new arguments (this is the only edit allowed in `intake-flow.js`)

## Background

### Why the prompt is slow

A typical form-based intake produces an analyzer call with roughly this token budget:

| Section | Tokens (approx) |
|---|---|
| System prompt (analyzer.md body) | 700 |
| Schema block (built in `analyzer.js`) | 600 |
| Q/A block (5 chat pairs + 17 screening lines + averages + comments) | 1,000 |
| **Input total** | **~2,300** |
| Expected JSON output | 400–800 |
| **Round trip** | **~2,700–3,100 tokens** |

On `qwen3:30b`, that's a 15–20 second analysis. On `qwen3:8b` (Phase 1), it's still 5–8 seconds — most of it spent processing redundant text.

### What's redundant

1. The schema block lists every field type, regex, min/max. Zod re-validates everything server-side anyway. Ollama is already called with `format: 'json'`, which constrains output to valid JSON. The model does not need the full schema description to produce the correct shape — it needs the names of the categories and severity levels, which are short.

2. The Q/A block formats every screening question as a verbose multi-line Q/A pair, e.g.:
   ```
   Q15: Mental health screening — Over the past two weeks, how often have you
   felt little interest or pleasure in doing things? (1 = Not at all, 5 = Nearly
   every day)
   A15: 4 of 5 (closer to "Nearly every day")
   ```
   The same information fits in one compact line per question.

3. The system prompt restates many rules that are obvious from the schema (e.g., "the primary category must be one of … ", "the JSON parser will reject anything else") — the schema enforces all of it.

## Steps

### 1. Replace `server/llm/prompts/analyzer.md` entirely

Overwrite the file with the following exact content:

```markdown
<!-- Verbatim prompt template for the structured analyzer.
     Placeholders: {{rule_signals_json}}, {{client_block}}, {{screening_block}}.
     The application enforces JSON shape via Zod + Ollama format:'json'. -->
You are an intake-analysis assistant for Hope Connect, a community social services
organization. A client just completed a structured intake. A human case manager
will review your output. You are NOT speaking to the client.

OUTPUT
- Return ONE JSON object matching the response schema. No prose, no markdown fences.
- The application validates the JSON with Zod and rejects anything off-shape.

LANGUAGE & TONE
- Cautious phrasing only: "may benefit from", "should be reviewed for", "reported that".
- Never claim a client qualifies or does not qualify for any program.
- Never give legal, medical, or financial advice.
- If a field is missing, say so plainly. Never invent details.
- Detect the language the client wrote in. Write summary.staff_facing in English.
  Write summary.client_facing in the client's language.

SAFETY FLOOR
The regex pre-scan returned: {{rule_signals_json}}
You MAY escalate severity if you see something the regex missed.
You MAY NOT de-escalate it. If the regex set crisisFlag, severity.level must be "crisis".
If the regex set urgencyFlag="high", severity.level must be at least "high".

CATEGORIES
classification.primary_category must be exactly one of:
Housing, Food, Healthcare, Employment, Legal, Utilities, Other.
classification.secondary_categories: 0–3 from the same list, no duplicate of primary.

SEVERITY
- crisis: immediate danger (self-harm, active abuse, child unsafe, medical
  emergency in progress, no shelter tonight)
- high:   must be addressed within ~7 days (eviction imminent, no food now, no
  insurance with active medical issue, fleeing situation)
- medium: significant hardship without immediate danger (behind on rent,
  recently lost job, can't afford bills)
- low:    planning ahead, general questions, stable situation

URGENCY_WINDOW
One of: today, this_week, this_month, planning.

RECOMMENDED_PROGRAMS
Draw only from this list; set source="hardcoded". If nothing fits, return an empty array.
Do not invent programs.
SNAP, WIC, LIHEAP, Section 8 / Housing Choice Voucher, Medicaid, TANF,
Unemployment Insurance, Local food pantry network, Local shelter network, Legal Aid.
Use source="inferred" only when referencing a category of program without naming a specific one
(e.g., "local diaper bank"). Use source="directory" for verified local programs not in the list above.

AI_COMMENTS (0–6 items)
type=context (background detail), flag (something to watch), suggestion
(concrete staff action), clarification (gap in the intake).

FOLLOW_UP_QUESTIONS (2–5 items)
Plain English, written for the case manager (not the client). Fill obvious gaps.

KEYWORDS_EXTRACTED (5–15 items)
Short verbatim phrases pulled from the client's own words. If the client wrote little,
include phrases from the screening section comments.

HELP_SCORE NOTE
Set severity.score to your own 0–100 sense of need. The application computes the
official help_score deterministically from severity, categories, and risk flags
and overrides anything you produce here. Your score is advisory only.

CLIENT
{{client_block}}

SCREENING (1–5 Likert; polarity varies — read each scale label carefully)
{{screening_block}}

Return JSON now.
```

This template is roughly 350 tokens, compared to the current ~700.

### 2. Update `server/llm/analyzer.js`

Three changes:

**(a)** Delete the entire `SCHEMA_BLOCK` constant (the big template literal that lists every field). It is no longer injected into the prompt.

**(b)** Change the signature of `analyzeIntake` to accept the full intake plus rule signals:

```js
// OLD:
// export async function analyzeIntake(qaPairs, ruleSignals)

// NEW:
export async function analyzeIntake(intake, ruleSignals) {
```

Inside the function, build the two new blocks using the helpers added to `store.js`:

```js
import { buildClientBlock, buildScreeningBlock, buildQAPairs } from '../store.js';
// ...

const clientBlock = buildClientBlock(intake);
const screeningBlock = buildScreeningBlock(intake);

const filled = substitute(PROMPT_TEMPLATE, {
  rule_signals_json: JSON.stringify(ruleSignals),
  client_block: clientBlock,
  screening_block: screeningBlock,
});
```

Drop the `schema_block` key from the `substitute()` call entirely.

**(c)** The `safeFallback` function still calls `extractFallbackKeywords(qaPairs)`. Keep that working — when building the fallback, derive `qaPairs` from the intake:

```js
const qaPairs = buildQAPairs(intake);
return safeFallback({ ruleSignals, providerName, ms, model, lastError, qaPairs });
```

Note: Phase 6 cleans up the fallback copy further. Do not alter `safeFallback`'s behavior in this phase beyond passing the new `qaPairs` it needs.

### 3. Add the two new helpers to `server/store.js`

Add these exports beside `buildQAPairs` (do not remove `buildQAPairs`):

```js
const SECTION_POLARITY = {
  mental_health:   'higher = worse',
  physical_health: 'mixed; read each scale',
  quality_of_life: 'higher = better',
};

export function buildClientBlock(intake) {
  const lines = [];
  const sa = intake.structuredAnswers || {};

  const name = [sa.firstName, sa.lastName].filter(Boolean).join(' ').trim()
            || intake.clientName
            || '(not provided)';
  lines.push(`Name: ${name}`);

  const contactBits = [];
  if (sa.phone) contactBits.push(`phone ${sa.phone}`);
  if (sa.email) contactBits.push(`email ${sa.email}`);
  if (contactBits.length === 0 && intake.contactPreference) {
    contactBits.push(intake.contactPreference);
  }
  lines.push(`Contact: ${contactBits.length ? contactBits.join(', ') : '(not provided)'}`);

  const location = [sa.address, sa.city, sa.zip].filter(Boolean).join(', ');
  lines.push(`Location: ${location || '(not provided)'}`);

  if (intake.needCategory) {
    lines.push(`Stated category: ${intake.needCategory}`);
  }

  if (sa.situationSummary && String(sa.situationSummary).trim()) {
    lines.push(`Stated situation: "${String(sa.situationSummary).trim()}"`);
  }

  return lines.join('\n');
}

export function buildScreeningBlock(intake) {
  const answers = intake.screeningAnswers || {};
  const comments = intake.screeningComments || {};
  const blocks = [];

  for (const section of SCREENING_SECTIONS) {
    const secAnswers = answers[section.id] || {};
    const filledQs = section.questions.filter(
      (q) => Number.isInteger(secAnswers[q.id]) && secAnswers[q.id] >= 1 && secAnswers[q.id] <= 5
    );
    if (filledQs.length === 0) {
      blocks.push(`${section.label}: not answered.`);
      continue;
    }

    const avg = filledQs.reduce((s, q) => s + secAnswers[q.id], 0) / filledQs.length;
    blocks.push(
      `${section.label} (${filledQs.length}/${section.questions.length} answered, ` +
      `raw avg ${avg.toFixed(1)}/5; ${SECTION_POLARITY[section.id] || 'see labels'}):`
    );
    for (const q of section.questions) {
      const v = secAnswers[q.id];
      if (!Number.isInteger(v)) continue;
      blocks.push(`  ${q.id} [${q.lowLabel} → ${q.highLabel}]: ${v}`);
    }
  }

  const commentLines = [];
  for (const section of SCREENING_SECTIONS) {
    const c = (comments[section.id] || '').trim();
    if (c) commentLines.push(`${section.label}: "${c}"`);
  }
  const generalComment = (comments.general || '').trim();
  if (generalComment) commentLines.push(`General: "${generalComment}"`);

  if (commentLines.length) {
    blocks.push('Comments:');
    for (const line of commentLines) blocks.push(`  ${line}`);
  }

  return blocks.join('\n');
}
```

`SCREENING_SECTIONS` is already imported at the top of `store.js`; no new imports needed.

### 4. Update the call site in `server/intake-flow.js`

This is the **only** edit allowed in `intake-flow.js` for this phase. Find `runAnalyzer` near the bottom of the file and change the call to `analyzeIntake`:

```js
// OLD:
// const qaPairs = buildQAPairs(intake);
// const ruleSignals = assessTranscript(intake.transcript);
// const analysis = await analyzeIntake(qaPairs, ruleSignals);

// NEW:
const ruleSignals = assessTranscript(intake.transcript);
const analysis = await analyzeIntake(intake, ruleSignals);
```

The `qaPairs` for the IntakeDetail "Client's Own Words" panel is still computed below in the patch:

```js
const patch = {
  qaPairs: buildQAPairs(intake),   // unchanged — still feeds the dashboard
  analysis,
  helpScore,
  summary: analysis.summary.staff_facing,
  urgencyFlag,
  crisisFlag,
};
```

Keep that line. Do not change anything else in `intake-flow.js`.

### 5. Verify against the eval harness

The repo includes 10 hand-curated fixtures in `server/llm/eval/fixtures/`. They cover the situations the analyzer must classify correctly. Run:

```bash
cd server
npm run eval:analyzer
```

If `LLM_PROVIDER=mock` is set, the eval uses the canned mock fixtures and verifies the harness itself (good sanity check).

If `LLM_PROVIDER=ollama` (default), the eval hits the real model. Expect every fixture to either match or come close — there will be some natural variation but no fixture should regress catastrophically (e.g., crisis becoming low).

If a fixture regresses, the most likely cause is a phrasing tweak in the new prompt that confused the model. Iterate on the prompt before declaring the phase done.

## Acceptance criteria

- `server/llm/prompts/analyzer.md` matches the new template byte-for-byte (or is functionally equivalent after iteration).
- `server/llm/analyzer.js` no longer declares or uses `SCHEMA_BLOCK`.
- `server/llm/analyzer.js`'s `substitute()` call uses `client_block` and `screening_block`, not `qa_pairs_block` or `schema_block`.
- `server/store.js` exports `buildClientBlock` and `buildScreeningBlock` alongside the existing `buildQAPairs`.
- `server/intake-flow.js`'s call to `analyzeIntake` passes `(intake, ruleSignals)`.
- The 10 eval fixtures produce passing outputs (mock and ollama providers both green).
- A live intake's analysis on `qwen3:8b` (Phase 1) completes in roughly 3–6 seconds on a modern laptop.
- The dashboard's "Client's Own Words" card on an existing seeded intake still renders correctly — i.e., `buildQAPairs` was not broken.

## Verification steps

1. `cd server && npm run eval:analyzer` — all 10 fixtures should pass.
2. With the dev server running, hit `POST /api/intakes/:id/reanalyze` for an existing intake and confirm the response includes a populated `analysis` object with all expected fields.
3. Open `/dashboard/:id` in the browser — the AI Summary, Help Score, Recommended Programs, AI Comments, Follow-up Questions, Risk Flags, Tags, Keywords sections should all populate.
4. Check the Client's Own Words card on the same page — it should still show Q/A pairs (proves `buildQAPairs` is intact).
5. Time the analysis end-to-end — should be noticeably faster than before this phase.

## Rollback

Each of the four files is independently revertable. To roll back fully:

1. Restore the previous `server/llm/prompts/analyzer.md` from git history.
2. Restore `server/llm/analyzer.js` (re-add `SCHEMA_BLOCK`, revert the `substitute()` keys and the `analyzeIntake` signature).
3. Remove `buildClientBlock` and `buildScreeningBlock` from `server/store.js` (keep `buildQAPairs`).
4. Restore the original `analyzeIntake(qaPairs, ruleSignals)` call in `server/intake-flow.js`.

No persistent data is touched, so rollback is a pure code revert.

## Notes

- This phase intentionally does not change the Zod schema. The schema is the contract; the prompt is what guides the model. They can evolve independently.
- The polarity hints (`higher = worse`, etc.) are critical because the screening questions are deliberately mixed in polarity. See `docs/11-screening.md` for the dual-copy rule on screening questions.
- If the eval harness reveals a category the new prompt struggles with, iterate on the relevant section of `analyzer.md` (e.g., expand the severity examples) rather than reverting to the old prompt wholesale.
