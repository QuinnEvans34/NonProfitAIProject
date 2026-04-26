# Implementation Prompts

These are paste-ready prompts for the Claude extension. Each one builds a
specific slice of Hope Connect. They reference docs in `/docs` — keep that
folder open in your editor so the assistant can read them.

## Order

Run them in this order. Each prompt assumes the previous ones are merged.

| # | Prompt | Builds |
|---|---|---|
| 01 | `01-analyzer-foundation.md` | `server/llm/` — schema, providers, analyzer, prompt template |
| 02 | `02-help-score.md` | `server/help-score.js` + tests |
| 03 | `03-wire-intake-flow.md` | Wires analyzer + help-score into `intake-flow.js`, extends `store.js` |
| 04 | `04-design-tokens-and-icons.md` | New CSS tokens, lucide install, `client/src/lib/` |
| 05 | `05-intake-detail-redesign.md` | Rebuilds `IntakeDetail.jsx` to surface analyzer output |
| 06 | `06-dashboard-polish.md` | Polishes `Dashboard.jsx` and `App.jsx` nav |
| 07 | `07-admin-page.md` | Builds `/admin` page + `server/routes/admin.js` |
| 08 | `08-reports-page.md` | Builds `/reports` page + `server/routes/reports.js` |
| 09 | `09-eval-harness.md` | Builds `server/llm/eval/` + 10 fixtures |

## How to run a prompt

1. Open the Claude extension in your editor with the repo root
   (`NonProfitAIProject/`) as the working directory.
2. Paste the entire contents of the prompt file into the chat.
3. Let it work. It will read the doc files it needs, write code, and tell
   you when each acceptance criterion is met.
4. Review the diff. If something's off, push back in the same conversation
   — the prompts are self-contained but not infallible.
5. Test the change locally (`npm run dev`).
6. Commit, then move to the next prompt.

## What every prompt assumes

- The repo root is `NonProfitAIProject/`.
- The frontend lives in `client/`, the backend in `server/`.
- Existing files (`server/intake-flow.js`, `server/urgency.js`, etc.) are
  treated as code to read and respect, not to rewrite.
- Inline styles are OK in JSX; new shared styles go in
  `client/src/index.css`.
- ES modules, no TypeScript, no new build tooling.

## What every prompt forbids

- Touching the persistence layer beyond extending `server/store.js` field
  shapes. No SQLite, no JSON-file dump, no Postgres until Quinn says so.
- Touching the user-facing intake chat (`client/src/pages/IntakeChat.jsx`).
  That's Ted's territory.
- Changing the regex urgency floor. New patterns go through the admin page,
  not by editing `urgency.js` directly.
- Adding a UI library beyond `lucide-react`.
