# 10 — Demo Readiness: Paste-Ready Prompts

This file contains a single paste-ready prompt for each of the six phases described in `docs/20-demo-readiness-overview.md` through `docs/26-phase-6-fallback-polish.md`. Each prompt is self-contained and references the relevant spec doc by its absolute path so Claude Code can locate it without context from this conversation.

## How to use

Copy a phase's prompt block (between the `---` separators) into Claude Code one at a time. Wait for each phase to complete and verify the acceptance criteria from its spec doc before moving to the next.

Recommended order: **1 → 2 → 3 → 4 → 5 → 6**.

A hard rule applies to every phase: **DO NOT TOUCH THE INTAKE**. The company has approved the intake UX. Off-limits files are listed in each phase's spec doc and in `docs/20-demo-readiness-overview.md`. If a change you are about to make would alter what the client sees during intake, stop and re-read the spec.

---

## Phase 1 — Model Swap & Warm-Up

```
Implement Phase 1 of the demo-readiness plan exactly as described in this spec:

  /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/21-phase-1-model-and-warmup.md

Before you start, read:
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/20-demo-readiness-overview.md (the hard rule and overall context)
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/21-phase-1-model-and-warmup.md (the spec for this phase)
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/ollama.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/llm/providers/ollama.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/llm/analyzer.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/index.js

Hard rule: DO NOT TOUCH THE INTAKE. The following files and behaviors are off-limits:
  - client/src/pages/IntakeChat.jsx
  - client/src/lib/screening-questions.js
  - server/screening-questions.js
  - server/intake-flow.js
  - server/prompts.js (INTAKE_SYSTEM_PROMPT in particular)
  - The popover chat behavior

Files you may modify in this phase, and only these:
  - server/ollama.js
  - server/llm/providers/ollama.js
  - server/llm/analyzer.js (add warmUpAnalyzer export only)
  - server/index.js (call warmUpAnalyzer)
  - README.md (update model references)

When done, verify the acceptance criteria in the spec doc, then summarize what changed and any deviations from the spec.
```

---

## Phase 2 — Analyzer Prompt Slim & Input Restructure

```
Implement Phase 2 of the demo-readiness plan exactly as described in this spec:

  /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/22-phase-2-analyzer-prompt-slim.md

Before you start, read:
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/20-demo-readiness-overview.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/22-phase-2-analyzer-prompt-slim.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/llm/prompts/analyzer.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/llm/analyzer.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/llm/schema.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/store.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/screening-questions.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/intake-flow.js (locate runAnalyzer at the bottom — only that function's call to analyzeIntake is editable)

Hard rule: DO NOT TOUCH THE INTAKE. In particular:
  - Do NOT change the STEPS object, startIntake, or processMessage in server/intake-flow.js — only the runAnalyzer call site at the bottom.
  - Do NOT change the screening question text, IDs, labels, or polarity.
  - Do NOT delete buildQAPairs from server/store.js — it is still used by the IntakeDetail "Client's Own Words" panel. You are ADDING buildClientBlock and buildScreeningBlock beside it.

Files you may modify in this phase, and only these:
  - server/llm/prompts/analyzer.md (full replacement — the spec contains the exact new content)
  - server/llm/analyzer.js (remove SCHEMA_BLOCK, change substitute() keys, change analyzeIntake signature)
  - server/store.js (add buildClientBlock and buildScreeningBlock exports)
  - server/intake-flow.js (change ONLY the analyzeIntake call inside runAnalyzer)

After implementing, run the eval harness:
  cd server && npm run eval:analyzer

All 10 fixtures should pass. If any regress, iterate on the prompt before declaring done. Then summarize what changed.
```

---

## Phase 3 — SQLite Persistence

```
Implement Phase 3 of the demo-readiness plan exactly as described in this spec:

  /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/23-phase-3-sqlite-persistence.md

Before you start, read:
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/20-demo-readiness-overview.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/23-phase-3-sqlite-persistence.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/store.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/admin-store.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/seed.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/index.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/package.json
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/.gitignore

Hard rule: DO NOT TOUCH THE INTAKE. The intake's persistence behavior should be byte-for-byte unchanged from a caller's perspective — only the storage backend changes.

Files you may modify in this phase, and only these:
  - server/package.json (add better-sqlite3 dependency)
  - server/store.js (rewrite to use SQLite while preserving exports — IMPORTANT: keep buildQAPairs, buildClientBlock, and buildScreeningBlock from Phase 2 intact)
  - server/admin-store.js (rewrite to use SQLite while preserving exports)
  - .gitignore (add server/data/*.db* lines)

Files you may create in this phase:
  - server/data/.gitkeep (empty file)

After implementing:
  1. Run `npm install --prefix server` to compile better-sqlite3.
  2. Delete any existing server/data/intakes.db* files.
  3. Start the dev server and confirm seed runs.
  4. Restart the server and confirm seeded data persists.
  5. Run `cd server && npm run eval:analyzer` to confirm the eval harness still passes.

Then summarize what changed.
```

---

## Phase 4 — Rich Demo Seeds

