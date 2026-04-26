# Dashboard — Polish

Path: `/dashboard`. Audience: case manager triaging the inbox. The existing
page (`client/src/pages/Dashboard.jsx`) is solid. We're not redesigning it —
we're polishing.

## Changes

1. **New nav with icons.** The `nav` in `App.jsx` currently has plain text
   links. Add lucide icons before each label so the app feels like a
   product, not a prototype:
   - New Intake → `MessageSquare`
   - Dashboard → `LayoutDashboard`
   - Admin → `Settings`
   - Reports → `BarChart3`

   Icons should be 16px, `strokeWidth={2}`, sit `0.4rem` left of the label.
   Active link keeps the existing brand-colored bottom border.

2. **Help score column.** Insert a new column between **Urgency** and
   **Status** showing the help score as a small 28-px score ring with the
   number centered. No tooltip on the ring at the dashboard level — the
   detail page is where the breakdown lives.

3. **Severity column rename.** Rename the existing **Urgency** column to
   **Severity**. The data in the column comes from `analysis.severity.level`
   (with floor enforcement) when present, falling back to `urgencyFlag` when
   the analyzer hasn't run yet (legacy intakes).

4. **Crisis indicator promotion.** When `crisisFlag` is true, instead of
   just changing the row's left border color, prepend a `ShieldAlert` icon
   inline with the client's name in red. Keep the row-tinted background.

5. **Empty / loading states.** Replace the plain "Loading..." and "No
   intakes yet" text with the standard `EmptyState` component (see design
   system). Loading state: `RefreshCw` icon spinning. Empty state:
   `ClipboardList` icon + "No intakes yet — when a client completes intake,
   they'll show up here."

6. **Filter ergonomics.** Wrap the inline filters (status / severity / clear)
   in a small `Filter` icon-led group:

   ```
   [Filter] All statuses ▾    All severity ▾    Clear
   ```

   Filter icon is decorative, not interactive. Doesn't expand a tray —
   it's just a visual anchor.

7. **Urgent count chip.** Already exists. Add an `AlertTriangle` icon
   inside it.

## Per-row touches

- Client name cell: if `crisisFlag`, prepend `ShieldAlert` in
  `--color-crisis-text`. Otherwise no icon.
- Category cell: prepend the category's lucide icon (same mapping as
  Recommended Programs — Heart for food, Home for housing, etc.) at 14px,
  color `--color-text-tertiary`.
- Updated cell: keep "11h ago" format, no change.

## Sort order

Existing implicit sort is `createdAt` desc. Don't change for this sprint.
Adding a sortable header is tempting but out of scope.

## What stays the same

- Two-row header (title + filter strip).
- Card-wrapped table.
- Row click navigation to `/dashboard/:id`.
- 10-second polling for fresh data.

## Don't do

- Don't paginate. With the in-memory store and demo volumes, a single
  scrolling table is fine. Revisit when the DB question is answered.
- Don't add bulk actions, multi-select, or row checkboxes. Out of scope.
- Don't add a "card view" toggle. Keep the table.
