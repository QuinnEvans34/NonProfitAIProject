// Public entry point. Builds the prompt, calls the active provider, validates, applies the severity floor, and stamps model_meta.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAnalysis } from './schema.js';
import { getProvider } from './providers/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_TEMPLATE = fs.readFileSync(
  path.join(__dirname, 'prompts', 'analyzer.md'),
  'utf8',
);

const SEVERITY_RANK = { low: 0, medium: 1, high: 2, crisis: 3 };

const SCHEMA_BLOCK = `Schema for the JSON object you must return:

summary.staff_facing                 string   3-5 sentences, cautious, no qualification claims, max 800 chars
summary.client_facing                string   1-2 sentences, warm, max 800 chars
classification.primary_category      string   one of: Housing, Food, Healthcare, Employment, Legal, Utilities, Other
classification.secondary_categories  string[] 0-3 from the same list, no duplicate of primary
classification.tags                  string[] 0-8, lowercase_snake_case, /^[a-z][a-z0-9_]{1,38}$/
severity.level                       string   one of: low, medium, high, crisis
severity.score                       integer  0-100
severity.confidence                  number   0-1
severity.rationale                   string   1-2 sentences
severity.signals                     string[] phrases from the input that drove the call
risk_flags.self_harm                 boolean
risk_flags.domestic_abuse            boolean
risk_flags.child_safety              boolean
risk_flags.eviction_imminent         boolean
risk_flags.food_insecurity           boolean
risk_flags.medical_emergency         boolean
risk_flags.substance_abuse           boolean
risk_flags.isolation                 boolean
urgency_window                       string   one of: today, this_week, this_month, planning
recommended_programs                 array of { name, reason, source }, 0-6 items; source one of: hardcoded, web, directory, inferred
follow_up_questions                  string[] 2-5 items, written for the case manager
ai_comments                          array of { type, text }, 0-6 items; type one of: context, flag, suggestion, clarification
keywords_extracted                   string[] 5-15 short verbatim phrases from the answers
language_detected                    string   ISO code, 2-5 chars (e.g. "en", "es")
model_meta                           object   leave as { "model": "", "provider": "ollama", "ms": 0, "schema_version": "1.0" } — the application overwrites it.

Return ONLY a JSON object.`;

function buildQaPairsBlock(qaPairs) {
  return qaPairs
    .map((p, i) => `Q${i + 1}: ${p.question}\nA${i + 1}: ${p.answer}`)
    .join('\n\n');
}

function substitute(template, vars) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

function splitSystemUser(filled) {
  const idx = filled.indexOf('INPUT');
  if (idx === -1) {
    return { systemPrompt: filled, userPrompt: '' };
  }
  return {
    systemPrompt: filled.slice(0, idx).trimEnd(),
    userPrompt: filled.slice(idx),
  };
}

function applySeverityFloor(result, ruleSignals) {
  const ruleLevel = ruleSignals.crisisFlag ? 'crisis' : ruleSignals.urgencyFlag;
  if (SEVERITY_RANK[ruleLevel] > SEVERITY_RANK[result.severity.level]) {
    result.severity.level = ruleLevel;
  }
  result.severity.signals = [
    ...result.severity.signals,
    ...ruleSignals.triggers.map(t => `rule_floor: ${t}`),
  ];
}

function stampMeta(result, { model, provider, ms }) {
  result.model_meta = { model, provider, ms, schema_version: '1.0' };
}

function extractFallbackKeywords(qaPairs) {
  const seen = new Set();
  for (const pair of qaPairs) {
    const words = String(pair.answer || '').split(/\s+/);
    for (const w of words) {
      const cleaned = w.replace(/[^a-zA-Z0-9_-]/g, '').trim();
      if (cleaned.length >= 3) seen.add(cleaned);
      if (seen.size >= 15) break;
    }
    if (seen.size >= 15) break;
  }
  const padding = ['intake_received', 'manual_review_needed', 'analysis_failed', 'review_transcript', 'see_case_notes'];
  let i = 0;
  while (seen.size < 5 && i < padding.length) {
    seen.add(padding[i++]);
  }
  return Array.from(seen).slice(0, 15);
}

