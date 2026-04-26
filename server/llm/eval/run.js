// Eval harness entrypoint. Loads every fixture under fixtures/, runs
// analyzeIntake against the configured provider, applies the fixture's
// matchers, and prints a per-fixture pass/fail report.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { analyzeIntake } from '../analyzer.js';
import { getProvider } from '../providers/index.js';
import { report } from './reporter.js';
import {
  expectSeverityAtLeast,
  expectPrimaryCategoryEquals,
  expectSecondaryIncludes,
  expectRiskFlagsTrue,
  expectUrgencyWindowIn,
  expectRecommendedProgramsContains,
  expectFollowUpQuestionsAtLeast,
  expectLanguageDetected,
} from './matchers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

async function loadFixtures() {
  const entries = await readdir(FIXTURES_DIR);
  const jsonFiles = entries.filter(f => f.endsWith('.json')).sort();
  const fixtures = [];
  for (const file of jsonFiles) {
    const raw = await readFile(path.join(FIXTURES_DIR, file), 'utf8');
    try {
      fixtures.push({ file, fixture: JSON.parse(raw) });
    } catch (err) {
      throw new Error(`Failed to parse fixture ${file}: ${err.message}`);
    }
  }
  return fixtures;
}

function runMatchers(expect, actual) {
  const failures = [];

  if (expect.severity?.atLeast !== undefined) {
    const r = expectSeverityAtLeast(actual, expect.severity.atLeast);
    if (!r.ok) failures.push({ matcher: 'expectSeverityAtLeast', message: r.message });
  }
  if (expect.primaryCategory !== undefined) {
    const r = expectPrimaryCategoryEquals(actual, expect.primaryCategory);
    if (!r.ok) failures.push({ matcher: 'expectPrimaryCategoryEquals', message: r.message });
  }
  if (Array.isArray(expect.secondaryIncludes)) {
    const r = expectSecondaryIncludes(actual, expect.secondaryIncludes);
    if (!r.ok) failures.push({ matcher: 'expectSecondaryIncludes', message: r.message });
  }
  if (Array.isArray(expect.riskFlagsTrue)) {
    const r = expectRiskFlagsTrue(actual, expect.riskFlagsTrue);
    if (!r.ok) failures.push({ matcher: 'expectRiskFlagsTrue', message: r.message });
  }
  if (Array.isArray(expect.urgencyWindow?.in)) {
    const r = expectUrgencyWindowIn(actual, expect.urgencyWindow.in);
    if (!r.ok) failures.push({ matcher: 'expectUrgencyWindowIn', message: r.message });
  }
  if (Array.isArray(expect.recommendedProgramsContains)) {
    const r = expectRecommendedProgramsContains(actual, expect.recommendedProgramsContains);
    if (!r.ok) failures.push({ matcher: 'expectRecommendedProgramsContains', message: r.message });
  }
  if (typeof expect.followUpQuestionsAtLeast === 'number') {
    const r = expectFollowUpQuestionsAtLeast(actual, expect.followUpQuestionsAtLeast);
    if (!r.ok) failures.push({ matcher: 'expectFollowUpQuestionsAtLeast', message: r.message });
  }
  if (expect.languageDetected !== undefined) {
    const r = expectLanguageDetected(actual, expect.languageDetected);
    if (!r.ok) failures.push({ matcher: 'expectLanguageDetected', message: r.message });
  }

  return failures;
}

function buildAnnotation(actual) {
  const notes = [];
  const lang = actual?.language_detected;
  if (lang && lang !== 'en') notes.push(`language_detected = ${lang}`);
  const flooredSignal = actual?.severity?.signals?.find(s => typeof s === 'string' && s.startsWith('rule_floor:'));
  if (flooredSignal) notes.push(`rule floor → ${actual.severity.level}`);
  return notes.join(' · ');
}

async function main() {
  const fixtures = await loadFixtures();
  const { name: providerName } = getProvider();
  const modelName = process.env.OLLAMA_MODEL || (providerName === 'mock' ? 'mock-fixture' : 'unknown');

  const results = [];
  for (const { fixture } of fixtures) {
    const start = performance.now();
    let actual;
    let runtimeError = null;
    try {
      actual = await analyzeIntake(fixture.input.qaPairs, fixture.input.ruleSignals);
    } catch (err) {
      runtimeError = err;
    }
    const ms = performance.now() - start;

    let failures;
    if (runtimeError) {
      failures = [{ matcher: 'runtime', message: `analyzeIntake threw: ${runtimeError.message}` }];
    } else {
      failures = runMatchers(fixture.expect, actual);
    }

    results.push({
      id: fixture.id,
      ms,
      passed: failures.length === 0,
      failures,
      annotation: actual ? buildAnnotation(actual) : '',
    });
  }

  report(results, providerName, modelName);

  process.exit(results.every(r => r.passed) ? 0 : 1);
}

main().catch(err => {
  console.error('Eval harness crashed:', err);
  process.exit(1);
});
