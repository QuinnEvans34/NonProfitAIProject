# Prompt 08 — Build the Reports Page

You are working in the Hope Connect repo. Admin page is built (prompt
07). Now we build the Reports page — aggregations over the analyzer's
structured output.

## Read first

1. `docs/06-page-reports.md` ← the spec
2. `docs/04-design-system.md`
3. `docs/02-analyzer.md`
4. `server/store.js`
5. `client/src/lib/api.js`, `client/src/lib/icons.js`
6. `client/src/components/EmptyState.jsx`

## Your scope

Backend: a new route file with two endpoints. Frontend: a new page that
consumes them. No persistence changes.

### Backend — `server/routes/reports.js`

Wire into `server/index.js`: `app.use('/api/reports', reportsRoutes)`.

#### `GET /api/reports/summary`

Query params: `range`, `category`, `severity`. Defaults: `range=30`
(last 30 days), `category=all`, `severity=all`. `range` accepts `7`,
`30`, `90`, `ytd`, `all`.

Build the response by walking every intake in the in-memory store,
filtering by the params, then aggregating:

```jsonc
{
  "filterApplied": { "range": "30", "category": "all", "severity": "all" },
  "kpis": {
    "totalIntakes":   142,
    "totalIntakesPrev": 130,
    "averageHelpScore": 41.7,
    "averageHelpScorePrev": 39.2,
    "highOrCrisisCount": 38,
    "highOrCrisisCountPrev": 31,
    "crisisFlaggedCount": 6,
    "crisisFlaggedCountPrev": 4
  },
  "categoryDistribution": [
    { "category": "Housing",    "primary": 42, "secondary": 11 },
    { "category": "Food",       "primary": 28, "secondary": 18 },
    …
  ],
  "severityDistribution": [
    { "level": "crisis", "count": 6 },
    { "level": "high",   "count": 32 },
    { "level": "medium", "count": 64 },
    { "level": "low",    "count": 40 }
  ],
  "scoreOverTime": [
    { "bin": "2026-04-01", "averageHelpScore": 38.2, "count": 4 },
    …
  ],
  "topTags":     [ { "tag": "eviction_notice", "count": 14, "pct": 9.9 }, … ],
  "topKeywords": [ { "keyword": "lost my job",  "count": 22, "pct": 15.5 }, … ]
}
```

Bin the `scoreOverTime` series by day if `range` ≤ 60 days, by week
otherwise. Use ISO date strings for `bin`.

`*_Prev` fields are the same metric for the equivalent prior window
(e.g., 30 days before the start of the current 30-day window). Use them
to render the deltas on the KPI tiles.

Intakes without `analysis` are excluded from severity distribution,
score over time, top tags, and top keywords (you can't aggregate what
doesn't exist), but ARE counted in `totalIntakes` and reflected via a
`pendingAnalysisCount` field added to `kpis`.

#### `GET /api/reports/export`

Same query params as `summary`. Returns `text/csv` with
`Content-Disposition: attachment; filename="hope-connect-export-<ts>.csv"`.

Columns:

```
id, createdAt, clientName, category, secondary_categories,
severity, help_score, crisis_flag, tags, staff_facing_summary
```

`secondary_categories` and `tags` are semicolon-separated. The summary
is double-quoted and escaped per RFC 4180.

### Frontend — `client/src/pages/Reports.jsx`

Replace the placeholder from prompt 04 with the real page.

#### Layout

Header strip (icon + title + subtitle), then a filter bar with three
`<select>`s and a primary `Download CSV` button. Below: KPI tile row,
then a 2-column grid (Category distribution, Severity distribution),
then a full-width Score-over-time line, then a 2-column grid (Top tags,
Top keywords).

Use `var(--space-6)` between major sections.

#### KPI tiles

Build a small `<KpiTile />` inline component (one component, four
instances). Props: `label`, `value`, `delta`, `icon`. Style per
`docs/04-design-system.md`'s `kpi-tile` pattern. Add a corresponding
`.kpi-tile` class to `index.css`.

#### Category distribution (horizontal bars)

Pure SVG implementation, one row per `NEED_CATEGORIES`. Each row:

- Category label (left, fixed width 120px).
- Bar (fills to width based on max count).
- Count and percent label at the bar's end.

Stack the secondary count as a lighter overlay behind the primary,
using `--color-brand` and `--color-brand-light`.

Animate width on first render with a CSS transition.

#### Severity distribution (donut)

Pure SVG donut. Four arcs using the `--score-fill-*` colors. Center
shows the total count. Right of the donut: a small legend with each
level's color swatch, label, count, and percent.

#### Score over time (line)

Pure SVG line + light area fill underneath using `--color-brand-light`.
X-axis labels: 4–6 evenly spaced bin labels. Y-axis: implicit, with a
small tick at 0, 50, 100. Add a hover state showing the value on the
nearest bin.

Don't pull in a chart library for this. Hand-rolled SVG keeps the
bundle small and the visual consistent with the donut.

#### Top tags / Top keywords

Two side-by-side `<table>`s. Three columns each: tag/keyword, count,
% of intakes. Click a row navigates to `/dashboard?search=<value>`
(the dashboard search isn't a feature yet — for the demo, just have
the link land on `/dashboard` for now and leave a TODO comment).

#### Filters

`Time range` select. `Category` select listing `NEED_CATEGORIES` plus
"All". `Severity` select listing the four levels plus "All".

When any non-default filter is active, show a `Clear` link to the right.

#### Download CSV

Primary button. `onClick`: `window.location.href = api.reportExportUrl(currentFilters)`.

#### Empty / partial states

If `kpis.totalIntakes === 0`: full-page empty state per spec.

If `kpis.totalIntakes > 0` but `kpis.pendingAnalysisCount === kpis.totalIntakes`:
show KPI tiles but replace the chart panels with an inline notice:
"All intakes in this range are pending analysis. Charts populate once
the analyzer runs."

## Acceptance criteria

- `/reports` loads and shows real numbers when at least one analyzed
  intake exists (use `seed.js` and a fresh demo intake to verify).
- Filters update the data without a page reload.
- All four KPI tiles populate correctly.
- The bar / donut / line charts render correctly with edge cases:
  - 0 intakes → empty state
  - 1 intake → all charts still render without div-by-zero
  - All intakes in same category → bar chart is dominated by one bar
- CSV export downloads a file matching the columns spec; opens cleanly
  in Excel and Google Sheets.
- The page uses only design-system colors and components.
- No chart library installed.

## What NOT to do

- Don't introduce `recharts`, `chart.js`, or any other charting library.
- Don't add server-side caching. The aggregation is fast enough on the
  in-memory store.
- Don't add date-range pickers. The dropdown is fine for the demo.
- Don't add scheduled report emails or any persistence.
- Don't try to make the SVG charts responsive past collapsing the
  2-column grid to a single column under 900px.

## Done means

Quinn can show Reports in the demo, change filters live, and download
a CSV that opens correctly in a spreadsheet. The page looks like a
finished product matching the rest of the app.
