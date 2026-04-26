# Hope Connect — Design & Implementation Docs

This folder is the spec library for Quinn's slice of Hope Connect: AI analysis,
severity, admin, reporting. Every doc here is the source of truth that the
prompts in `/prompts` reference. If a prompt and a doc disagree, the doc wins.

## How to use this folder

1. Read `00-vision-and-scope.md` first to anchor what we're building and what
   we're explicitly not building this sprint.
2. Skim `01-architecture.md` so the file layout in your head matches the file
   layout we'll create.
3. When you're about to run a prompt from `/prompts`, that prompt names the
   docs it expects you to have read. Read those, then run.

## Files

| File | Purpose |
|---|---|
| `00-vision-and-scope.md` | What we're building, what we're not, decisions locked in |
| `01-architecture.md` | Backend layout for the LLM analyzer + provider abstraction |
| `02-analyzer.md` | The full analyzer contract — JSON schema, prompt template, examples |
| `03-help-score.md` | Deterministic 0-100 help score rubric |
| `04-design-system.md` | Colors, type, spacing, lucide-react icon usage, component patterns |
| `05-page-admin.md` | Admin page spec |
| `06-page-reports.md` | Reporting page spec |
| `07-page-intake-detail.md` | Detail page redesign to surface analyzer output |
| `08-page-dashboard.md` | Dashboard polish (icons + score column) |
| `09-eval-harness.md` | Golden-set evaluation harness for the analyzer |
| `10-conventions.md` | Code, naming, and UX conventions across the project |

## What's deliberately not in here

- **Database / persistence.** Discussion pending the Monday meeting. We're
  staying on the existing in-memory `server/store.js` until that lands.
- **Auth.** Out of scope for the demo per the existing README.
- **Questionnaire UI.** Owned by Ted. The analyzer treats his Q/A list as
  input — we don't dictate his form structure.
- **Hosted LLM provider.** The company will choose. We build to a clean
  provider interface so swapping is one file.
