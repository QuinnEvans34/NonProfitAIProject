// Zod schema + category enum for AnalysisResult. Single source of truth for validation.

import { z } from 'zod';

export const NEED_CATEGORIES = [
  'Housing', 'Food', 'Healthcare', 'Employment', 'Legal', 'Utilities', 'Other',
];

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'crisis'];

const longString = z.string().trim().max(1000);
const summaryString = z.string().trim().max(800);
const tagString = z.string().regex(/^[a-z][a-z0-9_]{1,38}$/);

const ClassificationSchema = z.object({
  primary_category: z.enum(NEED_CATEGORIES),
  secondary_categories: z.array(z.enum(NEED_CATEGORIES)).max(3),
  tags: z.array(tagString).max(8),
}).superRefine((data, ctx) => {
  if (data.secondary_categories.includes(data.primary_category)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['secondary_categories'],
      message: 'secondary_categories must not include primary_category',
    });
  }
  const seen = new Set();
  for (const c of data.secondary_categories) {
    if (seen.has(c)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['secondary_categories'],
        message: `duplicate secondary category: ${c}`,
      });
    }
    seen.add(c);
  }
});

const SeveritySchema = z.object({
  level: z.enum(SEVERITY_LEVELS),
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  rationale: longString,
  signals: z.array(longString),
});

const RiskFlagsSchema = z.object({
  self_harm: z.boolean(),
  domestic_abuse: z.boolean(),
  child_safety: z.boolean(),
  eviction_imminent: z.boolean(),
  food_insecurity: z.boolean(),
  medical_emergency: z.boolean(),
  substance_abuse: z.boolean(),
  isolation: z.boolean(),
});

const RecommendedProgramSchema = z.object({
  name: longString,
  reason: longString,
  source: z.enum(['hardcoded', 'web', 'directory', 'inferred']),
});

const AiCommentSchema = z.object({
  type: z.enum(['context', 'flag', 'suggestion', 'clarification']),
  text: longString,
});

const ModelMetaSchema = z.object({
  model: z.string(),
  provider: z.enum(['ollama', 'azure', 'bedrock', 'mock']),
  ms: z.number().int().nonnegative(),
  schema_version: z.literal('1.0'),
});

export const AnalysisResultSchema = z.object({
  summary: z.object({
    staff_facing: summaryString,
    client_facing: summaryString,
  }),
  classification: ClassificationSchema,
  severity: SeveritySchema,
  risk_flags: RiskFlagsSchema,
  urgency_window: z.enum(['today', 'this_week', 'this_month', 'planning']),
  recommended_programs: z.array(RecommendedProgramSchema).max(6),
  follow_up_questions: z.array(longString).min(2).max(5),
  ai_comments: z.array(AiCommentSchema).max(6),
  keywords_extracted: z.array(longString).min(5).max(15),
  language_detected: z.string().min(2).max(5),
  model_meta: ModelMetaSchema,
});

// Validate a parsed JSON object against AnalysisResultSchema. Returns either
// { ok: true, data } or { ok: false, error } where `error` is a multi-line
// human-readable string suitable to feed back into the LLM on retry.
export function validateAnalysis(json) {
  const result = AnalysisResultSchema.safeParse(json);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const lines = result.error.issues.map(issue => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `- ${path}: ${issue.message}`;
  });
  return { ok: false, error: lines.join('\n') };
}
