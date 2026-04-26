# The Analyzer — Schema, Prompt, and Examples

This is the contract every other piece hangs off of. Lock the shape here.
Everything downstream — the detail page, the admin page, the reports page,
the eval harness — reads from this object.

## Inputs

The analyzer receives two arguments:

```ts
type QAPair = { question: string; answer: string };

type RuleSignals = {
  urgencyFlag: 'low' | 'medium' | 'high';
  crisisFlag: boolean;
  triggers: string[];   // strings like 'crisis: "no place to stay"'
};

analyzeIntake(qaPairs: QAPair[], ruleSignals: RuleSignals): Promise<AnalysisResult>
```

`qaPairs` is built by `intake-flow.js` from the questions the flow currently
asks. The current flow's question texts (matching `STEPS` in `intake-flow.js`)
are:

| Step | Canonical question |
|---|---|
| ask_name | What is your first name? |
| ask_contact | How would you like us to reach you? |
| ask_category | What kind of help do you need? |
| ask_urgency | Is this urgent or are you planning ahead? |
| ask_situation | Tell me about your situation in your own words. |

When Ted's questionnaire ships, the question strings will change but the
shape stays the same. The analyzer doesn't care which questions are asked —
it cares about the pairs.

## Output schema (AnalysisResult)

```ts
type Severity = 'low' | 'medium' | 'high' | 'crisis';

type AnalysisResult = {
  summary: {
    staff_facing: string;        // 3-5 sentences, cautious, no qualification claims
    client_facing: string;       // 1-2 sentences, warm, reassuring
  };

  classification: {
    primary_category: string;    // one of NEED_CATEGORIES (Housing, Food, …)
    secondary_categories: string[];  // 0-3 additional NEED_CATEGORIES
    tags: string[];              // 0-8 lowercase_snake_case free-form tags
  };

  severity: {
    level: Severity;             // floor-enforced after analyzer returns
    score: number;               // 0-100, model's own assessment
    confidence: number;          // 0-1, model's own confidence
    rationale: string;           // 1-2 sentences for staff
    signals: string[];           // phrases from input that drove the call
  };

  risk_flags: {
    self_harm: boolean;
    domestic_abuse: boolean;
    child_safety: boolean;
    eviction_imminent: boolean;
    food_insecurity: boolean;
    medical_emergency: boolean;
    substance_abuse: boolean;
    isolation: boolean;
  };

  urgency_window: 'today' | 'this_week' | 'this_month' | 'planning';

  recommended_programs: Array<{
    name: string;                // e.g., "SNAP"
    reason: string;              // 1 sentence, cautious language
    source: 'hardcoded' | 'web' | 'directory' | 'inferred';
  }>;

  follow_up_questions: string[]; // 2-5 questions for the case manager call

  ai_comments: Array<{
    type: 'context' | 'flag' | 'suggestion' | 'clarification';
    text: string;                // 1-2 sentences
  }>;

  keywords_extracted: string[];  // surface phrases from inputs (5-15)

  language_detected: string;     // ISO code, e.g. 'en', 'es'

  model_meta: {
    model: string;               // e.g., 'qwen3:30b'
    provider: 'ollama' | 'azure' | 'bedrock' | 'mock';
    ms: number;                  // wall-clock time
    schema_version: '1.0';
  };
};
```

## Validation rules (zod)

- All string fields: trim, max 1000 chars (summary fields max 800).
- `severity.score`: integer 0–100.
- `severity.confidence`: number 0–1.
- `classification.primary_category`: must be in `NEED_CATEGORIES`.
- `classification.secondary_categories`: each in `NEED_CATEGORIES`, no
  duplicates with primary, max 3.
- `classification.tags`: each matches `/^[a-z][a-z0-9_]{1,38}$/`, max 8.
- `recommended_programs`: 0–6 items.
- `follow_up_questions`: 2–5 items.
- `ai_comments`: 0–6 items.
- All `risk_flags.*`: required booleans (default false on missing).
- `urgency_window`: one of the four literals.
- `language_detected`: 2–5 char ISO code.

## The prompt template

`server/llm/prompts/analyzer.md` — load this at server start, do simple
`{{var}}` substitution before the LLM call.

