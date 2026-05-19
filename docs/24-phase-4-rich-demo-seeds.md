# 24 — Phase 4: Rich Demo Seeds

## Goal

Replace the current two-intake hardcoded seeds with five pre-baked demo cases that span the severity range (Low → Crisis) and exercise the full dashboard UI. Each seed includes a fully populated `analysis` object so the dashboard renders rich on first paint — no "(legacy)" badges, no "Analysis pending" banners.

The five seeds live as JSON files under `server/seed/`. The `server/seed.js` script loads them, computes the `helpScore` deterministically, and inserts each into the SQLite store from Phase 3 only if the database is empty.

Time estimate: 60–90 minutes (writing realistic seed content is the bulk of the work).

## Hard rule — DO NOT TOUCH THE INTAKE

This phase touches only seed data and the seeder. Do not change any of the following:

- `client/src/pages/IntakeChat.jsx`
- `client/src/lib/screening-questions.js`
- `server/screening-questions.js`
- `server/intake-flow.js`
- `server/prompts.js`
- The popover chat
- The screening question text, IDs, ordering, or polarity

The seed data must conform to the existing `Intake` shape produced by `store.blankIntake()` and the existing `AnalysisResult` shape validated by `server/llm/schema.js`. Do not invent new fields.

## Files to read first

- `server/seed.js` — current seed script (will be rewritten)
- `server/store.js` — confirm the `Intake` shape (the new `blankIntake()` from Phase 3)
- `server/llm/schema.js` — confirm the exact `AnalysisResult` schema
- `server/llm/providers/mock.js` — has 9 valid `AnalysisResult` fixtures that are good reference material
- `server/help-score.js` — `computeHelpScore(analysis)` is used by the seeder
- `server/screening-questions.js` — section/question IDs needed for `screeningAnswers`
- `server/llm/eval/fixtures/*.json` — additional reference for situation framings

## Files to modify

- `server/seed.js` — rewrite to load JSON files

## Files to create

- `server/seed/01-maria-low.json` — Food / Low
- `server/seed/02-patricia-medium.json` — Utilities / Medium
- `server/seed/03-sam-medium.json` — Healthcare / Medium (multi-category)
- `server/seed/04-james-high.json` — Housing / High (with child)
- `server/seed/05-alex-crisis.json` — Healthcare / Crisis (self-harm disclosure)
- `server/seed/README.md` — short note explaining the seed convention

## Background

Today's seeds in `seed.js` set only the `summary` text field and a handful of structured columns. They do NOT set the `analysis` object, so `client/src/pages/IntakeDetail.jsx` treats them as "legacy" — the entire AI-driven panel (Help Score, Recommended Programs, AI Comments, Follow-up Questions, Risk Flags, Tags, Keywords) is hidden behind an "Analysis pending — click Re-run analysis" prompt. That's not a demo-ready experience.

Seeded cases must be pre-baked: every field the dashboard expects is set, including `analysis`, `helpScore`, `qaPairs`, `screeningAnswers`, and `isDemoData: true`.

The mock provider's fixtures in `server/llm/providers/mock.js` are an excellent reference — they are valid `AnalysisResult` objects that pass Zod. The seeder does not call the mock provider; it embeds the analysis data directly so seeds work even when `LLM_PROVIDER=mock` is not set.

## Seed scenario summary

| File | Client | Category | Severity | Hook for demo narrative |
|---|---|---|---|---|
| 01 | Maria Garcia | Food | low | Single parent, reduced hours, planning ahead — non-urgent inquiry |
| 02 | Patricia Williams | Utilities | medium | Fixed income, behind on heating bills, LIHEAP inquiry |
| 03 | Sam Rivera | Healthcare | medium | Out of insulin, lost work hours, food insecurity — multi-category |
| 04 | James Thompson | Housing | high | Eviction this Friday, has a 6-year-old, no family nearby |
| 05 | Alex Chen | Healthcare | crisis | Self-harm disclosure while couch-surfing — rule-floor escalates to crisis |

These scenarios are intentionally fictitious and are not modeled on any specific real case. They are designed to exercise the dashboard's range of severity colors, risk flags, recommended-program logic, and AI comment types.

## Seed JSON shape

Every seed file must be a JSON object with the following top-level keys. Fields not listed here use their defaults from `blankIntake()`.

