# Design System

There's already a clean token system in `client/src/index.css`. Don't
reinvent it. This doc names the patterns and adds a few new tokens for the
new pages.

## Tokens that already exist (use these)

Brand:
- `--color-brand` `#1a5632` — deep nonprofit green, primary buttons, active nav
- `--color-brand-light` `#e8f5ee` — focus halos, score-arc background
- `--color-brand-hover` `#155a2a`
- `--color-brand-muted` `#2d7a4a`

Surfaces and text: `--color-bg`, `--color-surface`, `--color-surface-raised`,
`--color-surface-inset`, `--color-text-primary` / `-secondary` / `-tertiary`
/ `-muted`. Borders: `--color-border-light`, `--color-border-medium`.

Status colors: `--color-crisis-bg`/`-border`/`-text`, `--color-urgent-bg`/`-border`,
`--color-success`/`-bg`/`-border`.

Shadows `--shadow-xs` → `--shadow-lg`, radii `--radius-xs` → `--radius-full`,
type ramp `--text-xs` → `--text-3xl`, `--font-sans`, layout `--nav-height`,
`--content-max`.

## New tokens to add

Append to `:root` in `client/src/index.css`:

```css
/* Severity (analyzer-driven) — different shade family from urgency banding */
--color-sev-crisis-bg: #fdf2f8;
--color-sev-crisis-border: #fbcfe8;
--color-sev-crisis-text: #9d174d;
--color-sev-high-bg: #fef2f2;
--color-sev-high-border: #fecaca;
--color-sev-high-text: #991b1b;
--color-sev-medium-bg: #fffbeb;
--color-sev-medium-border: #fde68a;
--color-sev-medium-text: #92400e;
--color-sev-low-bg: #f0fdf4;
--color-sev-low-border: #bbf7d0;
--color-sev-low-text: #166534;

/* Help-score arc */
--score-track: #e2e8f0;
--score-fill-low: #94a3b8;
--score-fill-med: #f59e0b;
--score-fill-high: #ef4444;
--score-fill-crisis: #be185d;

/* Spacing — the existing CSS uses ad-hoc rem values; introduce a scale */
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.25rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-10: 2.5rem;
```

Don't migrate every existing inline rem to these tokens. Use them in **new**
code (Admin, Reports, IntakeDetail redesign). Existing IntakeChat stays as-is.

## Typography rules

- Page titles: `--text-2xl`, `font-weight: 700`, `letter-spacing: -0.02em`.
- Section titles: `--text-sm`, `font-weight: 600`, no transform.
- Field labels (uppercase eyebrows): `--text-xs`, `font-weight: 600`,
  `color: var(--color-text-tertiary)`, `text-transform: uppercase`,
  `letter-spacing: 0.05em`.
- Body copy: `--text-base`, `line-height: 1.65`.
- Numbers in widgets: `--text-3xl`, `font-weight: 700`, `font-feature-settings:
  "tnum"` (tabular numerals so they don't dance).

## Lucide icons

`lucide-react` is the icon library. Install:

```bash
npm install --prefix client lucide-react
```

Centralize imports in `client/src/lib/icons.js`. Other files import named
icons from `../lib/icons`, not directly from `lucide-react`. This keeps the
icon vocabulary small and visible.

```js
// client/src/lib/icons.js
export {
  Home,
  LayoutDashboard,
  ShieldAlert,
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Save,
  RefreshCw,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  Settings,
  Users,
  User,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Heart,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Lightbulb,
  HelpCircle,
  FileText,
  ClipboardList,
  TrendingUp,
  BarChart3,
  PieChart,
  Tag,
  Tags,
  Hash,
  Languages,
  Sparkles,
} from 'lucide-react';
```

Default props for icons used inline with text:

```jsx
<Heart size={14} strokeWidth={2} aria-hidden />
```

For icons that carry meaning (status, severity), give them an `aria-label`
and never an `aria-hidden`.

## Standard component patterns

### `card`
Already defined. Use as the default container: white surface, rounded,
1-px border, `shadow-xs`. Don't add extra borders inside cards.

### `pill`
Small pill for tags, statuses, urgency:

```jsx
<span style={{
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.2rem 0.6rem',
  borderRadius: 'var(--radius-full)',
  border: '1px solid var(--color-border-light)',
  background: 'var(--color-surface-raised)',
  fontSize: 'var(--text-xs)',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
}}>
  <Tag size={12} aria-hidden />
  food_insecure
</span>
```

### `severity-pill`
Map to one of the four `--color-sev-*` triples, plus an icon:
- crisis → `<ShieldAlert size={12} />`
- high → `<AlertTriangle size={12} />`
- medium → `<AlertCircle size={12} />`
- low → `<Check size={12} />`

### `kpi-tile`
For Reports KPIs:

```
┌──────────────┐
│ Total intakes│   ← label, --text-xs uppercase tertiary
│   142        │   ← number, --text-3xl 700 tnum
│ +12 this wk  │   ← delta, --text-xs success/secondary
└──────────────┘
```

Card surface, `padding: var(--space-5)`, fixed height `108px`, KPIs flow as
a 4-column grid that collapses to 2 columns under 768px.

### `score-ring`
Help-score widget. SVG circle, two arcs (track + fill), number centered.
56-px ring on cards, 40-px ring on table rows. Color of fill comes from
`--score-fill-*` based on severity band, not score range, so it lines up
visually with the severity pill on the same row.

### `empty-state`
For pages with no data yet:

```
[lucide icon, 32px, color tertiary]

Title (--text-md, 600, primary)
Subtitle (--text-sm, secondary, max 480px wide)
[optional secondary button]
```

## Layout rules

- Page padding: `var(--space-5)` top/sides on small, `var(--space-6)` on
  desktop. Bottom always `var(--space-8)` so the user has breathing room.
- Card stacks: `gap: var(--space-3)` (compact) or `var(--space-4)` (default).
- Section spacing: at least `var(--space-6)` between major sections on a page.

## Motion

- Hover transitions: `0.12s` ease for color/border. Already done correctly in
  `index.css`. Don't extend beyond 0.18s for any UI element.
- Loading: prefer the existing `.typing-dots` blink animation for low-effort
  states. For longer waits (>2s), use a skeleton block instead — a
  rounded rectangle with a `1.5s linear infinite` shimmer.

## Accessibility floor (don't ship without)

- Every interactive element has a visible focus state. Existing focus
  ring (`box-shadow: 0 0 0 3px var(--color-brand-light)`) is good — extend
  to lucide icon buttons too.
- Severity badges: text label, not just color. (`High` not just red.)
- Icon-only buttons: `aria-label`.
- Tables: real `<th>` with `scope="col"`.
- Color contrast: every text-on-background pair we ship must meet 4.5:1.
  The brand green on white is fine. Sev colors on their bg colors are fine.

## Don't

- Don't introduce new color hexes outside this doc.
- Don't add a UI library (no Material, no Chakra, no shadcn). Lucide-only.
- Don't introduce dark mode this sprint.
- Don't make the admin or reports pages busy. White space is the strongest
  tool we have to make the demo look clean.
