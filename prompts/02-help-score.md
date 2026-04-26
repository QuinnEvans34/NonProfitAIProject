# Prompt 02 — Help Score

You are working in the Hope Connect repo. The analyzer foundation from
prompt 01 is merged. Now we add the deterministic help-score function — a
pure 0–100 number computed from the analyzer's `AnalysisResult`. No LLM
calls. No randomness.

## Read first

1. `docs/03-help-score.md` ← this is the spec
2. `docs/02-analyzer.md` — to know the `AnalysisResult` shape
3. `docs/10-conventions.md`
4. `server/llm/schema.js` — the zod schema you'll be reading from

## Your scope

Two files only:

- `server/help-score.js`
- `server/help-score.test.js`

## What `server/help-score.js` exports

```js
export function computeHelpScore(analysis) {
  // returns { score, components, rubric_version }
}
```

The rubric is defined in `docs/03-help-score.md` and is the source of
truth. Re-read it carefully. The four components and the self-harm floor
must match exactly.

Module-level constants for the magic numbers (export them, even — the UI
will read them when rendering the breakdown tooltip):

```js
export const SEVERITY_BAND_BASE = {
  crisis: 86,
  high: 65,
  medium: 36,
  low: 8,
};

export const RISK_FLAG_BONUS_PER_FLAG = 3;
export const RISK_FLAG_BONUS_MAX = 18;

export const URGENCY_WINDOW_BONUS = {
  today: 6,
  this_week: 3,
  this_month: 0,
  planning: -2,
};

export const SECONDARY_CATEGORY_BONUS_PER = 2;
export const SECONDARY_CATEGORY_BONUS_MAX = 6;

export const SELF_HARM_FLOOR = 90;

export const RUBRIC_VERSION = '1.0';
```

The function body just composes those constants — keep it dumb and
auditable.

Return shape:

```js
{
  score: 81,
  components: {
    severity_band_base: 65,
    risk_flag_bonus: 9,
    urgency_window_bonus: 3,
    multi_category_bonus: 4,
    self_harm_floor_applied: false,
  },
  rubric_version: '1.0',
}
```

## What `server/help-score.test.js` covers

Use Node's built-in `node:test` runner. Six required tests, matching the
"Tests (required)" section of `docs/03-help-score.md`:

1. Each band's exact base value with no bonuses.
2. Bonuses can't break the next band's ceiling (max-out a low case → ≤ 33,
   etc.).
3. `self_harm` floor: any analysis with `risk_flags.self_harm` true returns
   at least 90, with `components.self_harm_floor_applied: true`.
4. Clamp to 100 when bonuses would exceed.
5. Clamp to 0 when bonuses would drop below.
6. `rubric_version` is exactly `'1.0'`.

Add factory helpers in the test file (not exported, just convenience):

```js
function makeAnalysis({ severity = 'medium', risks = [], window = 'this_month', secondaries = [] } = {}) {
  return {
    severity: { level: severity },
    risk_flags: {
      self_harm: risks.includes('self_harm'),
      domestic_abuse: risks.includes('domestic_abuse'),
      child_safety: risks.includes('child_safety'),
      eviction_imminent: risks.includes('eviction_imminent'),
      food_insecurity: risks.includes('food_insecurity'),
      medical_emergency: risks.includes('medical_emergency'),
      substance_abuse: risks.includes('substance_abuse'),
      isolation: risks.includes('isolation'),
    },
    urgency_window: window,
    classification: {
      primary_category: 'Housing',
      secondary_categories: secondaries,
      tags: [],
    },
  };
}
```

## Acceptance criteria

- `node --test server/help-score.test.js` passes all six tests.
- `import { computeHelpScore } from './help-score.js'` works from
  `intake-flow.js` (next prompt).
- Constants are exported (the UI consumes them later).
- The function is pure — no side effects, no I/O, no `Date.now()`.

## What NOT to do

- Don't wire it into `intake-flow.js` yet. That's prompt 03.
- Don't add the score to the dashboard yet. That's prompt 06.
- Don't add a UI tooltip yet. That's prompt 05.
- Don't introduce a "rubric v1.1" — we ship v1.0 first.

## Done means

The function is implemented, tested, and ready for prompt 03 to call.
