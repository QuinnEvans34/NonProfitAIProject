# Conventions

Short list of rules that apply across the codebase.

## Code

- ES modules everywhere. `import`/`export`. The repo's `package.json` is
  already `"type": "module"` for the client and the server.
- No TypeScript this sprint. JSDoc types where they help, especially in
  `server/llm/`.
- No build step beyond Vite. Don't add Babel, SWC, esbuild config.
- File names: `kebab-case.js` for backend modules, `PascalCase.jsx` for
  React components.
- Function names: `camelCase`, verbs first. `analyzeIntake`, not
  `intakeAnalysis`.
- One default export per page component; named exports for everything else.
- No try/catch swallowing. Always at least `console.error` the error.

## API

- All routes under `/api/...`.
- New admin routes under `/api/admin/...`. New report routes under
  `/api/reports/...`.
- JSON in, JSON out. No form-encoded bodies.
- Errors return `{ error: string }` with an HTTP status code. The frontend
  reads `error` to display.
- Endpoints are verbs of state, not RPC. `POST /api/intakes/:id/reanalyze`
  is the exception because re-analysis is an action, not a state change.

## React

- Functional components only. Hooks for state.
- No state libraries. `useState` and `useEffect` are enough for this app.
- Inline styles are OK for one-off layout. Repeated styles get a CSS class
  in `index.css`.
- Color values come from CSS variables, never hex literals in JSX.
- New components live in `client/src/components/` and are reused across
  pages. Page-only components stay inline.

## Lucide icons

- Import from `client/src/lib/icons.js`, not directly from `lucide-react`.
- Default size 16 for inline-with-text, 14 for inside small pills, 32 for
  empty-state heroes.
- Decorative icons get `aria-hidden`. Meaning-bearing icons get `aria-label`.

## Copy

- Sentence case for everything. No Title Case Headings. Page titles like
  "Reports", section labels like "Help score", buttons like "Save changes".
- Numbers in product copy: "3 fixtures", not "three fixtures".
- Cautious analyzer language: never "qualifies for", always "may benefit
  from", "should be reviewed for", "reported that".
- Crisis copy is direct, not euphemistic. "If you are in immediate danger,
  call 911" stays exactly as it is.

## Commits / PRs

- Branch names: `quinn/<area>-<short-desc>`, e.g.,
  `quinn/llm-analyzer-foundation`.
- Commits in the imperative: `Add help-score function and tests`.
- One logical change per PR. The implementation prompts are sized to
  produce one PR each.

## What "done" means for a slice

A slice is done when:

1. Code is written and the changed files compile/run.
2. The eval harness still passes (for analyzer changes).
3. The page renders empty + populated states correctly.
4. The relevant doc in `/docs` matches the implemented behavior.
5. README or sprint notes mention what shipped.

If any of those is missing, the slice is not done — even if it "works in
the demo path."