function safeFallback({ ruleSignals, providerName, ms, model, lastError, qaPairs }) {
  const level = ruleSignals.crisisFlag ? 'crisis' : ruleSignals.urgencyFlag;
  const scoreByLevel = { low: 25, medium: 50, high: 75, crisis: 90 };
  const errSnippet = (lastError ?? 'unknown error').slice(0, 500);

  return {
    summary: {
      staff_facing: 'Analysis failed — see transcript and case information for review.',
      client_facing: 'Thanks for sharing. A team member will review your information and reach out.',
    },
    classification: {
      primary_category: 'Other',
      secondary_categories: [],
      tags: [],
    },
    severity: {
      level,
      score: scoreByLevel[level] ?? 50,
      confidence: 0,
      rationale: 'Analyzer failed; severity reflects the rule-based safety signal only.',
      signals: ruleSignals.triggers.map(t => `rule_floor: ${t}`),
    },
    risk_flags: {
      self_harm: false,
      domestic_abuse: false,
      child_safety: false,
      eviction_imminent: false,
      food_insecurity: false,
      medical_emergency: false,
      substance_abuse: false,
      isolation: false,
    },
    urgency_window: 'this_week',
    recommended_programs: [],
    follow_up_questions: [
      "Confirm the client's preferred contact method and best time to call.",
      'Ask the client to describe their situation in their own words.',
    ],
    ai_comments: [
      { type: 'flag', text: `Automated analysis failed (${errSnippet}). Manual review required.` },
    ],
    keywords_extracted: extractFallbackKeywords(qaPairs),
    language_detected: 'en',
    model_meta: { model, provider: providerName, ms, schema_version: '1.0' },
  };
}

export async function analyzeIntake(qaPairs, ruleSignals) {
  const start = Date.now();
  const { name: providerName, generateAnalysis } = getProvider();
  const model = process.env.OLLAMA_MODEL || 'qwen3:30b';

  const filled = substitute(PROMPT_TEMPLATE, {
    rule_signals_json: JSON.stringify(ruleSignals),
    qa_pairs_block: buildQaPairsBlock(qaPairs),
    schema_block: SCHEMA_BLOCK,
  });
  let { systemPrompt, userPrompt } = splitSystemUser(filled);

  let lastError = null;
  let parsed = null;

  for (let attempt = 0; attempt < 2 && parsed === null; attempt++) {
    let raw;
    try {
      raw = await generateAnalysis({ systemPrompt, userPrompt, jsonSchema: undefined });
    } catch (err) {
      lastError = err.message;
      console.error('Analyzer provider error:', err.message);
      break;
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      lastError = `Your previous response was not valid JSON: ${err.message}. Return ONLY a JSON object — no prose, no markdown fences.`;
      console.warn('Analyzer JSON parse failed; retrying once.');
      userPrompt = userPrompt + '\n\nPREVIOUS ATTEMPT FAILED:\n' + lastError;
      continue;
    }

    const v = validateAnalysis(json);
    if (!v.ok) {
      lastError = `Your previous response failed schema validation:\n${v.error}\nReturn a corrected JSON object that fixes these issues.`;
      console.warn('Analyzer schema validation failed; retrying once.');
      userPrompt = userPrompt + '\n\nPREVIOUS ATTEMPT FAILED:\n' + lastError;
      continue;
    }
    parsed = v.data;
  }

  const ms = Date.now() - start;

  if (parsed === null) {
    return safeFallback({ ruleSignals, providerName, ms, model, lastError, qaPairs });
  }

  applySeverityFloor(parsed, ruleSignals);
  stampMeta(parsed, { model, provider: providerName, ms });
  return parsed;
}
