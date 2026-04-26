# Prompt 01 — Analyzer Foundation

You are working in the repository at the current working directory. This is
the Hope Connect nonprofit intake demo: an Express + React + Ollama
prototype. We're adding a structured-output LLM analyzer module that turns
intake Q/A pairs into a typed `AnalysisResult` JSON object that the rest of
the app will read.

## Read first (in this order)

1. `docs/00-vision-and-scope.md`
2. `docs/01-architecture.md`
3. `docs/02-analyzer.md` ← this is the contract you're implementing
4. `docs/10-conventions.md`
5. `server/intake-flow.js` — to understand how the existing flow collects data
6. `server/urgency.js` — to understand the regex floor we'll feed in
7. `server/ollama.js` — the existing Ollama client; learn from it but
   don't modify it (it's used by the conversational chatReply)
8. `server/prompts.js` — the existing summary prompt for reference

## Your scope

Build the `server/llm/` module exactly as described in
`docs/01-architecture.md`. **Do not** wire it into `intake-flow.js` yet —
that's prompt 03. **Do not** change `client/`. **Do not** touch the database
question or `server/store.js` shape.

## Files to create

```
server/llm/
├── analyzer.js               # public: analyzeIntake(qaPairs, ruleSignals)
├── schema.js                 # zod schema + NEED_CATEGORIES export
├── prompts/
│   └── analyzer.md           # the prompt template; copy verbatim from docs/02-analyzer.md
└── providers/
    ├── index.js              # picks provider from LLM_PROVIDER env var
    ├── ollama.js             # local Ollama JSON-mode call
    ├── azure.js              # placeholder that throws "not implemented"
    └── mock.js               # returns a fixed valid AnalysisResult; used by eval/tests
```

Add these dependencies to `server/package.json`:

```bash
npm install --prefix server zod
```

## What `schema.js` exports

- `NEED_CATEGORIES` — the array `['Housing','Food','Healthcare','Employment','Legal','Utilities','Other']`.
- `AnalysisResultSchema` — a zod schema matching `docs/02-analyzer.md` exactly.
  All validation rules in that doc must be enforced.
- `validateAnalysis(json)` — returns `{ ok: true, data }` or
  `{ ok: false, error }` where `error` is a human-readable string suitable
  to feed back into the LLM on retry.

## What `analyzer.js` exports

```js
export async function analyzeIntake(qaPairs, ruleSignals) { /* … */ }
```

Implementation order inside `analyzeIntake`:

1. Load the prompt template from `server/llm/prompts/analyzer.md` once at
   module init (cached in module-level variable).
2. Build the `qa_pairs_block` substitution: numbered list,
   `Q1: …\nA1: …\n` etc.
3. Build the `rule_signals_json` substitution: stringified `ruleSignals`.
4. Build the `schema_block` substitution: a compact human-readable schema
   description (not the zod source). It must mention every field, the
   allowed values, and the literal "Return ONLY a JSON object" sentence.
5. Substitute into the template, get `systemPrompt` and `userPrompt`.
   (Use a single user message for the qaPairs+schema block; system message
   carries the role instructions.)
