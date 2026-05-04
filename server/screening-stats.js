// Pure helpers over screening answers. Mirrored at `client/src/lib/screening-stats.js`.

import { SCREENING_SECTIONS, TOTAL_QUESTION_COUNT } from './screening-questions.js';

function isValidValue(v) {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

/**
 * Average of answered questions per section.
 * @param {object} answers - { mental_health: { mh_1: 4, ... }, physical_health: {}, quality_of_life: {} }
 * @returns {object} { mental_health: 3.4, physical_health: null, quality_of_life: 4.1 }
 */
export function computeSectionAverages(answers) {
  const out = {};
  for (const section of SCREENING_SECTIONS) {
    const values = Object.values(answers?.[section.id] || {}).filter(isValidValue);
    out[section.id] = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
  }
  return out;
}

/**
 * Per-section and total counts of answered questions.
 * @param {object} answers
 * @returns {{ total: number, totalPossible: number, by_section: object }}
 */
export function countAnswered(answers) {
  const bySection = {};
  let total = 0;
  for (const section of SCREENING_SECTIONS) {
    const count = Object.values(answers?.[section.id] || {}).filter(isValidValue).length;
    bySection[section.id] = count;
    total += count;
  }
  return { total, totalPossible: TOTAL_QUESTION_COUNT, by_section: bySection };
}

/** True if no section has any valid answer. */
export function isEmpty(answers) {
  return countAnswered(answers).total === 0;
}