```
You are an intake-analysis assistant for a community social services
organization called Hope Connect. A client has just completed a guided intake
with a separate AI chat. You are NOT speaking to the client. You are
producing a structured analysis for the human case manager who will review
this intake.

YOUR JOB
- Read the question/answer pairs and produce a single JSON object that
  matches the schema below. Do not include any text outside the JSON.
- Use cautious, non-judgmental language. Never imply a client qualifies or
  does not qualify for a program. Never give legal, medical, or financial
  advice. Use phrases like "may benefit from", "should be reviewed for",
  "reported that".
- If a piece of information is missing, say so. Do not invent details.
- Detect the language the client wrote in. If non-English, write
  staff_facing in English and client_facing in the client's language.

SAFETY FLOOR
The intake's regex-based safety detector has already produced this signal:
{{rule_signals_json}}

You may ESCALATE the severity if you see something the regex missed. You may
NEVER de-escalate it. If the regex flagged crisis, severity.level must be
"crisis". If the regex flagged high, severity.level must be at least "high".

CATEGORIES
The needCategory must be one of:
Housing, Food, Healthcare, Employment, Legal, Utilities, Other

SEVERITY GUIDANCE
- crisis  — immediate danger to life or safety: self-harm, abuse in progress,
            child unsafe, medical emergency in progress, no shelter tonight.
- high    — must be addressed within ~7 days: eviction imminent, no food now,
            no insurance with active medical issue, fleeing situation.
- medium  — significant hardship without immediate danger: behind on rent,
            recently lost job, can't afford bills, struggling.
- low     — planning ahead, general questions, stable situation.

URGENCY WINDOW
- today      — needs help today
- this_week  — needs help within a week
- this_month — needs help within a month
- planning   — long-term planning, no time pressure

HELP SCORE NOTE
Set severity.score to your own 0–100 sense of need. The application computes
the official help_score deterministically from severity, categories, and risk
flags. You do not need to match it. Your score is advisory.

AI COMMENTS
Surface 0–6 short observations the case manager would want to know that
aren't already obvious from the summary. Use type:
- context        — background detail ("client mentioned a child with asthma")
- flag           — something to watch ("client minimized the urgency twice")
- suggestion     — concrete action for staff ("verify eviction notice date")
- clarification  — gap in the intake ("contact preference unclear")

RECOMMENDED PROGRAMS
For the demo, draw from this hard-coded shortlist when relevant. Each item
must include a one-sentence "reason" written in cautious language.
- SNAP (food assistance)
- WIC (food, women/infants/children)
- LIHEAP (utilities energy assistance)
- Section 8 / Housing Choice Voucher (housing)
- Medicaid (healthcare)
- TANF (cash assistance)
- Unemployment Insurance
- Local food pantry network
- Local shelter network
- Legal Aid (civil legal help)

If nothing fits, return an empty array. Do not invent programs not in this
list. The "source" field must be "hardcoded" for any of these. Mark
"inferred" only when you reference a category of program without naming a
specific one (e.g., "local diaper bank").

FOLLOW-UP QUESTIONS
Suggest 2–5 questions the case manager should ask in their follow-up call,
in plain English, written for the case manager (not the client). These
should fill obvious gaps in the intake.

KEYWORDS
Pull 5–15 short phrases verbatim from the answers that capture the client's
situation in their own words.

INPUT
Below are the Q/A pairs from the intake. Each pair is one question the AI
intake asked and the client's reply.

{{qa_pairs_block}}

OUTPUT
Return ONLY a JSON object matching this schema. No prose before or after.
No markdown fences. The JSON parser will reject anything else.

{{schema_block}}
```

## Worked examples (shipped as comments in fixtures, not in the prompt)

### Routine — food + employment, low severity

Inputs:
- Name: Maria
- Contact: phone
- Category: food
- Urgency: "no, just trying to get ahead before things get bad"
- Situation: "lost a few hours at work this month, kids are fine, just want
  to know what's out there"

