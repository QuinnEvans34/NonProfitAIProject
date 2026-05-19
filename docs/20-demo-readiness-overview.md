# 20 — Demo Readiness: Overview

## Purpose

The Hope Connect prototype is preparing for a company demo. A code review surfaced four blockers: the analyzer is slow on the demo laptop, the AI's analysis quality has degraded because the prompt no longer matches the form-led intake's data shape, the in-memory store loses everything on restart (including the only two seeded cases), and the dashboard renders those seeds as "legacy / analysis pending" because they lack a full `analysis` object.

These docs are the source-of-truth specs for six phases of work that fix those issues without disturbing the approved intake experience. They are intended to be read by an engineer (or by Claude Code) and acted on phase-by-phase. The corresponding paste-ready prompts live in `prompts/10-demo-readiness-prompts.md`.

## Hard rule — NEVER TOUCH THE INTAKE

The intake UX is approved by the company. Nothing in these phases is allowed to change anything the client sees during the intake, or any of the data structures that drive it. The following files and behaviors are **off-limits** in every phase:

- `client/src/pages/IntakeChat.jsx` — the entire 4-step intake page (Welcome, Contact, Screening, Review & Submit). This includes the floating chat popover (`handleStartChat`, `handleSendChat`, `openChat`) and the `SubmittedView` shown right after submit.
- `client/src/pages/LandingPage.jsx` — pre-intake marketing page. Not in scope for any phase.
- `client/src/lib/screening-questions.js` — the 17 questions, their labels, ordering, and polarity are company-approved.
- `server/screening-questions.js` — server copy of the same questions.
- `server/intake-flow.js` — the `STEPS` object, `startIntake`, and `processMessage` drive the popover chat. Only the `runAnalyzer` function at the bottom of this file (and how it is invoked) is editable, because it runs **after** intake submission.
- `server/prompts.js` — `INTAKE_SYSTEM_PROMPT` is the chat system prompt; do not change it.
- `client/src/components/ScaleSelector.jsx` — intake screening UI; do not change it.
- Any text the client sees during the intake flow.

If a change you are considering would alter what a client sees, what they fill out, or how the form behaves, **stop and re-read this section**. The work in these phases is strictly post-intake.

## What we are allowed to change

Everything downstream of submit:

- `server/llm/**` — analyzer pipeline, prompts, schema, providers, eval harness.
- `server/store.js` and `server/admin-store.js` — persistence layer.
- `server/seed.js` and any new files under `server/seed/` — demo seed data.
- `server/ollama.js` — only the model defaults and the warm-up logic. Do not change `chatReply` behavior beyond defaults.
- `server/help-score.js`, `server/urgency.js`, `server/screening-stats.js` — supporting logic.
- `server/routes/*` — except do not change intake-creation endpoints in ways that affect the form.
- `client/src/pages/Dashboard.jsx`, `client/src/pages/IntakeDetail.jsx`, `client/src/pages/Admin.jsx`, `client/src/pages/Reports.jsx`.
- `client/src/components/*` — except `ScaleSelector.jsx`.
- `server/package.json`, `client/package.json`, `.gitignore`.

## Phases at a glance

| # | Phase | Goal | Files touched | Spec |
|---|---|---|---|---|
| 1 | Model swap & warm-up | Switch to `qwen3:8b`, warm both chat and analyzer paths | `server/ollama.js`, `server/llm/providers/ollama.js`, `server/llm/analyzer.js`, `server/index.js` | `docs/21-phase-1-model-and-warmup.md` |
| 2 | Analyzer prompt slim | Compact `analyzer.md`, drop schema block, restructure inputs to `{{client_block}}` + `{{screening_block}}` | `server/llm/prompts/analyzer.md`, `server/llm/analyzer.js`, `server/store.js` | `docs/22-phase-2-analyzer-prompt-slim.md` |
| 3 | SQLite persistence | `better-sqlite3`-backed store, identical API surface | `server/store.js`, `server/admin-store.js`, `server/package.json`, `.gitignore` | `docs/23-phase-3-sqlite-persistence.md` |
| 4 | Rich demo seeds | 5 pre-computed seed cases (Low → Crisis) with full `analysis` objects, loaded from `server/seed/*.json` | `server/seed.js`, new files under `server/seed/` | `docs/24-phase-4-rich-demo-seeds.md` |
| 5 | Dashboard polish | KPI strip, severity-first sort, DEMO tag, re-run UX | `client/src/pages/Dashboard.jsx`, `client/src/pages/IntakeDetail.jsx` | `docs/25-phase-5-dashboard-polish.md` |
| 6 | Fallback polish | Graceful failure copy for `safeFallback` | `server/llm/analyzer.js` | `docs/26-phase-6-fallback-polish.md` |

## Dependencies and ordering

- Phase 1 is independent and can land first.
- Phase 2 is independent of Phase 1 but most testable together (so verify Phase 2 with the new model active).
- Phase 3 (SQLite) must land **before** Phase 4 (seeds) so the seed script writes into the persistent store.
- Phase 4 is the dashboard's content; Phase 5 is its polish, so 4 → 5.
- Phase 6 is independent and can land any time, but is most useful after Phase 2.

A safe sequence: **1 → 2 → 3 → 4 → 5 → 6**.

If time is short the day of the demo, the minimum-viable subset is **1 → 4 → 6** (faster model, pre-baked rich seeds, graceful failures) — Phase 2 and 3 can land after the demo without affecting it visibly.

## Demo-day checklist (post-implementation)

Before the demo, the engineer running it should verify:

1. `ollama serve` is running.
2. `ollama list` shows `qwen3:8b`.
3. From the project root, `npm run dev` starts both server and client cleanly.
4. The server log prints both warm-up complete lines (chat + analyzer).
5. Visit `/dashboard` — all five seeded cases appear with severities ranging from low to crisis, each showing a populated Help Score ring and severity pill (no "legacy" badges).
6. Click into the crisis case — the crisis banner is present, risk flags show self-harm checked, AI comments are populated, recommended programs include 988.
7. Walk a fresh intake end-to-end — the post-submit "Generating summary…" should resolve within ~5–10 seconds on `qwen3:8b`.
8. If anything fails mid-demo, the fallback copy from Phase 6 should read as a calm "manual review needed" rather than "analysis failed."

## How to use these docs

- Each phase doc is self-contained: read it top-to-bottom, work the steps, verify the acceptance criteria.
- `prompts/10-demo-readiness-prompts.md` contains paste-ready prompts that point Claude Code at the relevant spec file by absolute path.
- Phases are independently reversible; rollback notes are at the bottom of each phase doc.
- If something forces a deviation from the spec, edit the spec doc first, then implement. The doc is the source of truth.

## Out of scope for these phases

- Authentication / authorization.
- Real PHI / HIPAA handling.
- Production deployment.
- Changing the screening questions or the contact form.
- Changing the popover chat behavior.
- Changing the landing page or marketing copy.
- Streaming responses to the client during intake submission.

If any of these become important later, they get their own phase docs.
