# Help Score

A deterministic 0–100 number computed in code. Defensible to staff because
the rubric is fixed and the math is auditable. The number on the case
manager's screen is reproducible from the analyzer output.

## Rubric

The score is the sum of four components, clamped to [0, 100]:

```
helpScore = severity_band_base
          + risk_flag_bonus
          + urgency_window_bonus
          + multi_category_bonus
```

| Component | Range |
|---|---|
| `severity_band_base` | crisis 86, high 65, medium 36, low 8 |
| `risk_flag_bonus` | +3 per true risk flag (max +18) |
| `urgency_window_bonus` | today +6, this_week +3, this_month 0, planning −2 |
| `multi_category_bonus` | +2 per secondary category (max +6) |

The minimum for each severity level (`severity_band_base`) puts each band
above the next one's ceiling, so a crisis case is always ≥ 86 and a low-
severity case is always ≤ 33 even with all bonuses. That makes the band the
dominant signal and the bonuses act as nudges within the band.

## Hard floor

If `risk_flags.self_harm === true`, score is at least **90** regardless of
other components. This pairs with the regex floor on severity. The model and
the rule layer can both push severity to crisis; either path forces the
help-score floor.

## Worked examples

### Maria (low food situation, planning ahead)

```
severity: low                     base = 8
risk_flags: food_insecurity       +3
urgency_window: this_month        +0
secondary_categories: []          +0
                                  = 11 → 11
```

### James (eviction next week, kids hungry, recent job loss)

```
severity: high                    base = 65
risk_flags: child_safety, eviction_imminent, food_insecurity   +9
urgency_window: this_week         +3
secondary_categories: Food, Employment                         +4
                                  = 81 → 81
```

### Crisis with self-harm disclosure

```
severity: crisis                  base = 86
risk_flags: self_harm, isolation  +6
urgency_window: today             +6
secondary_categories: Healthcare  +2
                                  = 100 (clamped)
self_harm floor: 90               applies, but already exceeded
```

### Stable, just exploring

```
severity: low                     base = 8
risk_flags: none                  +0
urgency_window: planning          −2
secondary_categories: []          +0
                                  = 6 → 6
```

## Function signature

```ts
// server/help-score.js
export function computeHelpScore(analysis: AnalysisResult): {
  score: number;
  components: {
    severity_band_base: number;
    risk_flag_bonus: number;
    urgency_window_bonus: number;
    multi_category_bonus: number;
    self_harm_floor_applied: boolean;
  };
  rubric_version: '1.0';
};
```

`components` is returned alongside the score so the UI can render the
"why this score" tooltip directly from the breakdown.

## Why expose components

The case manager sees a circular widget showing the score, and on hover, a
small popover that says:

> 81 / 100
> high severity (65) + 3 risk flags (9) + this week (3) + 2 secondary categories (4)

That's the whole defense. No model variance. Deterministic. Reproducible from
the persisted analysis, so two case managers looking at the same record
always see the same score.

## Tests (required)

`server/help-score.test.js` should cover:

1. Each band's exact base value with no bonuses → matches `severity_band_base`.
2. Maximum bonuses don't break the next band's ceiling. (low+all bonuses ≤ 33,
   medium+all bonuses ≤ 60, high+all bonuses ≤ 86 ceiling minus 1 = 85,
   crisis floor at 86.)
3. `self_harm` floor: any analysis with `risk_flags.self_harm` true returns
   at least 90.
4. Clamping: synthetic case where bonuses would push past 100 → returns 100.
5. Clamping: synthetic case where bonuses would push below 0 → returns 0.
6. Returned `components.rubric_version` is exactly `"1.0"`.

If we tune the rubric later we bump `rubric_version` and persist it on the
intake record — that way historical scores stay explainable even if today's
math changes.