Expected highlights:
- `severity.level`: "low" (or "medium" — analyzer's call, not floored up)
- `urgency_window`: "this_month"
- `risk_flags.food_insecurity`: true
- `recommended_programs`: includes SNAP
- `follow_up_questions`: includes income verification, household size
- `ai_comments`: includes a `context` note about reduced work hours

### High urgency — eviction + kids hungry

Inputs:
- Name: James
- Contact: text
- Category: housing
- Urgency: "yes, eviction notice for next week"
- Situation: "got eviction notice, two kids haven't eaten properly in days,
  job ended last month"

Expected highlights:
- `severity.level`: "high" (regex floor will likely set this; analyzer agrees)
- `urgency_window`: "this_week"
- `risk_flags.eviction_imminent`: true
- `risk_flags.food_insecurity`: true
- `risk_flags.child_safety`: true (children appear under-resourced)
- `recommended_programs`: SNAP, local shelter network, LIHEAP
- `follow_up_questions`: includes "Has the eviction notice been served in
  writing?", "Do the children have access to school meals?"

### Crisis — self-harm disclosure

Inputs:
- Situation: "I don't want to be here anymore. nothing's working."

Expected highlights:
- Regex floor sets crisis. Analyzer must NOT downgrade.
- `severity.level`: "crisis"
- `risk_flags.self_harm`: true
- `summary.client_facing`: warm, references that a real human will reach out
  quickly, mentions 988 — but does not pretend to provide therapy.
- `ai_comments`: a `flag` type comment naming the safety concern explicitly.

## Example output (for the "James" case)

```json
{
  "summary": {
    "staff_facing": "Client reports an eviction notice for next week and that two children have not eaten regularly in recent days. Client lost his job last month. Situation may benefit from urgent housing stabilization and food assistance referrals. Should be reviewed for child welfare considerations given the food insecurity disclosed.",
    "client_facing": "Thanks for sharing what's going on, James. A Hope Connector will reach out by text very soon to help with housing and food right away."
  },
  "classification": {
    "primary_category": "Housing",
    "secondary_categories": ["Food", "Employment"],
    "tags": ["eviction_notice", "two_minor_children", "recent_job_loss", "food_insecure"]
  },
  "severity": {
    "level": "high",
    "score": 82,
    "confidence": 0.86,
    "rationale": "Eviction within ~7 days plus reported child food insecurity and recent job loss combine into a high-need case requiring fast contact.",
    "signals": ["eviction notice for next week", "kids haven't eaten properly in days", "job ended last month"]
  },
  "risk_flags": {
    "self_harm": false,
    "domestic_abuse": false,
    "child_safety": true,
    "eviction_imminent": true,
    "food_insecurity": true,
    "medical_emergency": false,
    "substance_abuse": false,
    "isolation": false
  },
  "urgency_window": "this_week",
  "recommended_programs": [
    { "name": "SNAP", "reason": "Client reports children are food-insecure; should be reviewed for SNAP eligibility.", "source": "hardcoded" },
    { "name": "Local shelter network", "reason": "Eviction is imminent; staff should connect to short-term housing options.", "source": "hardcoded" },
    { "name": "LIHEAP", "reason": "May benefit from energy assistance to free household funds for rent.", "source": "hardcoded" }
  ],
  "follow_up_questions": [
    "Has the eviction notice been served in writing, and what is the exact date?",
    "Are the children currently enrolled in school meal programs?",
    "What is the household's expected income for the next 30 days?",
    "Are there any other adults contributing to household expenses?"
  ],
  "ai_comments": [
    { "type": "context", "text": "Client mentioned the children have not eaten properly in recent days; flag for child welfare considerations." },
    { "type": "suggestion", "text": "Verify the eviction notice in writing before recommending Legal Aid referral." },
    { "type": "flag", "text": "Job ended last month — possible Unemployment Insurance eligibility not yet asked about." }
  ],
  "keywords_extracted": [
    "eviction notice",
    "next week",
    "two kids",
    "haven't eaten properly",
    "in days",
    "job ended",
    "last month"
  ],
  "language_detected": "en",
  "model_meta": {
    "model": "qwen3:30b",
    "provider": "ollama",
    "ms": 8420,
    "schema_version": "1.0"
  }
}
```

## Out-of-band rules the analyzer module enforces (not the LLM)

After the LLM responds, before returning, `analyzer.js`:

1. **JSON parses** the response. If parse fails, retry once with the parser
   error fed back into the prompt.
2. **Validates** against the zod schema. If invalid, retry once with the
   validation error fed back. If still invalid, return a partial result with
   `summary.staff_facing` set to a clear failure note.
3. **Applies the severity floor**: clamps `severity.level` to be at least
   the rule-based level.
4. **Appends rule triggers** to `severity.signals`, prefixed so staff can
   see what was a regex hit vs a model hit.
5. **Stamps `model_meta`** with model name, provider, wall-clock ms, and
   `schema_version: "1.0"`.
