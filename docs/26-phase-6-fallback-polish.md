# 26 — Phase 6: Fallback Polish

## Goal

Make the analyzer's failure mode read as a calm "needs manual review" rather than "the AI broke." Today, when the analyzer fails (Ollama down, schema validation fails twice, etc.), `safeFallback()` in `server/llm/analyzer.js` returns hardcoded keywords like `intake_received`, `manual_review_needed`, `analysis_failed`, and an `ai_comments` entry that includes the raw error message. During a demo, that looks alarming.

We're going to (a) replace the ugly fallback keywords with neutral phrasings drawn from the client's actual answers, and (b) soften the fallback summary and AI comment text so a hiccup looks like a routine "we'll review this manually" rather than an error.

Time estimate: 10–15 minutes.

## Hard rule — DO NOT TOUCH THE INTAKE

This phase touches only the analyzer's fallback function. Do not change any of the following:

- `client/src/pages/IntakeChat.jsx`
- `client/src/lib/screening-questions.js`
- `server/screening-questions.js`
- `server/intake-flow.js`
- `server/prompts.js`
- The popover chat
- The happy-path analyzer logic (only `safeFallback` and `extractFallbackKeywords` are in scope)

## Files to read first

- `server/llm/analyzer.js` — locate `safeFallback` and `extractFallbackKeywords` near the top of the file
- `server/llm/schema.js` — confirm fallback output still passes Zod (min/max constraints, language codes, etc.)

## Files to modify

- `server/llm/analyzer.js` — replace `extractFallbackKeywords` and `safeFallback` bodies

## Background

Current `extractFallbackKeywords`:

```js
function extractFallbackKeywords(qaPairs) {
  // ... extracts up to 15 words >= 3 chars from answers ...
  const padding = ['intake_received', 'manual_review_needed', 'analysis_failed',
                   'review_transcript', 'see_case_notes'];
  // ... if fewer than 5, pads with the above ...
}
```

Current `safeFallback` returns:

```js
{
  summary: {
    staff_facing: 'Analysis failed — see transcript and case information for review.',
    client_facing: 'Thanks for sharing. A team member will review your information and reach out.',
  },
  // ...
  ai_comments: [
    { type: 'flag', text: `Automated analysis failed (${errSnippet}). Manual review required.` },
  ],
  // ...
}
```

Two problems:

1. The keyword padding list includes the literal strings `analysis_failed` and `manual_review_needed`. These end up in the dashboard's keyword chips on the right rail.
2. The staff-facing summary literally says "Analysis failed." That reads as a system problem rather than a workflow note. The AI comment includes the raw error message (truncated to 500 chars).

## Steps

### 1. Replace `extractFallbackKeywords`

The new version prefers actual words from the client's answers; if too few are available, it pads with neutral, professional placeholders:

```js
function extractFallbackKeywords(qaPairs) {
  const seen = new Set();
  for (const pair of qaPairs) {
    const words = String(pair.answer || '').split(/\s+/);
    for (const w of words) {
      const cleaned = w.replace(/[^a-zA-Z0-9_-]/g, '').trim().toLowerCase();
      // Skip very short or numeric-only words; they're rarely useful keywords.
      if (cleaned.length >= 4 && !/^\d+$/.test(cleaned)) seen.add(cleaned);
      if (seen.size >= 15) break;
    }
    if (seen.size >= 15) break;
  }

  // If we somehow have fewer than 5 from the answers, pad with neutral terms
  // that don't telegraph a failure to the case manager or audience.
  const padding = [
    'awaiting_review',
    'see_transcript',
    'see_case_information',
    'see_screening_responses',
    'staff_review_pending',
  ];
  let i = 0;
  while (seen.size < 5 && i < padding.length) seen.add(padding[i++]);
  return Array.from(seen).slice(0, 15);
}
```

The padding words read as "this is a workflow state" rather than "the analysis broke."

### 2. Replace `safeFallback`

Soften the staff-facing and client-facing summaries and update the AI comment so the error detail is logged but not surfaced as if it were a primary case finding:

