# 25 — Phase 5: Dashboard Polish

## Goal

Make the staff-facing dashboard and intake detail views feel like a finished product rather than a prototype. Specifically: add a KPI summary strip at the top of `/dashboard`, sort rows by severity (crisis → high → medium → low) within each created-date group, surface a small "DEMO" tag on seeded intakes (using the `isDemoData` flag added in Phase 4), and polish the "Re-run analysis" loading and error states on the detail view.

Time estimate: 30–60 minutes depending on how much polish lands.

## Hard rule — DO NOT TOUCH THE INTAKE

This phase touches only staff-facing pages. Do not change any of the following:

- `client/src/pages/IntakeChat.jsx` — including the floating chat popover and the SubmittedView
- `client/src/pages/LandingPage.jsx`
- `client/src/lib/screening-questions.js`
- `server/screening-questions.js`
- `server/intake-flow.js`
- `server/prompts.js`
- The popover chat behavior

Phase 5 is entirely in `client/src/pages/Dashboard.jsx` and `client/src/pages/IntakeDetail.jsx`. The KPI data comes from the existing `/api/reports/summary` endpoint — no server changes are needed.

## Files to read first

- `client/src/pages/Dashboard.jsx` — current dashboard
- `client/src/pages/IntakeDetail.jsx` — current detail page
- `client/src/lib/api.js` — confirm `api.reportSummary` exists
- `server/routes/reports.js` — confirm the `/api/reports/summary` payload shape
- `client/src/components/SeverityPill.jsx`, `ScoreRing.jsx`, `StatusBadge.jsx` — existing badge components

## Files to modify

- `client/src/pages/Dashboard.jsx`
- `client/src/pages/IntakeDetail.jsx`

## Background

The dashboard today shows a table with one row per intake — Client, Category, Severity, Score, Status, Updated. It already has filters and a polling refresh every 10 seconds.

What's missing for a "feels like a product" demo:

1. **No at-a-glance overview.** A staff member opening the page should see how many cases are open, how many are high+crisis, and the average help score — without scanning the table.
2. **No deterministic ordering by urgency.** The table sorts by `createdAt DESC` (set in `server/store.js`). A crisis case from this morning sits below a low-severity intake from five minutes ago. Severity should be the primary sort key, with `createdAt` as a tie-breaker.
3. **No visual marker for seeded data.** During the demo, the engineer should be able to tell at a glance which rows are seeds and which is the live walked intake. A subtle "DEMO" pill solves this.
4. **The "Re-run analysis" button's loading state is weak.** Current UX is just `disabled + opacity 0.6 + "..." dots`. A demo-grade button shows clear feedback and surfaces errors as toasts, not inline text.

## Steps

### 1. Add a KPI strip to `Dashboard.jsx`

Above the existing header row (which has the page title and filters), insert a new horizontal strip that fetches `/api/reports/summary?range=all` and shows three KPIs:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Total intakes   │   Open high+crisis   │   Avg help score                  │
│      5           │       2              │       46                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

Implementation sketch:

```jsx
// Inside Dashboard component, alongside the existing useState declarations:
const [kpis, setKpis] = useState(null);

useEffect(() => {
  api.reportSummary({ range: 'all' })
    .then((data) => setKpis(data.kpis))
    .catch(() => { /* silent — KPI strip just won't render */ });
}, [intakes.length]);   // refetch when intake count changes
```

The strip itself sits between the header and the filter row:

```jsx
{kpis && (
  <div className="dashboard-kpi-strip" style={{
    display: 'flex',
    gap: 'var(--space-4)',
    padding: 'var(--space-3) var(--space-4)',
    background: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border-light)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)',
  }}>
    <KpiCell label="Total intakes" value={kpis.totalIntakes} />
    <KpiDivider />
    <KpiCell label="High + Crisis" value={kpis.highOrCrisisCount} accent="urgent" />
    <KpiDivider />
    <KpiCell label="Avg help score" value={kpis.averageHelpScore} />
  </div>
)}
```

`KpiCell` and `KpiDivider` are tiny local components — the existing `Reports.jsx` has a `KpiTile` component that can be adapted, or write a minimal inline version. Keep visual weight light; this is a strip, not the centerpiece.

### 2. Sort intakes by severity, then `createdAt`

Today's filter pipeline:

```js
const filtered = intakes.filter(...);
```

After filtering, sort by severity rank (crisis → high → medium → low) and then by `createdAt DESC` within the same severity. Add this helper near the top of the file:

```js
const SEVERITY_RANK = { crisis: 0, high: 1, medium: 2, low: 3 };

function severityOf(intake) {
  return intake.analysis?.severity?.level || intake.urgencyFlag || 'low';
}

function compareIntakes(a, b) {
  const aRank = SEVERITY_RANK[severityOf(a)] ?? 4;
  const bRank = SEVERITY_RANK[severityOf(b)] ?? 4;
  if (aRank !== bRank) return aRank - bRank;
  return new Date(b.createdAt) - new Date(a.createdAt);
}
```

Apply it after filtering:

```js
const filtered = intakes
  .filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    const effectiveLevel = i.analysis?.severity?.level || i.urgencyFlag;
    if (urgencyFilter !== 'all' && effectiveLevel !== urgencyFilter) return false;
    return true;
  })
  .sort(compareIntakes);
```

