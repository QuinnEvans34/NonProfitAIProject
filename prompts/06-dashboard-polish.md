# Prompt 06 — Dashboard Polish

You are working in the Hope Connect repo. The detail page is rebuilt
(prompt 05). Now we polish the dashboard so it matches the rest of the
app's visual quality.

## Read first

1. `docs/08-page-dashboard.md` ← the spec
2. `docs/04-design-system.md`
3. `client/src/pages/Dashboard.jsx` — what's there today
4. `client/src/components/StatusBadge.jsx`
5. `client/src/components/ScoreRing.jsx`, `EmptyState.jsx`
6. `client/src/lib/icons.js`, `client/src/lib/api.js`

## Your scope

Modify `client/src/pages/Dashboard.jsx` per the spec. No new pages. No
backend changes.

## Changes (in order)

1. **Loading and empty states.** Replace the inline "Loading..." and
   "No intakes yet..." strings with `<EmptyState>` components per the
   spec. Loading: spinning `RefreshCw` icon (CSS animation,
   `1s linear infinite`). Empty: `ClipboardList` icon.

2. **Severity column.** Rename the existing `<th>Urgency</th>` to
   `<th>Severity</th>`. The cell now shows `<SeverityPill level={...} />`
   sourced from `intake.analysis?.severity?.level || intake.urgencyFlag`
   (so legacy intakes still render). When `analysis` is null, append a
   tiny `(legacy)` suffix in `--color-text-tertiary` to be honest about
   what's being shown.

3. **Help Score column.** Insert a new `<th>Score</th>` between
   **Severity** and **Status**. Cell renders
   `<ScoreRing score={intake.helpScore || 0} size={28}
   severity={intake.analysis?.severity?.level || 'low'} />`. If
   `helpScore` is null/undefined (legacy), render an em-dash in
   `--color-text-tertiary`.

4. **Crisis indicator promotion.** In the client name cell, when
   `intake.crisisFlag` is true, prepend a `ShieldAlert` icon at 14px
   in `--color-crisis-text`, sitting `0.4rem` left of the name. Keep
   the row's tinted background and red left border.

5. **Category icon.** Prepend a 14px lucide icon to each category cell
   based on a small mapping. Add the mapping to `lib/icons.js` if it's
   not there yet:

   ```js
   export const CATEGORY_ICON = {
     Housing: Home,
     Food: Heart,
     Healthcare: Activity,
     Employment: User,
     Legal: FileText,
     Utilities: Lightbulb,
     Other: Sparkles,
   };
   ```

   Use `--color-text-tertiary` for the icon. The category text stays
   `--color-text-secondary`.

6. **Filter strip ergonomics.** Wrap the existing filter `<select>`s
   with a leading `Filter` icon (decorative, `aria-hidden`) so the
   group reads as a unit:

   ```
   [Filter icon]  All statuses ▾   All severity ▾   Clear
   ```

   Rename "All urgency" to "All severity" since the column is now
   severity.

7. **Urgent count chip.** Prepend an `AlertTriangle` icon at 12px
   inside the chip. Same color as the chip text.

8. **Bottom-of-page hint.** Below the table, add a small caption-style
   row (only visible when there's at least one intake) that says:

   ```
   Updated automatically every 10 seconds · Last refreshed 11:42 AM
   ```

   Track the last-refreshed timestamp in component state. `--text-xs`,
   `--color-text-tertiary`, centered.

## Acceptance criteria

- The dashboard with a couple of test intakes looks dense, organized,
  and consistent with the new detail page.
- Severity pill colors match `IntakeDetail`'s severity pill colors.
- Score ring colors match the severity band on the same row.
- Legacy intakes (from `seed.js`) still render with `(legacy)` suffix
  on the severity pill and an em-dash in the score column.
- Filters still work end-to-end.
- Crisis rows are still visually distinct and the `ShieldAlert` is
  prominent next to the client name.

## What NOT to do

- Don't introduce sortable column headers. Out of scope.
- Don't paginate the table.
- Don't add row-level checkboxes or bulk actions.
- Don't refactor the filter `<select>` into a custom dropdown component.
  The native ones are fine and accessible.
- Don't change the polling interval or fetch logic.

## Done means

The dashboard is the first page anyone sees and now feels like a
finished product. Quinn can show it in the demo with confidence.