```js
function safeFallback({ ruleSignals, providerName, ms, model, lastError, qaPairs }) {
  const level = ruleSignals.crisisFlag ? 'crisis' : ruleSignals.urgencyFlag;
  const scoreByLevel = { low: 25, medium: 50, high: 75, crisis: 90 };
  const errSnippet = (lastError ?? 'unknown error').slice(0, 200);

  return {
    summary: {
      staff_facing:
        'This intake is awaiting structured analysis. Please review the transcript, ' +
        'screening responses, and case information directly. The rule-based safety ' +
        'signal has been applied to severity.',
      client_facing:
        'Thanks for sharing your information. A team member will review what you ' +
        'submitted and reach out to you directly.',
    },
    classification: {
      primary_category: 'Other',
      secondary_categories: [],
      tags: ['pending_structured_analysis'],
    },
    severity: {
      level,
      score: scoreByLevel[level] ?? 50,
      confidence: 0,
      rationale:
        'Structured analysis was unavailable for this intake; severity reflects the ' +
        'rule-based safety signal only and should be re-evaluated by staff.',
      signals: ruleSignals.triggers.map((t) => `rule_floor: ${t}`),
    },
    risk_flags: {
      self_harm: false,
      domestic_abuse: false,
      child_safety: false,
      eviction_imminent: false,
      food_insecurity: false,
      medical_emergency: false,
      substance_abuse: false,
      isolation: false,
    },
    urgency_window: 'this_week',
    recommended_programs: [],
    follow_up_questions: [
      "Confirm the client's preferred contact method and best time to reach out.",
      'Ask the client to describe their situation in their own words during the follow-up call.',
    ],
    ai_comments: [
      {
        type: 'clarification',
        text:
          'Structured analysis is pending for this intake. Staff should review the ' +
          'transcript and screening responses directly and may re-run analysis from ' +
          'the case detail page.',
      },
    ],
    keywords_extracted: extractFallbackKeywords(qaPairs),
    language_detected: 'en',
    model_meta: { model, provider: providerName, ms, schema_version: '1.0' },
  };
}
```

Notable changes:

- `staff_facing` reads as a calm workflow note ("awaiting structured analysis", "please review … directly").
- `client_facing` is unchanged in tone but slightly tightened.
- `classification.tags` now has one professional tag (`pending_structured_analysis`) instead of an empty array.
- `severity.rationale` describes the situation as a state ("structured analysis was unavailable") rather than an error.
- `ai_comments` uses type `clarification` (the system already has this type for gaps in the intake) rather than `flag`. The text is constructive and tells the case manager what to do next.
- The raw error message is no longer embedded in the AI comment text. It's still logged via `console.error` upstream in `analyzeIntake`, so engineers can still debug.
- Still passes Zod: all required fields present, `keywords_extracted` returns 5–15 items, `follow_up_questions` returns 2–5 items, `ai_comments` is within max 6, `tags` matches the regex.

### 3. Sanity-check the schema

`server/llm/schema.js` constraints relevant to the new fallback:

- `tags`: each must match `/^[a-z][a-z0-9_]{1,38}$/`. `pending_structured_analysis` is 28 chars and matches.
- `follow_up_questions`: min 2, max 5. We return 2.
- `ai_comments`: max 6. We return 1.
- `keywords_extracted`: min 5, max 15. We always pad to at least 5.
- `language_detected`: 2–5 chars. We return `"en"`.

All within bounds.

## Acceptance criteria

- `extractFallbackKeywords` no longer outputs `intake_received`, `manual_review_needed`, `analysis_failed`, `review_transcript`, or `see_case_notes`.
- `safeFallback` no longer says the words "Analysis failed" anywhere in its visible output.
- The fallback summary, classification tag, severity rationale, and AI comment all read as professional workflow notes.
- A forced fallback (e.g., by stopping `ollama serve` and re-running analysis) still produces a valid `AnalysisResult` that passes Zod.
- The dashboard renders the fallback intake without showing alarming text or red error states.

## Verification steps

1. From the project root, with the dev server running and Ollama running, complete or seed an intake.
2. Stop Ollama (`Ctrl-C` in the `ollama serve` terminal).
3. In the IntakeDetail page for an intake, click "Re-run analysis".
4. The page should populate with calm, professional text — no "Analysis failed" anywhere.
5. The right rail's Keywords list should contain phrases from the client's answers (and possibly `awaiting_review`-style padding), but no ugly internal terms.
6. Restart Ollama and re-run analysis — the intake should switch back to a real analyzer output.

## Rollback

Revert `server/llm/analyzer.js` from git history. The only callers of these functions are inside the same file, so no other code needs to change.

## Notes

- The error detail (`lastError`) is still useful for engineering debugging. It's logged via `console.error` in `analyzeIntake` before `safeFallback` runs, so the engineer can still see it in the server console. It just no longer surfaces in the user-visible JSON.
- If the company later wants a user-visible "analysis pending" indicator, the right place is a UI affordance keyed off `analysis.model_meta.provider === 'mock'` or a new `analysis.is_fallback` flag — not by surfacing the failure copy. That would be a separate phase.
- This phase is independent and can be applied at any time after the codebase is stable. It is the lowest-risk phase in the entire sequence.