This places crisis cases at the top regardless of when they came in — which is the right default for triage.

### 3. Add a "DEMO" pill on seeded rows

In the table row, next to the client name, conditionally render a small pill when `intake.isDemoData === true`:

```jsx
<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
  {intake.crisisFlag && (
    <ShieldAlert size={14} aria-hidden style={{ color: 'var(--color-crisis-text)' }} />
  )}
  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
    {intake.clientName || '(unnamed)'}
  </span>
  {intake.isDemoData && (
    <span style={{
      fontSize: 'var(--text-xs)',
      fontWeight: 700,
      letterSpacing: '0.05em',
      color: 'var(--color-text-tertiary)',
      background: 'var(--color-surface-raised)',
      border: '1px solid var(--color-border-light)',
      borderRadius: 'var(--radius-xs)',
      padding: '0.05rem 0.35rem',
      textTransform: 'uppercase',
    }}>
      Demo
    </span>
  )}
</span>
```

Subtle and gray — not loud. The engineer running the demo can spot it; an audience watching won't be distracted by it.

### 4. Polish "Re-run analysis" on `IntakeDetail.jsx`

Today's flow uses `setReanalyzeError` to show errors inline below the button. Improve in three small ways:

(a) Replace the inline error with a transient toast pill that auto-clears after 4 seconds:

```js
useEffect(() => {
  if (!reanalyzeError) return;
  const t = setTimeout(() => setReanalyzeError(''), 4000);
  return () => clearTimeout(t);
}, [reanalyzeError]);
```

(b) Show a clearer loading state on the button itself — replace the dots with a spinning icon (similar to the dashboard's `SpinningRefresh`):

```jsx
<button
  onClick={handleReanalyze}
  disabled={reanalyzing}
  className="btn-secondary"
  style={{ fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
>
  <RefreshCw
    size={12}
    aria-hidden
    style={reanalyzing ? { animation: 'spin 1s linear infinite' } : undefined}
  />
  {reanalyzing ? 'Re-running analysis…' : 'Re-run analysis'}
</button>
```

Add a small keyframes block near the top of the JSX or in `index.css`:

```css
@keyframes spin { to { transform: rotate(360deg); } }
```

(c) When re-analysis succeeds, briefly show a green check next to the button for 2 seconds:

```js
const [justRan, setJustRan] = useState(false);
async function handleReanalyze() {
  setReanalyzing(true);
  setReanalyzeError('');
  try {
    const updated = await api.reanalyzeIntake(id);
    hydrateFromIntake(updated);
    setJustRan(true);
    setTimeout(() => setJustRan(false), 2000);
  } catch (err) {
    setReanalyzeError(err.message);
  }
  setReanalyzing(false);
}
```

In the JSX next to the button:

```jsx
{justRan && (
  <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
    ✓ Updated
  </span>
)}
```

### 5. Confirm no stray "(legacy)" badges

After Phases 3 and 4, every seeded intake has a populated `analysis` object. The "(legacy)" badge in Dashboard.jsx that reads `const isLegacy = !intake.analysis;` should only ever appear on intakes that *truly* lack analysis (e.g., a fresh intake mid-analysis). Verify during testing that opening the dashboard immediately after seeding shows zero "(legacy)" badges.

If during your testing a brand-new intake briefly shows "(legacy)" between submit and analyzer completion — that's expected behavior; do not change it.

## Acceptance criteria

- A KPI strip is visible at the top of `/dashboard` showing total, high+crisis, and average help score.
- Crisis-severity rows appear at the top of the table regardless of created date.
- High-severity rows appear above medium, medium above low, with each severity group sorted by created date descending.
- Seeded intakes show a small "DEMO" pill next to the client name.
- Clicking "Re-run analysis" on IntakeDetail shows a spinning icon while running and a brief green "✓ Updated" message on success.
- Errors during re-analysis show as a transient pill that disappears after 4 seconds.
- No "(legacy)" badges appear on seeded data.
- Nothing about the intake form or its popover chat changes.

## Verification steps

1. With Phase 4's seeded data in place, open `/dashboard`. Confirm the KPI strip shows Total: 5, High+Crisis: 2, Avg help score: a non-zero number.
2. Confirm the row order is Alex Chen (crisis), James Thompson (high), then the two medium cases, then Maria Garcia (low).
3. Confirm each row shows the "DEMO" pill.
4. Open any seed in IntakeDetail. Click "Re-run analysis". Confirm the spinning icon, the success check, and the analysis updates.
5. Temporarily kill `ollama serve`, then click "Re-run analysis". Confirm the transient error pill appears and clears in 4 seconds.

## Rollback

Revert `Dashboard.jsx` and `IntakeDetail.jsx` from git history. No persistent data is touched in this phase.

## Notes

- The KPI strip uses the existing `/api/reports/summary` endpoint, which already serves the data. No backend work needed.
- Severity-first sort can feel "wrong" if you're used to chronological ordering, but for a triage view it's the correct default. If staff prefer chronological, that's a future toggle.
- The "DEMO" pill is intentionally low-contrast — it's a hint for the engineer, not a feature for the audience.
