// Pure matcher functions for the analyzer eval harness.
// Each returns { ok: boolean, message: string }.

const SEVERITY_RANK = { low: 0, medium: 1, high: 2, crisis: 3 };

export function expectSeverityAtLeast(actual, expectedLevel) {
  const got = actual?.severity?.level;
  if (!(expectedLevel in SEVERITY_RANK)) {
    return { ok: false, message: `expectSeverityAtLeast: unknown expected level "${expectedLevel}"` };
  }
  if (!(got in SEVERITY_RANK)) {
    return { ok: false, message: `expectSeverityAtLeast: actual severity level "${got}" is not a known level` };
  }
  const ok = SEVERITY_RANK[got] >= SEVERITY_RANK[expectedLevel];
  return {
    ok,
    message: ok
      ? `severity ${got} >= ${expectedLevel}`
      : `expectSeverityAtLeast: expected at least ${expectedLevel}, got ${got}`,
  };
}

export function expectPrimaryCategoryEquals(actual, expected) {
  const got = actual?.classification?.primary_category;
  const ok = got === expected;
  return {
    ok,
    message: ok
      ? `primary_category = ${got}`
      : `expectPrimaryCategoryEquals: expected ${expected}, got ${got}`,
  };
}

export function expectSecondaryIncludes(actual, expectedList) {
  const got = actual?.classification?.secondary_categories ?? [];
  const missing = expectedList.filter(c => !got.includes(c));
  const ok = missing.length === 0;
  return {
    ok,
    message: ok
      ? `secondary_categories includes ${expectedList.join(', ')}`
      : `expectSecondaryIncludes: missing ${missing.join(', ')} (got [${got.join(', ')}])`,
  };
}

export function expectRiskFlagsTrue(actual, expectedList) {
  const flags = actual?.risk_flags ?? {};
  const missing = expectedList.filter(f => flags[f] !== true);
  const ok = missing.length === 0;
  return {
    ok,
    message: ok
      ? `risk_flags true: ${expectedList.join(', ')}`
      : `expectRiskFlagsTrue: ${missing.map(f => `${f} → got ${flags[f]}`).join(', ')}`,
  };
}

export function expectUrgencyWindowIn(actual, allowedList) {
  const got = actual?.urgency_window;
  const ok = allowedList.includes(got);
  return {
    ok,
    message: ok
      ? `urgency_window = ${got}`
      : `expectUrgencyWindowIn: expected one of [${allowedList.join(', ')}], got ${got}`,
  };
}

export function expectRecommendedProgramsContains(actual, names) {
  const programs = actual?.recommended_programs ?? [];
  const lowered = programs.map(p => String(p?.name ?? '').toLowerCase());
  const missing = names.filter(
    n => !lowered.some(actualName => actualName.includes(String(n).toLowerCase())),
  );
  const ok = missing.length === 0;
  return {
    ok,
    message: ok
      ? `recommended_programs contains ${names.join(', ')}`
      : `expectRecommendedProgramsContains: missing ${missing.join(', ')} (got [${programs.map(p => p?.name).join(', ')}])`,
  };
}

export function expectFollowUpQuestionsAtLeast(actual, n) {
  const len = actual?.follow_up_questions?.length ?? 0;
  const ok = len >= n;
  return {
    ok,
    message: ok
      ? `follow_up_questions count = ${len} (>= ${n})`
      : `expectFollowUpQuestionsAtLeast: expected >= ${n}, got ${len}`,
  };
}

export function expectLanguageDetected(actual, code) {
  const got = actual?.language_detected;
  const ok = got === code;
  return {
    ok,
    message: ok
      ? `language_detected = ${got}`
      : `expectLanguageDetected: expected ${code}, got ${got}`,
  };
}
