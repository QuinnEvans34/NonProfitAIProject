// Mirror of server/help-score.js — keep these in sync. Both files reference rubric v1.0.

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

export const BAND_CEILINGS = {
  low: 33,
  medium: 60,
  high: 85,
  crisis: 100,
};
