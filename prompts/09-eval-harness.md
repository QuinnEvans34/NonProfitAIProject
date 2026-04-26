# Prompt 09 — Build the Eval Harness

You are working in the Hope Connect repo. Everything else is built. This
is the final piece: the regression harness that lets us tune the analyzer
prompt or swap providers without breaking the system.

## Read first

1. `docs/09-eval-harness.md` ← the spec
2. `docs/02-analyzer.md` — for the schema you'll be asserting against
3. `server/llm/analyzer.js` — what you'll be calling
4. `server/llm/providers/index.js` — how providers are selected

## Your scope

Create `server/llm/eval/` with the structure in the spec, plus 10
fixtures, the runner, the matchers, and the reporter.

```
server/llm/eval/
├── run.js
├── reporter.js
├── matchers.js
└── fixtures/
    ├── 01-routine-food.json
    ├── 02-eviction-imminent.json
    ├── 03-self-harm-disclosure.json
    ├── 04-domestic-abuse.json
    ├── 05-spanish-only.json
    ├── 06-ambiguous-multi-category.json
    ├── 07-one-word-answers.json
    ├── 08-medical-emergency.json
    ├── 09-stable-planning-ahead.json
    └── 10-substance-mention.json
```

Add an `eval:analyzer` script to `server/package.json`:

```json
"scripts": {
  "eval:analyzer": "node llm/eval/run.js"
}
```

## Fixture content

Each fixture follows the format in `docs/09-eval-harness.md`. Hand-write
the 10 fixtures. Each one must include realistic Q/A pairs and
appropriately scoped `expect` blocks. Cover the cases listed in the spec:

1. **01-routine-food** — Maria-style, low severity, planning ahead.
2. **02-eviction-imminent** — James-style, high severity, this week.
3. **03-self-harm-disclosure** — crisis floor must trigger.
4. **04-domestic-abuse** — crisis floor must trigger; tests a different
    keyword path than self-harm.
5. **05-spanish-only** — Q/A in Spanish; assert `language_detected = 'es'`.
6. **06-ambiguous-multi-category** — client need spans housing + food +
    healthcare; assert at least 2 secondary categories.
7. **07-one-word-answers** — every answer is 1–3 words; the analyzer
    should still produce a valid result without hallucinating.
8. **08-medical-emergency** — high severity; assert
    `risk_flags.medical_emergency = true`.
9. **09-stable-planning-ahead** — low severity, no risk flags;
    `urgency_window = 'planning'`.
10. **10-substance-mention** — substance use disclosed in passing;
    assert `risk_flags.substance_abuse = true` but severity not
    auto-escalated to crisis.

For each fixture, set `ruleSignals` to the regex output that
`assessTranscript` would produce against the same answers. Calculate
manually for now (or run the function on each fixture's answers and
copy the result into the JSON — your call, but keep the values matching
what the regex layer will actually produce in production).

## Matchers

`matchers.js` exports the eight matcher functions in the spec. Each
returns `{ ok: boolean, message: string }`. Keep matchers pure and
unit-testable.

## Runner

`run.js`:

1. Load every JSON file in `fixtures/`.
2. For each fixture, call `analyzeIntake(input.qaPairs, input.ruleSignals)`.
3. Run every applicable matcher from the fixture's `expect` block
   against the actual result.
4. Collect pass/fail per fixture with timing.
5. Print to stdout via `reporter.js` (per the spec's output sample).
6. Exit code 0 if all pass, 1 if any fail.

Honor `LLM_PROVIDER` env var so the harness can be run against
`mock`, `ollama`, or (eventually) `azure`. When run against `mock`,
ensure the mock provider returns a result that satisfies all 10
fixtures' expectations — adjust the mock if needed so this is the case.
This makes the eval harness CI-runnable even without Ollama.

## Reporter

`reporter.js` exports `report(results)`:

- Print a header: "Running N fixtures against <provider> (<model>)..."
- For each fixture: green check or red X, fixture id, timing,
  optional one-line annotation if a matcher noticed something
  noteworthy (e.g., "severity floored from high → crisis").
- For each failure: under the failed fixture line, print the matcher
  message indented 7 spaces.
- Print a summary footer: "N passed · M failed · T.Ts total".

Use ANSI colors (no `chalk`, just literal escape codes — keep deps zero).

## Acceptance criteria

- `npm run eval:analyzer --prefix server` runs end-to-end against
  the configured provider.
- With `LLM_PROVIDER=mock`, all 10 fixtures pass.
- With `LLM_PROVIDER=ollama` and a running local Ollama, the harness
  runs all 10 fixtures and reports per-fixture results with timing.
- Exit code is 0 on full pass, 1 on any failure.
- Adding a new fixture is one JSON file — no code changes required.
- The harness does NOT require the dev server to be running. It calls
  `analyzeIntake` directly, no HTTP.

## What NOT to do

- Don't pull in `vitest`, `jest`, or any test runner. Vanilla Node
  + `node:test` if you want test-style structure, but the harness
  itself is plain Node.
- Don't grade `summary.staff_facing` content quality. We're testing
  decisions (severity, classification, flags), not phrasing.
- Don't run the harness as part of `npm run dev` — it's an explicit
  command.
- Don't commit large output logs.

## Done means

Quinn can run `npm run eval:analyzer` against Ollama or mock and see a
clean per-fixture pass/fail report. The harness is the basis for
prompt-tuning iteration.

That completes Sprint 1's analyzer slice.
