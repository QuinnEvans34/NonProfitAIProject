// Deterministic help score. Pure function over an AnalysisResult.
// No LLM, no I/O, no Date.now(), no randomness — fully reproducible.

export const SEVERITY_BAND_BASE = {
  crisis: 86,
  high: 65,
  medium: 36,
  low: 8,
};

export const RISK_FLAG_BONUS_PER_FLAG = 3;
export const RISK_FLAG_BONUS_MAX = 18;

export const URGENCY_WINDOW_BONUS = {
  today: 6,
  this_week: 3,
  this_month: 0,
  planning: -2,
};

export const SECONDARY_CATEGORY_BONUS_PER = 2;
export const SECONDARY_CATEGORY_BONUS_MAX = 6;

export const SELF_HARM_FLOOR = 90;

export const RUBRIC_VERSION = '1.0';

// Keeps each severity band separated from the next so the band remains the
// dominant signal even with all bonuses applied. Read by computeHelpScore
// and exported so the UI tooltip can show the rubric explicitly.
export const BAND_CEILINGS = {
  low: 33,
  medium: 60,
  high: 85,
  crisis: 100,
};

const RISK_FLAG_KEYS = [
  'self_harm',
  'domestic_abuse',
  'child_safety',
  'eviction_imminent',
  'food_insecurity',
  'medical_emergency',
  'substance_abuse',
  'isolation',
];

export function computeHelpScore(analysis) {
  const level = analysis?.severity?.level;
  const riskFlags = analysis?.risk_flags ?? {};
  const window = analysis?.urgency_window;
  const secondaries = analysis?.classification?.secondary_categories ?? [];

  const severity_band_base = SEVERITY_BAND_BASE[level] ?? 0;

  const riskCount = RISK_FLAG_KEYS.reduce(
    (n, key) => (riskFlags[key] === true ? n + 1 : n),
    0,
  );
  const risk_flag_bonus = Math.min(
    riskCount * RISK_FLAG_BONUS_PER_FLAG,
    RISK_FLAG_BONUS_MAX,
  );

  const urgency_window_bonus = URGENCY_WINDOW_BONUS[window] ?? 0;

  const multi_category_bonus = Math.min(
    secondaries.length * SECONDARY_CATEGORY_BONUS_PER,
    SECONDARY_CATEGORY_BONUS_MAX,
  );

  const rawSum =
    severity_band_base +
    risk_flag_bonus +
    urgency_window_bonus +
    multi_category_bonus;

  let score = rawSum;
  const ceiling = BAND_CEILINGS[level];
  const floor = SEVERITY_BAND_BASE[level];
  if (ceiling !== undefined && floor !== undefined) {
    score = Math.min(ceiling, Math.max(floor, score));
  }

  let self_harm_floor_applied = false;
  if (riskFlags.self_harm === true && score < SELF_HARM_FLOOR) {
    score = SELF_HARM_FLOOR;
    self_harm_floor_applied = true;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    components: {
      severity_band_base,
      risk_flag_bonus,
      urgency_window_bonus,
      multi_category_bonus,
      self_harm_floor_applied,
    },
    rubric_version: RUBRIC_VERSION,
  };
}