```
Implement Phase 4 of the demo-readiness plan exactly as described in this spec:

  /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/24-phase-4-rich-demo-seeds.md

Before you start, read:
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/20-demo-readiness-overview.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/24-phase-4-rich-demo-seeds.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/store.js (the blankIntake shape after Phase 3)
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/llm/schema.js (AnalysisResult constraints)
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/llm/providers/mock.js (reference AnalysisResult fixtures you can adapt)
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/help-score.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/screening-questions.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/seed.js (current seeder, will be rewritten)

Hard rule: DO NOT TOUCH THE INTAKE. Seed data must conform to the existing Intake and AnalysisResult shapes. Do not invent new fields beyond the documented `isDemoData: true` flag.

Files you may modify in this phase, and only these:
  - server/seed.js (rewrite to load JSON files from server/seed/)

Files you may create in this phase:
  - server/seed/README.md
  - server/seed/01-maria-low.json (Food / Low)
  - server/seed/02-patricia-medium.json (Utilities / Medium)
  - server/seed/03-sam-medium.json (Healthcare / Medium, multi-category)
  - server/seed/04-james-high.json (Housing / High, child present)
  - server/seed/05-alex-crisis.json (Healthcare / Crisis, self-harm)

Each seed file must include a full pre-computed analysis object that passes Zod validation. The spec doc has a complete shape reference and per-seed narrative anchors. The mock provider's fixtures are good reference material — adapt them, do not copy verbatim.

After implementing:
  1. Delete server/data/intakes.db* to clear any prior seeds.
  2. Start the dev server. Confirm the log shows "Seeded 5 demo intake records...".
  3. Open /dashboard and confirm all five rows render with severity pills, score rings, and no "(legacy)" badges.
  4. Open each intake's detail page and confirm full AI panels render (Help Score, Recommended Programs, AI Comments, Follow-up Questions, Risk Flags, Tags, Keywords).
  5. Confirm the crisis seed shows the red crisis banner and the self_harm risk flag.

Then summarize what changed.
```

---

## Phase 5 — Dashboard Polish

```
Implement Phase 5 of the demo-readiness plan exactly as described in this spec:

  /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/25-phase-5-dashboard-polish.md

Before you start, read:
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/20-demo-readiness-overview.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/25-phase-5-dashboard-polish.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/client/src/pages/Dashboard.jsx
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/client/src/pages/IntakeDetail.jsx
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/client/src/lib/api.js
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/routes/reports.js (confirm /api/reports/summary payload shape)
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/client/src/pages/Reports.jsx (existing KpiTile component to adapt)

Hard rule: DO NOT TOUCH THE INTAKE. Phase 5 is entirely in the staff-facing dashboard and detail pages. The following are off-limits:
  - client/src/pages/IntakeChat.jsx (including the SubmittedView and the popover chat)
  - client/src/pages/LandingPage.jsx

Files you may modify in this phase, and only these:
  - client/src/pages/Dashboard.jsx
  - client/src/pages/IntakeDetail.jsx

Implement four changes per the spec:
  1. KPI strip at the top of /dashboard (Total intakes, High+Crisis, Avg help score) fetched from api.reportSummary({ range: 'all' }).
  2. Severity-first sort (crisis → high → medium → low) with createdAt DESC as tie-breaker.
  3. Small "DEMO" pill next to client name when intake.isDemoData === true.
  4. Polish "Re-run analysis" button: spinning icon while running, transient error toast (4s auto-clear), green "✓ Updated" check on success (2s).

After implementing, verify the acceptance criteria in the spec doc and summarize what changed.
```

---

## Phase 6 — Fallback Polish

```
Implement Phase 6 of the demo-readiness plan exactly as described in this spec:

  /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/26-phase-6-fallback-polish.md

Before you start, read:
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/20-demo-readiness-overview.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/docs/26-phase-6-fallback-polish.md
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/llm/analyzer.js (locate safeFallback and extractFallbackKeywords)
  - /Users/quintonevans/Desktop/GitHub/NonProfitAIProject/server/llm/schema.js (verify fallback output still passes Zod)

Hard rule: DO NOT TOUCH THE INTAKE. Phase 6 changes only two functions inside server/llm/analyzer.js. Do not touch:
  - The happy-path analyzer logic (analyzeIntake itself, beyond what the spec calls out)
  - Any other file

Files you may modify in this phase, and only this:
  - server/llm/analyzer.js (replace extractFallbackKeywords body and safeFallback body — exact replacement text is in the spec)

After implementing:
  1. Start the server, then stop `ollama serve` to force the fallback path.
  2. Trigger a re-analysis via the IntakeDetail page's "Re-run analysis" button.
  3. Confirm the rendered AI Summary reads as a calm "awaiting structured analysis" workflow note — NOT "analysis failed".
  4. Confirm the Keywords list does not contain `intake_received`, `manual_review_needed`, or `analysis_failed`.
  5. Restart Ollama and re-run analysis to confirm the happy path is unaffected.

Then summarize what changed.
```

---

## After all phases

When all six phases are complete, run a final smoke test:

1. `rm -rf server/data/intakes.db*` to clear the database.
2. `npm run dev`. Confirm both warm-up complete lines appear, the seed script runs, and the server is responsive.
3. Visit `/dashboard`. Confirm the KPI strip, severity-sorted rows, and "DEMO" pills are all visible.
4. Click into the crisis case and confirm the crisis banner and self_harm risk flag.
5. Walk a fresh intake end-to-end. Confirm the post-submit summary appears within ~5–10 seconds.
6. Stop `ollama serve` mid-demo and click "Re-run analysis" on a seed. Confirm the fallback copy reads calmly.

Once all six are checked, the demo is ready.
