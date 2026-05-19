# 21 — Phase 1: Model Swap & Warm-Up

## Goal

Switch the default Ollama model from `qwen3:30b` to `qwen3:8b` so the analyzer runs in roughly a third of the time on a laptop, and fix the boot-time warm-up so both the chat path and the analyzer path are warm before the first user interaction.

Time estimate: ~15 minutes. Lowest-risk change in the whole sequence.

## Hard rule — DO NOT TOUCH THE INTAKE

This phase touches only model config and warm-up. Do not change any of the following:

- `client/src/pages/IntakeChat.jsx`
- `client/src/lib/screening-questions.js`
- `server/screening-questions.js`
- `server/intake-flow.js` (the `STEPS` object, `startIntake`, `processMessage` — leave them alone)
- `server/prompts.js`
- The `INTAKE_SYSTEM_PROMPT` constant
- The popover chat behavior

Specifically, in `server/ollama.js`, you change `DEFAULT_MODEL` and the warm-up function. You do **not** change `chatReply` semantics or the `INTAKE_SYSTEM_PROMPT` import path.

## Files to read first

- `server/ollama.js`
- `server/llm/providers/ollama.js`
- `server/llm/analyzer.js`
- `server/index.js`
- `README.md` (the "Switching to a smaller/faster model" section)

## Files to modify

- `server/ollama.js` — change `DEFAULT_MODEL`, add a second warm-up call.
- `server/llm/providers/ollama.js` — change `OLLAMA_MODEL`.
- `server/llm/analyzer.js` — export a `warmUpAnalyzer()` function.
- `server/index.js` — call `warmUpAnalyzer()` alongside `warmUpModel()`.

## Background

Today's defaults (`server/ollama.js` line 5 and `server/llm/providers/ollama.js` line 4):

```js
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:30b';
```

`qwen3:30b` is ~18 GB and slow on laptop CPUs/GPUs. `qwen3:8b` is ~4.7 GB, retains good instruction-following, and is dramatically faster.

The current warm-up (`warmUpModel()` in `server/ollama.js`) sends `"Hi /no_think"` through the chat path. The analyzer path uses a different system prompt and the `format: 'json'` option, so its prompt cache is **not** warmed by `warmUpModel()`. The first real analysis still pays a cold-start cost.

## Steps

### 1. Pull the smaller model

This is a one-time operator action, not a code change. Document it in the prompt and the README. The engineer running the demo should:

```bash
ollama pull qwen3:8b
ollama list   # confirm qwen3:8b is present
```

### 2. Change the model default in two places

**`server/ollama.js`** — find this line:

```js
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:30b';
```

Change it to:

```js
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';
```

**`server/llm/providers/ollama.js`** — find this line:

```js
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:30b';
```

Change it to:

```js
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';
```

Both files read the same `OLLAMA_MODEL` env var, so overriding at runtime is still possible.

### 3. Add an analyzer warm-up

The chat warm-up calls `ollamaChat()` with a tiny user message. The analyzer warm-up should call the analyzer provider directly with a minimal valid-JSON-eliciting prompt, so the prompt cache for the JSON-mode path is populated.

Add to `server/llm/analyzer.js`, near the bottom of the file (after `analyzeIntake`):

```js
// Warm-up: hit the analyzer provider on boot so the first real intake doesn't
// pay the cold-prompt-cache cost on the JSON-mode path.
export async function warmUpAnalyzer() {
  const { name: providerName, generateAnalysis } = getProvider();
  const model = process.env.OLLAMA_MODEL || 'qwen3:8b';
  console.log(`Warming up analyzer (${providerName} / ${model})...`);
  const start = Date.now();
  try {
    await generateAnalysis({
      systemPrompt: 'You are a JSON echo service. Respond with {"ok":true} and nothing else.',
      userPrompt: 'ping',
    });
    console.log(`Analyzer warm-up complete in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.warn(`Analyzer warm-up failed (${err.message}). First analysis will be slow.`);
  }
}
```

### 4. Call the new warm-up at boot

In `server/index.js`, find this block:

```js
import { warmUpModel } from './ollama.js';
// ...
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  warmUpModel();
});
```

Change it to:

```js
import { warmUpModel } from './ollama.js';
import { warmUpAnalyzer } from './llm/analyzer.js';
// ...
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  warmUpModel();
  warmUpAnalyzer();
});
```

Both warm-ups are fire-and-forget (they catch their own errors and only log on failure). They run in parallel, so the server is responsive immediately.

### 5. Update the README

In `README.md`, change the "Tech stack" table row from:

```
| LLM | Ollama (local), qwen3:30b |
```

to:

```
| LLM | Ollama (local), qwen3:8b (default) |
```

And in the "Install Ollama and the model" section, change:

```bash
ollama pull qwen3:30b
```

to:

```bash
ollama pull qwen3:8b
```

The "Switching to a smaller/faster model" section can stay; it now describes how to swap *up* to the 30b model if hardware permits.

## Acceptance criteria

- The server boots with `npm run dev` and prints both warm-up complete lines.
- The server log shows the model name `qwen3:8b` (or whatever `OLLAMA_MODEL` is set to) in the analyzer warm-up log line.
- The first call to `POST /api/intakes/start` returns its first assistant message in well under 10 seconds (target: under 5 seconds on a modern laptop).
- `OLLAMA_MODEL=qwen3:30b npm run dev` still works as an override (the env var has higher priority than the default).
- No other behavior changes.

## Verification steps

1. `ollama pull qwen3:8b`.
2. From the project root, `npm run dev`.
3. Confirm the server log shows two warm-up lines, both reporting `qwen3:8b`.
4. In another terminal, `curl http://localhost:3001/api/health` returns `{"ok":true}`.
5. `curl http://localhost:3001/api/chat/status` returns `{"available":true}`.
6. Time a single analyzer run by hitting `POST /api/intakes/<id>/reanalyze` on an existing intake. It should complete in roughly 3–8 seconds on a modern laptop.

## Rollback

Revert the two `DEFAULT_MODEL` / `OLLAMA_MODEL` lines to `qwen3:30b`, remove `warmUpAnalyzer` from `server/llm/analyzer.js`, and remove its import + call from `server/index.js`. No data migrations or persistent state changes happen in this phase, so rollback is a single revert.

## Notes

- This phase does not change prompt content, schema shape, or any persistence behavior. It is purely a speed/cold-start fix.
- If for any reason the laptop has plenty of GPU, the engineer can still run on `qwen3:30b` via `OLLAMA_MODEL=qwen3:30b npm run dev`. The default is what changes.
