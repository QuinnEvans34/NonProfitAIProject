// Public entry point. Builds the prompt, calls the active provider, validates, applies the severity floor, and stamps model_meta.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAnalysis } from './schema.js';
import { getProvider } from './providers/index.js';
import { buildClientBlock, buildScreeningBlock, buildQAPairs } from '../store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_TEMPLATE = fs.readFileSync(
  path.join(__dirname, 'prompts', 'analyzer.md'),
  'utf8',
);

const SEVERITY_RANK = { low: 0, medium: 1, high: 2, crisis: 3 };

function substitute(template, vars) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

function splitSystemUser(filled) {
  // The new prompt template has a CLIENT section that introduces the
  // per-intake data block; everything before it is instructions (system),
  // everything from CLIENT onward is the input (user).
  const idx = filled.indexOf('\nCLIENT\n');
  if (idx === -1) {
    return { systemPrompt: filled, userPrompt: '' };
  }
  return {
    systemPrompt: filled.slice(0, idx).trimEnd(),
    userPrompt: filled.slice(idx + 1),
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
      const cleaned = w.replace(/[^a-zA-Z0-9_-]/g, '').trim().toLowerCase();
      // Skip very short or numeric-only words; they're rarely useful keywords.
      if (cleaned.length >= 4 && !/^\d+$/.test(cleaned)) seen.add(cleaned);
      if (seen.size >= 15) break;
    }
    if (seen.size >= 15) break;
  }

  // If we somehow have fewer than 5 from the answers, pad with neutral terms
  // that don't telegraph a failure to the case manager or audience.
  const padding = [
    'awaiting_review',
    'see_transcript',
    'see_case_information',
    'see_screening_responses',
    'staff_review_pending',
  ];
  let i = 0;
  while (seen.size < 5 && i < padding.length) seen.add(padding[i++]);
  return Array.from(seen).slice(0, 15);
}

function safeFallback({ ruleSignals, providerName, ms, model, lastError, qaPairs }) {
  const level = ruleSignals.crisisFlag ? 'crisis' : ruleSignals.urgencyFlag;
  const scoreByLevel = { low: 25, medium: 50, high: 75, crisis: 90 };
  const errSnippet = (lastError ?? 'unknown error').slice(0, 200);

  return {
    summary: {
      staff_facing:
        'This intake is awaiting structured analysis. Please review the transcript, ' +
        'screening responses, and case information directly. The rule-based safety ' +
        'signal has been applied to severity.',
      client_facing:
        'Thanks for sharing your information. A team member will review what you ' +
        'submitted and reach out to you directly.',
    },
    classification: {
      primary_category: 'Other',
      secondary_categories: [],
      tags: ['pending_structured_analysis'],
    },
    severity: {
      level,
      score: scoreByLevel[level] ?? 50,
      confidence: 0,
      rationale:
        'Structured analysis was unavailable for this intake; severity reflects the ' +
        'rule-based safety signal only and should be re-evaluated by staff.',
      signals: ruleSignals.triggers.map((t) => `rule_floor: ${t}`),
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
      "Confirm the client's preferred contact method and best time to reach out.",
      'Ask the client to describe their situation in their own words during the follow-up call.',
    ],
    ai_comments: [
      {
        type: 'clarification',
        text:
          'Structured analysis is pending for this intake. Staff should review the ' +
          'transcript and screening responses directly and may re-run analysis from ' +
          'the case detail page.',
      },
    ],
    keywords_extracted: extractFallbackKeywords(qaPairs),
    language_detected: 'en',
    model_meta: { model, provider: providerName, ms, schema_version: '1.0' },
  };
}

export async function analyzeIntake(intakeOrQaPairs, ruleSignals) {
  const start = Date.now();
  const { name: providerName, generateAnalysis } = getProvider();
  const model = process.env.OLLAMA_MODEL || 'qwen3:30b';

  const isLegacyQaPairs = Array.isArray(intakeOrQaPairs);
  const qaPairs = isLegacyQaPairs ? intakeOrQaPairs : buildQAPairs(intakeOrQaPairs);
  const clientBlock = isLegacyQaPairs
    ? intakeOrQaPairs.map((p) => `${p.question}: ${p.answer}`).join('\n')
    : buildClientBlock(intakeOrQaPairs);
  const screeningBlock = isLegacyQaPairs
    ? '(not provided)'
    : buildScreeningBlock(intakeOrQaPairs);

  const filled = substitute(PROMPT_TEMPLATE, {
    rule_signals_json: JSON.stringify(ruleSignals),
    client_block: clientBlock,
    screening_block: screeningBlock,
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

// Warm-up: hit the analyzer provider on boot so the first real intake doesn't
// pay the cold-prompt-cache cost on the JSON-mode path.
export async function warmUpAnalyzer() {
  const { name: providerName, generateAnalysis } = getProvider();
  const model = process.env.OLLAMA_MODEL || 'qwen3:8b';
  console.log(`Warming up analyzer (${providerName} / ${model})...`);
  const start = Date.now();
  try {
    await generateAnalysis({
      systemPrompt: 'You are a JSON echo service. Respond with {"ok":true} and nothing else.',
      userPrompt: 'ping',
    });
    console.log(`Analyzer warm-up complete in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.warn(`Analyzer warm-up failed (${err.message}). First analysis will be slow.`);
  }
}
