# Reports Page

Path: `/reports`. Audience: case-manager lead and Quinn (and the demo
audience). The job: show that the structured analyzer output is
aggregable — that the system isn't just generating one-off summaries but
producing data that lets the org understand its caseload.

## Layout

```
┌────────────────────────── nav ────────────────────────────┐
│  BarChart3 icon  Reports                                  │
│  Caseload patterns from analyzed intakes.                 │
│  ┌ Time range ──┐ ┌ Category ─┐ ┌ Severity ─┐ [Download]  │
│  │ Last 30 days▾│ │ All       ▾│ │ All      ▾│            │
│  └──────────────┘ └────────────┘ └────────────┘            │
│                                                            │
│  ┌ KPI tiles row ──────────────────────────────────────┐  │
│  │ Total | Avg score | High+ | Crisis flagged          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌ 2-column grid ──────────────────────────────────────┐  │
│  │ Category distribution     │ Severity distribution    │  │
│  │ (horizontal bars)         │ (donut chart)            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌ Full-width ─────────────────────────────────────────┐  │
│  │ Help score over time (line chart)                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌ 2-column grid ──────────────────────────────────────┐  │
│  │ Top tags                  │ Top keywords             │  │
│  │ (table)                   │ (table)                  │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## KPI tiles

Four tiles, equal width on desktop, 2x2 grid under 768px:

1. **Total intakes** — count in current filter window.
2. **Average help score** — mean across filter window. Tabular numerals.
3. **High or crisis** — count of intakes where severity ≥ high.
4. **Crisis flagged** — count of intakes where regex or analyzer set crisis.

Each tile shows a delta vs the previous equivalent window
("+12 vs prior 30 days") in `--color-success` if up, `--color-text-secondary`
if flat or down. Color is **direction**, not value judgment.

## Category distribution

Horizontal bar chart, one row per `NEED_CATEGORIES` value. Bar width is
proportional to count. Show count and percent at the end of each bar.

Stack secondary categories as a lighter shade behind the primary so we don't
hide the fact that many cases involve multiple needs.

```
Housing    ████████████████████  42 (29%)
Food       ███████████░░░░       28 (19%)
Healthcare ███████░░░             18 (12%)
…
```

Implementation note: SVG-rendered bars with raw React, no chart library,
keeps the bundle small and the render predictable.

## Severity distribution

Donut chart with four segments — crisis, high, medium, low — using the
`--score-fill-*` colors from the design system. Center label shows the
total count. Legend on the right of the donut.

Use a small inline SVG donut. Don't pull in a chart library for this; the
math is `<svg><circle stroke-dasharray=...>` and a few segments.

## Help score over time

Line chart, x-axis is date (binned by day if range ≤ 60 days, by week
otherwise), y-axis is mean help score for that bin.

If we ever ship Recharts later this is one swap. For now, a plain SVG line
with a faint area fill underneath using `--color-brand-light`.

## Top tags / top keywords

Two side-by-side tables, top 10 each. Columns: tag/keyword, count, percent of
intakes containing it. Click a row to add it as a search filter on the
Dashboard.

## Filters

Four controls in the header strip:

- Time range — dropdown: Last 7 days, Last 30 days, Last 90 days, Year to
  date, All time. Default Last 30 days.
- Category — dropdown listing `NEED_CATEGORIES`. Default All.
- Severity — dropdown listing the four levels. Default All.
- Download CSV — primary button on the right.

Filters apply to all panels on the page.

## CSV export

`Download CSV` posts current filters and downloads a CSV with one row per
intake in the filter window. Columns: id, createdAt, clientName, category,
secondary_categories (semicolon-separated), severity, help_score,
crisis_flag, tags (semicolon-separated), staff_facing_summary.

Endpoint: `GET /api/reports/export?…filters` returns `text/csv` with a
`Content-Disposition: attachment` header.

## API endpoints (new in `server/routes/reports.js`)

- `GET /api/reports/summary?range=&category=&severity=` — returns
  `{ kpis, categoryDistribution, severityDistribution, scoreOverTime,
  topTags, topKeywords }` in one call.
- `GET /api/reports/export?…` — CSV.

One endpoint for the full page reduces request waterfalls and matches how
the page renders.

## Empty states

If there are no intakes in the filter window:

```
[BarChart3 icon, 32px, color tertiary]

No intakes in this range yet
Try a wider time range, or complete an intake to start populating reports.

[Reset filters button]
```

If we have intakes but no analyses (e.g., LLM was down), state that
explicitly: "12 intakes in this range, none have analyses yet — analyses
populate when the LLM runs at intake completion."

## Performance

Compute everything server-side from the in-memory store. The page should
render under 200ms locally. If we later move to a DB, the same shape works —
the `summary` endpoint just becomes a few SELECTs and aggregations.