```jsonc
{
  "id": "ink_seed_01",                       // deterministic, "ink_seed_NN"
  "createdAt": "ISO timestamp, offset from now",
  "status": "submitted",
  "currentStep": "complete",
  "isDemoData": true,                        // marks this as seeded for the dashboard

  "clientName": "Maria Garcia",
  "contactPreference": "phone: (555) 0142-2391",
  "needCategory": "Food",
  "urgencyFlag": "low",                      // matches analysis.severity.level mapping
  "crisisFlag": false,

  "structuredAnswers": {
    "firstName": "Maria",
    "lastName": "Garcia",
    "phone": "(555) 0142-2391",
    "email": "",
    "address": "412 Hillside Ave",
    "city": "Springfield",
    "zip": "62704",
    "situationSummary": ""                   // empty for form-only intakes; that's fine
  },

  "screeningAnswers": {                      // 1-5 Likert per question; partial answers OK
    "mental_health":   { "mh_1": 2, "mh_2": 2, "mh_3": 2, "mh_4": 2, "mh_5": 3 },
    "physical_health": { "ph_1": 1, "ph_2": 4, "ph_3": 3, "ph_4": 3, "ph_5": 3 },
    "quality_of_life": { "qol_1": 3, "qol_2": 4, "qol_3": 4, "qol_4": 4, "qol_5": 2, "qol_6": 3, "qol_7": 3 }
  },
  "screeningComments": {
    "mental_health":   "",
    "physical_health": "",
    "quality_of_life": "",
    "general":         "Just looking for a steady food pantry option so we can stretch our budget."
  },
  "screeningUpdatedAt": "ISO timestamp",

  "transcript": [                            // 3-6 messages, brief and tonally appropriate
    { "role": "assistant", "content": "Hi! I'm an AI intake assistant — a human case manager will review what we collect.", "step": "greeting" },
    { "role": "user",      "content": "Hi", "step": "ask_name" }
  ],

  "qaPairs": [                               // mirrors what buildQAPairs would produce
    { "question": "What is your first name?",                          "answer": "Maria" },
    { "question": "How would you like us to reach you?",               "answer": "phone: (555) 0142-2391" },
    { "question": "What kind of help do you need?",                    "answer": "Food" },
    { "question": "Is this urgent or are you planning ahead?",         "answer": "Planning ahead, not urgent right now." },
    { "question": "Tell me about your situation in your own words.",   "answer": "" }
    // ... screening pairs follow, but seeders may omit them for brevity
  ],

  "analysis": {                              // FULL AnalysisResult — every field required by schema.js
    "summary": {
      "staff_facing": "Client is a single parent reporting reduced work hours and a tight food budget. They are asking about local food pantry options ahead of next month's grocery cycle. No immediate urgency; situation is stable.",
      "client_facing": "Thanks Maria — a Hope Connector will reach out by phone to share food pantry options near you."
    },
    "classification": {
      "primary_category": "Food",
      "secondary_categories": [],
      "tags": ["food_pantry_inquiry", "planning_ahead", "single_parent", "budget_tight"]
    },
    "severity": {
      "level": "low",
      "score": 18,
      "confidence": 0.82,
      "rationale": "Client is stable and planning ahead — a routine food assistance inquiry with no immediate risk indicators.",
      "signals": ["planning ahead for groceries", "single parent", "reduced hours at work"]
    },
    "risk_flags": {
      "self_harm": false,
      "domestic_abuse": false,
      "child_safety": false,
      "eviction_imminent": false,
      "food_insecurity": false,
      "medical_emergency": false,
      "substance_abuse": false,
      "isolation": false
    },
    "urgency_window": "this_month",
    "recommended_programs": [
      { "name": "Local food pantry network", "reason": "Client explicitly asked about food pantry options.",                 "source": "hardcoded" },
      { "name": "SNAP",                       "reason": "Client reports a tight budget; may benefit from SNAP screening.",   "source": "hardcoded" }
    ],
    "follow_up_questions": [
      "Confirm the client's preferred pantry day-of-week and time-of-day.",
      "Ask whether the household has dietary restrictions the pantry should know about.",
      "Ask if the client has applied for SNAP in the past 12 months."
    ],
    "ai_comments": [
      { "type": "context",    "text": "Client is in planning mode — no immediate urgency, treat as a routine outreach." },
      { "type": "suggestion", "text": "Pair pantry referral with SNAP screening to address underlying budget pressure." }
    ],
    "keywords_extracted": ["food pantry", "next month", "single parent", "reduced hours", "tight budget"],
    "language_detected": "en",
    "model_meta": { "model": "seed", "provider": "mock", "ms": 0, "schema_version": "1.0" }
  },

  "helpScore": null                          // seed.js computes this from analysis
}
```

`helpScore` is computed by the seeder via `computeHelpScore(analysis)`, so seed files should leave it `null` (the seeder fills it).

`isDemoData: true` is a new flag introduced by Phase 4. The dashboard polish (Phase 5) will read this flag to show a "DEMO" pill, but the field is harmless to other code in the meantime.

## Seed content requirements per file

Each seed must:

1. Have a unique deterministic `id` of the form `ink_seed_NN` where NN is the file number.
2. Set `createdAt` to a recent offset (newest seed is `~5 minutes ago`, oldest is `~7 days ago`). This makes the time-ago column on the dashboard look natural.
3. Set `status` to `"submitted"` and `currentStep` to `"complete"`.
4. Include realistic but fictional contact info (US-style addresses, fake phone in `(555) 0xxx-xxxx` range to be obviously not-real).
5. Have `screeningAnswers` that match the narrative — e.g., the crisis case has `mh_1` and `mh_5` indicating distress.
6. Have a populated `analysis` object that passes Zod (all required fields, valid enums, arrays within min/max bounds).
7. Have an `analysis.severity.level` consistent with the seed's intended severity column.
8. Include a tightly written `transcript` of 3–6 messages — enough to populate the transcript card without being verbose.
9. For the crisis seed: `risk_flags.self_harm = true`, and the analysis severity may say "high" while the seeder's intake `urgencyFlag = "high"` and `crisisFlag = true`. The application's `runAnalyzer` floor logic enforces crisis when self-harm is present at runtime; for seeds, set `crisisFlag: true` directly.

### Specific narrative anchors per seed

**01 — Maria Garcia (Food / Low):** Single parent, two kids, reduced work hours, asking about food pantries for next month. Mental health screening shows mild stress, physical health is fine, QoL is moderate. No flags. SNAP + local pantry referral. `urgency_window: "this_month"`. `tags`: food_pantry_inquiry, planning_ahead, single_parent.

**02 — Patricia Williams (Utilities / Medium):** Senior on fixed income (Social Security), behind on heating bills going into winter, looking into LIHEAP. Mental health moderate, physical health flagged (mobility difficulty), QoL low on `qol_5` (money for needs) and `qol_7` (housing satisfaction). LIHEAP + weatherization referral. `urgency_window: "this_week"`. `tags`: liheap_inquiry, fixed_income, senior, behind_on_utilities. `risk_flags`: none active.

**03 — Sam Rivera (Healthcare / Medium):** Lost work hours, ran out of insulin, fridge mostly empty, behind on rent. Multi-category — primary Healthcare, secondaries Food + Housing. MH moderate, PH flagged (chronic condition), QoL low on money + healthcare access. Recommended: patient assistance program for insulin, SNAP, local rental assistance. `urgency_window: "this_week"`. `tags`: out_of_insulin, food_insecure, behind_on_rent, lost_hours. `risk_flags`: food_insecurity true, others false.

**04 — James Thompson (Housing / High):** Eviction notice with Friday deadline, 6-year-old daughter, no family nearby. MH moderate (acute stress), PH fine, QoL low on housing + money + safety. Primary Housing, secondaries Food + Legal. Recommended: local shelter network, Legal Aid (for eviction), SNAP (for child). `urgency_window: "this_week"`. `tags`: eviction_imminent, has_minor_child, no_family_support. `risk_flags`: eviction_imminent true, child_safety true.

**05 — Alex Chen (Healthcare / Crisis):** Couch-surfing, friend asking them to leave this week, disclosed wanting to die. MH severe (high anhedonia, high worry, low self-esteem), PH moderate, QoL very low across the board. Primary Healthcare, secondaries Housing. Recommended: 988 Suicide and Crisis Lifeline (first), local shelter network. `urgency_window: "today"`. `tags`: suicidal_ideation, imminent_homelessness, couch_surfing. `risk_flags`: self_harm true, isolation true. `crisisFlag: true`, `urgencyFlag: "high"`, `analysis.severity.level: "high"` (the runtime floor would push to crisis; for seeds we set `crisisFlag` directly and the application UI renders the crisis banner correctly).

## Steps

### 1. Create the directory and README

```
server/seed/
  README.md
  01-maria-low.json
  02-patricia-medium.json
  03-sam-medium.json
  04-james-high.json
  05-alex-crisis.json
```

`server/seed/README.md` content:

```markdown
# Seed cases

Each `NN-name-severity.json` file is a complete demo intake including a
pre-computed `analysis` object. `server/seed.js` loads these files and
inserts them into the SQLite store at boot when the store is empty.

These scenarios are fictional and not modeled on real cases. They exist to
exercise the dashboard's full range of severities, risk flags, and
recommended-program logic during demos.

To reset demo state:
  rm server/data/intakes.db*
  npm run dev   # seeds run on next boot
```

### 2. Write the five seed JSON files

Use the shape above. Take the time to make each one read as a plausible scenario — the mock provider fixtures in `server/llm/providers/mock.js` are good source material for `analysis` content.

Schema constraints (`server/llm/schema.js`) that are easy to miss:

