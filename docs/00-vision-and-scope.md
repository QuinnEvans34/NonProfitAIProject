# Vision & Scope

## What Hope Connect is

An AI-assisted intake and triage tool for a nonprofit. A client completes a
guided intake (multiple-choice with free-text comments). The system then
generates a structured analysis — a staff-facing summary, a severity
classification, a help score, recommended programs, follow-up questions, and
discrete AI comments — for a human "Hope Connector" (case manager) to review.
After review, the system helps pre-fill applications, the client confirms or
fills in missing information, and the case manager does a final audit before
submission to the relevant agency.

The chosen workflow (from Meeting 2) is **Option 1**:

```
User → AI intake → AI analysis → Case manager review/approve →
AI helps pre-fill → User confirms → Case manager final audit → Submit
```

While the user waits for case manager review, the AI surfaces a small set of
**hard-coded approved resources** immediately so they don't sit on their hands.

## Quinn's slice

Out of the four product areas, Quinn owns:

- **AI comments** — short staff-facing observations the analyzer surfaces.
- **Severity levels and keywords** — combined regex floor + LLM classification.
- **Admin route page** — manageable view of keywords, severity overrides, and
  AI comments across cases.
- **Reporting** — aggregations over the structured analyzer output.

Ted owns the public-facing landing page and the questionnaire UI/dropdowns.
Don't break what he's building. The analyzer treats his Q/A pairs as opaque
input — it doesn't care which questions he ends up choosing, only that they
arrive as `{ question, answer }` pairs.

## Decisions locked in

| Decision | Choice | Why |
|---|---|---|
| When does the analyzer run? | **Once at end of intake** | Cheapest, easiest to evaluate, dashboard renders the full analysis on completion. |
| Where is the LLM hosted for the demo? | **Local Ollama (qwen3:30b)** | Matches the existing prototype. Hosted provider is the company's call later. |
| Help score | **Deterministic from severity + categories + risk flags** | Defensible to staff; no model variance to explain away. |
| Crisis detection authority | **Regex floor; LLM may escalate, never de-escalate** | Never trust a generative model as the sole signal for self-harm/abuse. |
| Provider abstraction | **`server/llm/providers/` with `LLM_PROVIDER` env var** | Hosted swap is one file, no caller changes. |
| Persistence | **Keep in-memory `store.js` for now** | Quinn confirming with the team Monday before changing this. |

## Explicit non-goals (for this sprint)

- No database changes.
- No authentication.
- No external program directory integration. The "recommended programs" field
  is populated by the LLM from a hard-coded short list for the demo, with a
  hook to plug in a real directory later.
- No HIPAA/compliance work. Acknowledged and tracked, deferred past the demo.
- No Spanish UI yet. The analyzer detects language and the prompts are
  multilingual-tolerant; the UI strings stay English-only this sprint.

## Sprint 1 success looks like

By the end of Sprint 1 (~May 20, 2026):

- A case manager opens an intake detail page and sees a populated AI
  Summary, a severity badge with an explanation, a help score (0-100) with a
  "why this score" tooltip, AI Comments, follow-up questions, and recommended
  programs — all generated from one analyzer call.
- The Admin page lets Quinn manage keyword patterns, view severity overrides,
  and read every AI comment in one place.
- The Reports page shows category distribution, severity distribution, average
  help score, and a CSV export.
- The eval harness has at least 10 fixtures and runs in `npm run eval:analyzer`.
- The provider abstraction is in place and the company can swap in Azure
  OpenAI / Azure ML / Bedrock without touching `intake-flow.js` or the UI.
