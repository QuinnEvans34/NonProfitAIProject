// Smoke test: verifies analyzeIntake against the mock provider returns a schema-valid result.

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LLM_PROVIDER = 'mock';
const { analyzeIntake } = await import('./analyzer.js');
const { AnalysisResultSchema } = await import('./schema.js');

test('analyzeIntake (mock) returns a schema-valid AnalysisResult', async () => {
  const qaPairs = [
    { question: 'What is your first name?', answer: 'James' },
    { question: 'Tell me about your situation.', answer: 'Got eviction notice, two kids hungry.' },
  ];
  const ruleSignals = { urgencyFlag: 'high', crisisFlag: false, triggers: ['high: "eviction notice"'] };

  const result = await analyzeIntake(qaPairs, ruleSignals);

  const parsed = AnalysisResultSchema.safeParse(result);
  assert.equal(parsed.success, true, parsed.success ? '' : JSON.stringify(parsed.error.issues, null, 2));
  assert.equal(result.model_meta.provider, 'mock');
  assert.equal(result.model_meta.schema_version, '1.0');
});

test('severity floor escalates when crisisFlag is true', async () => {
  const qaPairs = [{ question: 'Q', answer: 'A' }];
  const ruleSignals = { urgencyFlag: 'high', crisisFlag: true, triggers: ['crisis: "want to die"'] };

  const result = await analyzeIntake(qaPairs, ruleSignals);

  assert.equal(result.severity.level, 'crisis');
  assert.ok(
    result.severity.signals.some(s => s.startsWith('rule_floor:')),
    'expected floor-prefixed trigger in severity.signals',
  );
});