- `summary.staff_facing` and `summary.client_facing`: each max 800 chars.
- `classification.tags`: each tag matches `/^[a-z][a-z0-9_]{1,38}$/`, max 8 tags.
- `classification.secondary_categories`: max 3, no duplicates, must NOT include the primary.
- `severity.score`: integer 0–100.
- `severity.confidence`: number 0–1 (decimal allowed).
- `follow_up_questions`: 2–5 items, each up to 1000 chars.
- `ai_comments`: max 6 items.
- `keywords_extracted`: 5–15 items.
- `language_detected`: 2–5 chars (`"en"`, `"es"`, etc.).
- `model_meta.provider`: one of `"ollama"`, `"azure"`, `"bedrock"`, `"mock"`. Use `"mock"` for seeds.
- `model_meta.schema_version`: literal `"1.0"`.

### 3. Rewrite `server/seed.js`

Replace the existing seed file with a loader-driven version:

```js
// Seeds the SQLite store with the JSON files in ./seed/ when the store is empty.
// Each JSON file is a full intake; the seeder computes helpScore from the
// embedded analysis object.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './store.js';
import { computeHelpScore } from './help-score.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, 'seed');

export function seedIfEmpty() {
  if (!store.isEmpty()) return;

  let files;
  try {
    files = fs.readdirSync(SEED_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort();
  } catch (err) {
    console.warn(`No seed directory at ${SEED_DIR}; skipping seed.`);
    return;
  }

  if (files.length === 0) {
    console.log('No seed files found; skipping seed.');
    return;
  }

  console.log(`Seeding ${files.length} demo intake records...`);
  const summaries = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(SEED_DIR, file), 'utf8');
      const intake = JSON.parse(raw);

      // Compute helpScore from analysis (deterministic).
      if (intake.analysis && intake.helpScore == null) {
        const { score } = computeHelpScore(intake.analysis);
        intake.helpScore = score;
      }

      // Default screeningUpdatedAt if missing.
      if (!intake.screeningUpdatedAt) {
        intake.screeningUpdatedAt = intake.createdAt || new Date().toISOString();
      }

      store.create(intake);
      summaries.push(`${intake.clientName} (${intake.needCategory}/${intake.analysis?.severity?.level || 'unknown'})`);
    } catch (err) {
      console.error(`Failed to load seed ${file}:`, err.message);
    }
  }
  console.log(`Seeded: ${summaries.join(', ')}`);
}
```

### 4. Verify the boot path

`server/index.js` already calls `seedIfEmpty()`. No change required there.

## Acceptance criteria

- Five JSON files exist under `server/seed/`, each a valid intake conforming to the spec above.
- Each file's embedded `analysis` passes `validateAnalysis` from `server/llm/schema.js` (run a quick sanity check: load each file, pass to `validateAnalysis`, expect `{ok: true}`).
- `server/seed.js` loads all five and creates them in the store on first boot.
- The dashboard at `/dashboard` shows all five intakes, each with a populated Help Score ring, severity pill, and category.
- Clicking into each intake shows the full IntakeDetail UI populated: AI Summary, Help Score breakdown, Recommended Programs, AI Comments, Follow-up Questions, Risk Flags, Tags & Keywords. No "Analysis pending" banner anywhere.
- The crisis case (`05-alex-crisis.json`) shows the red crisis banner and has `self_harm` checked in Risk Flags.
- `intake.isDemoData === true` on all five.

## Verification steps

1. `rm -rf server/data/intakes.db*` to start with an empty DB.
2. `npm run dev` — log should show `Seeded 5 demo intake records...` and a comma-separated client list.
3. Open `/dashboard` — all five rows visible, distinct severities (low / medium / medium / high / crisis), distinct categories.
4. Click into each one and confirm the IntakeDetail page renders fully.
5. Sanity check the schema by running an ad-hoc node script (optional):
   ```bash
   node -e "
     import('./server/llm/schema.js').then(async ({ validateAnalysis }) => {
       const fs = await import('node:fs');
       for (const f of fs.readdirSync('./server/seed').filter(x=>x.endsWith('.json'))) {
         const seed = JSON.parse(fs.readFileSync('./server/seed/'+f,'utf8'));
         const r = validateAnalysis(seed.analysis);
         console.log(f, r.ok ? 'OK' : 'FAIL: ' + r.error);
       }
     });
   "
   ```

## Rollback

Delete the `server/seed/` directory and revert `server/seed.js` to the previous version. The SQLite file under `server/data/` can be deleted to clear seeded data, or simply ignored — non-seeded intakes still work.

## Notes

- Seed scenarios are intentionally not real-case-derived. If the company later wants to use anonymized real cases, that's a separate task and would benefit from an additional review step.
- The seeder is idempotent at the database level (`store.isEmpty()` guard). To re-seed after edits, delete the DB file first.
- The `isDemoData` flag is read by Phase 5 (dashboard polish) but is harmless to all other code. No backend logic depends on it.
