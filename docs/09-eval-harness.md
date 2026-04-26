# Eval Harness

Goal: a reproducible regression net for the analyzer. When we tune the
prompt, change the model, or swap providers, we run `npm run eval:analyzer`
and see exactly which behaviors we broke.

## Layout

```
server/llm/eval/
├── run.js                 # entrypoint; npm run eval:analyzer maps here
├── reporter.js            # console output formatting
├── matchers.js            # custom assertions (expectSeverityAtLeast, …)
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

## Fixture format

Each fixture is a single JSON file:

```jsonc
{
  "id": "02-eviction-imminent",
  "description": "James-style case: eviction next week, kids food-insecure, recent job loss.",
  "input": {
    "qaPairs": [
      { "question": "What is your first name?", "answer": "James" },
      { "question": "How would you like us to reach you?", "answer": "text" },
      { "question": "What kind of help do you need?", "answer": "housing" },
      { "question": "Is this urgent?", "answer": "yes, eviction notice for next week" },
      { "question": "Tell me about your situation.", "answer": "got eviction notice, two kids haven't eaten properly in days, job ended last month" }
    ],
    "ruleSignals": {
      "urgencyFlag": "high",
      "crisisFlag": false,
      "triggers": ["high: \"eviction\""]
    }
  },
  "expect": {
    "severity": { "atLeast": "high" },
    "primaryCategory": "Housing",
    "secondaryIncludes": ["Food"],
    "riskFlagsTrue": ["eviction_imminent", "food_insecurity", "child_safety"],
    "urgencyWindow": { "in": ["this_week", "today"] },
    "recommendedProgramsContains": ["SNAP"],
    "followUpQuestionsAtLeast": 2,
    "languageDetected": "en"
  }
}
```

The `expect` block is intentionally **lenient** — we assert minimum
behavior, not exact output. We're testing decisions, not phrasing.

## Matchers

```js
// matchers.js
expectSeverityAtLeast(actual, expected)        // ranks low<medium<high<crisis
expectPrimaryCategoryEquals(actual, expected)
expectSecondaryIncludes(actual, expectedList)  // every value in list is in actual
expectRiskFlagsTrue(actual, expectedList)      // every flag in list is true
expectUrgencyWindowIn(actual, allowedList)
expectRecommendedProgramsContains(actual, names)
expectFollowUpQuestionsAtLeast(actual, n)
expectLanguageDetected(actual, code)
```

Each matcher returns `{ ok: boolean, message: string }` for the reporter.

## Reporter output

```
$ npm run eval:analyzer
Running 10 fixtures against ollama (qwen3:30b)...

  ✓ 01-routine-food                     2.1s
  ✓ 02-eviction-imminent                3.4s
  ✓ 03-self-harm-disclosure             2.7s    severity floored from high → crisis
  ✗ 04-domestic-abuse                   2.9s
       expectRiskFlagsTrue: domestic_abuse → got false
  ✓ 05-spanish-only                     3.1s    language_detected = es
  …

  9 passed · 1 failed · 28.4s total
```

Exit code 0 on all pass, 1 on any failure. Wire to CI later.

## When to run

- After every prompt change. Always.
- After every model swap. Always.
- After provider abstraction swap. Always.
- On a quiet hour, in a loop, while iterating on the prompt.

## What the harness does NOT do

- It doesn't check natural-language summary quality. We're not asking the
  model to produce a specific summary — only that severity, classification,
  flags, and category lists land in defensible places.
- It doesn't grade `confidence` or `score` numbers. Too noisy at this stage.
- It doesn't run end-to-end (no HTTP calls, no `intake-flow.js`). It calls
  `analyzer.analyzeIntake` directly.

## CI hookup (deferred)

Add `eval:analyzer` to `package.json` scripts. When a CI pipeline materializes
later, gate merges to `main` on this passing.

## Adding fixtures

When the analyzer makes a clearly wrong call in the wild, the rule is:

1. Capture the Q/A pairs and rule signals into a new fixture file.
2. Write the `expect` block describing what *should* have happened.
3. Run the harness, watch it fail.
4. Fix the prompt or schema or floor logic.
5. Run the harness again, watch it pass.

This is how the prompt gets sharper over time without us re-prompting blind.
