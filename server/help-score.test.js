import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeHelpScore,
  SEVERITY_BAND_BASE,
  BAND_CEILINGS,
  SELF_HARM_FLOOR,
  RUBRIC_VERSION,
} from './help-score.js';

const ALL_RISK_KEYS = [
  'self_harm',
  'domestic_abuse',
  'child_safety',
  'eviction_imminent',
  'food_insecurity',
  'medical_emergency',
  'substance_abuse',
  'isolation',
];

function makeAnalysis({
  severity = 'medium',
  risks = [],
  window = 'this_month',
  secondaries = [],
} = {}) {
  const risk_flags = {};
  for (const key of ALL_RISK_KEYS) risk_flags[key] = risks.includes(key);
  return {
    severity: { level: severity },
    risk_flags,
    urgency_window: window,
    classification: {
      primary_category: 'Housing',
      secondary_categories: secondaries,
      tags: [],
    },
  };
}

test('each severity band returns its exact base with no bonuses', () => {
  for (const level of ['low', 'medium', 'high', 'crisis']) {
    const result = computeHelpScore(makeAnalysis({ severity: level }));
    assert.equal(
      result.score,
      SEVERITY_BAND_BASE[level],
      `${level} base should be ${SEVERITY_BAND_BASE[level]}`,
    );
  }
});

test('bonuses cannot break the next band ceiling, and crisis stays >= 86', () => {
  // 6 non-self-harm risks → +18 cap, today → +6, 3 secondaries → +6.
  const maxedRisks = [
    'domestic_abuse',
    'child_safety',
    'eviction_imminent',
    'food_insecurity',
    'medical_emergency',
    'substance_abuse',
  ];
  for (const level of ['low', 'medium', 'high']) {
    const result = computeHelpScore(
      makeAnalysis({
        severity: level,
        risks: maxedRisks,
        window: 'today',
        secondaries: ['Food', 'Employment', 'Healthcare'],
      }),
    );
    assert.ok(
      result.score <= BAND_CEILINGS[level],
      `${level} maxed should be <= ${BAND_CEILINGS[level]}, got ${result.score}`,
    );
  }
  // Crisis with worst urgency and no other bonuses must still hold its floor.
  const crisis = computeHelpScore(
    makeAnalysis({ severity: 'crisis', window: 'planning' }),
  );
  assert.ok(crisis.score >= 86, `crisis floor should be >= 86, got ${crisis.score}`);
});

test('self_harm risk flag forces score to at least the self-harm floor', () => {
  const lifted = computeHelpScore(
    makeAnalysis({ severity: 'low', risks: ['self_harm'], window: 'this_month' }),
  );
  assert.ok(lifted.score >= SELF_HARM_FLOOR);
  assert.equal(lifted.components.self_harm_floor_applied, true);

  // Crisis case already at 100 — flag is true but floor did not move the score.
  const alreadyAbove = computeHelpScore(
    makeAnalysis({
      severity: 'crisis',
      risks: ['self_harm', 'isolation'],
      window: 'today',
      secondaries: ['Healthcare'],
    }),
  );
  assert.ok(alreadyAbove.score >= SELF_HARM_FLOOR);
});

test('score clamps to 100 when bonuses would exceed it', () => {
  const result = computeHelpScore(
    makeAnalysis({
      severity: 'crisis',
      risks: [
        'domestic_abuse',
        'child_safety',
        'eviction_imminent',
        'food_insecurity',
        'medical_emergency',
        'substance_abuse',
      ],
      window: 'today',
      secondaries: ['Food', 'Employment', 'Healthcare'],
    }),
  );
  assert.equal(result.score, 100);
});

test('score clamps to 0 when components would push it below', () => {
  // No realistic input can drive the natural sum negative with the published
  // constants, so we exercise the global floor by passing an unrecognized
  // severity level (base defaults to 0) plus the negative `planning` window.
  const result = computeHelpScore(
    makeAnalysis({ severity: 'unknown', window: 'planning' }),
  );
  assert.equal(result.score, 0);
});

test('rubric_version is exactly "1.0"', () => {
  const result = computeHelpScore(makeAnalysis());
  assert.equal(result.rubric_version, '1.0');
  assert.equal(RUBRIC_VERSION, '1.0');
});