6. Call the configured provider's `generateAnalysis({ systemPrompt,
   userPrompt, jsonSchema })`. The provider returns a raw JSON string.
7. Parse the JSON. If parse fails, retry once: append the parse error to
   the user prompt and call again.
8. Validate against `AnalysisResultSchema`. If validation fails, retry
   once: append the validation error and call again.
9. If still failing, return a partial `AnalysisResult` with
   `summary.staff_facing` set to "Analysis failed — see transcript and case
   information for review." and every other field set to safe defaults
   (empty arrays, `severity.level` = the rule signal level, etc.). Mark
   `model_meta.provider` with the actual provider name and `ms` with the
   wall-clock time.
10. Apply the severity floor:

    ```js
    const ranks = { low: 0, medium: 1, high: 2, crisis: 3 };
    const ruleLevel = ruleSignals.crisisFlag ? 'crisis' : ruleSignals.urgencyFlag;
    if (ranks[ruleLevel] > ranks[result.severity.level]) {
      result.severity.level = ruleLevel;
    }
    result.severity.signals = [
      ...result.severity.signals,
      ...ruleSignals.triggers.map(t => `rule_floor: ${t}`),
    ];
    ```

11. Stamp `model_meta` with `model`, `provider`, `ms`, and
    `schema_version: "1.0"`.

## Provider interface

Every provider in `server/llm/providers/` exports:

```js
export async function generateAnalysis({ systemPrompt, userPrompt, jsonSchema }) {
  // Returns a raw JSON string (the model's full response).
  // Throws on transport-level errors. The analyzer handles parse/validation.
}
```

`providers/index.js` reads `process.env.LLM_PROVIDER` (default `ollama`)
and re-exports the matching module's `generateAnalysis`.

### `providers/ollama.js`

- Use the same `OLLAMA_BASE_URL` env var convention as `server/ollama.js`
  (default `http://localhost:11434`).
- Use the same `OLLAMA_MODEL` env var (default `qwen3:30b`).
- POST to `/api/chat` with `format: "json"` so Ollama enforces JSON output.
- Pass messages: system (the analyzer system prompt), user (the qa+schema
  block).
- Strip qwen3 `<think>...</think>` blocks (same logic as `server/ollama.js`).
- Lower temperature (0.2) — we want consistency, not creativity.
- Timeout 120s. The analyzer call is bigger than the conversational ones.

### `providers/azure.js`

Stub only. Exports `generateAnalysis` which throws
`new Error('azure provider not yet implemented; set LLM_PROVIDER=ollama or implement this file')`.
Include a leading comment block with the function shape an Azure OpenAI
implementation would use, so future-Quinn (or whoever) has a head start.

### `providers/mock.js`

Returns a hard-coded valid `AnalysisResult` JSON string. Used by the eval
harness when `LLM_PROVIDER=mock` and by unit tests so they don't need Ollama.

## The prompt template file

`server/llm/prompts/analyzer.md` is the verbatim text from
`docs/02-analyzer.md` under the heading "The prompt template". Use double-
braces `{{rule_signals_json}}`, `{{qa_pairs_block}}`, `{{schema_block}}` as
the substitution placeholders. The substitution is a simple string-replace
loop in `analyzer.js`; do not introduce a templating library.

## Acceptance criteria

- `import { analyzeIntake } from './llm/analyzer.js'` works from any
  server module.
- Calling `analyzeIntake(samplePairs, sampleSignals)` against a running
  Ollama returns a `AnalysisResult` that passes zod validation.
- Setting `LLM_PROVIDER=mock` returns the mock fixture without any network
  call.
- Setting `LLM_PROVIDER=azure` throws the "not yet implemented" error.
- The severity floor rule is honored: a fixture where `ruleSignals.crisisFlag
  = true` and the model returns `severity.level = "low"` ends up with
  `severity.level = "crisis"` in the returned result.
- All new files have a one-line top-of-file comment describing the file's
  role.

## What NOT to do

- Don't modify `server/intake-flow.js`, `server/store.js`, `server/ollama.js`,
  `server/prompts.js`, `server/urgency.js`, or any client file.
- Don't add the analyzer to any route. Wiring is prompt 03's job.
- Don't add tests yet beyond a single smoke test in
  `server/llm/analyzer.smoke.test.js` that runs against the mock provider
  and verifies the output passes validation. (Use Node's built-in
  `node:test` runner — no test library install.)
- Don't write the eval harness. Prompt 09.

## Done means

You can run:

```bash
LLM_PROVIDER=mock node --test server/llm/
```

and see the smoke test pass. The provider abstraction is in place. The
analyzer returns a valid, schema-checked, severity-floored `AnalysisResult`
when called with `LLM_PROVIDER=ollama` and a running Ollama instance.

Stop after that. Commit the slice. Quinn runs prompt 02 next.
