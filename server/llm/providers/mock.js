// Mock provider returning canned valid AnalysisResult payloads.
// Used by the smoke test and the eval harness so they run without an LLM.
// Dispatch is keyed off distinctive substrings in the userPrompt (which embeds
// the qa_pairs_block built by analyzer.js). When no match is found we fall
// through to the eviction fixture, which is the long-standing default.

const META = { model: 'mock-fixture', provider: 'mock', ms: 0, schema_version: '1.0' };

const EVICTION = {
  summary: {
    staff_facing: "Client reports an eviction notice for next week and that two children have not eaten regularly in recent days. Client lost his job last month. Situation may benefit from urgent housing stabilization and food assistance referrals. Should be reviewed for child welfare considerations given the food insecurity disclosed.",
    client_facing: "Thanks for sharing what's going on, James. A Hope Connector will reach out by text very soon to help with housing and food right away.",
  },
  classification: {
    primary_category: "Housing",
    secondary_categories: ["Food", "Employment"],
    tags: ["eviction_notice", "two_minor_children", "recent_job_loss", "food_insecure"],
  },
  severity: {
    level: "high",
    score: 82,
    confidence: 0.86,
    rationale: "Eviction within ~7 days plus reported child food insecurity and recent job loss combine into a high-need case requiring fast contact.",
    signals: [
      "eviction notice for next week",
      "kids haven't eaten properly in days",
      "job ended last month",
    ],
  },
  risk_flags: {
    self_harm: false,
    domestic_abuse: false,
    child_safety: true,
    eviction_imminent: true,
    food_insecurity: true,
    medical_emergency: false,
    substance_abuse: false,
    isolation: false,
  },
  urgency_window: "this_week",
  recommended_programs: [
    { name: "SNAP", reason: "Client reports children are food-insecure; should be reviewed for SNAP eligibility.", source: "hardcoded" },
    { name: "Local shelter network", reason: "Eviction is imminent; staff should connect to short-term housing options.", source: "hardcoded" },
    { name: "LIHEAP", reason: "May benefit from energy assistance to free household funds for rent.", source: "hardcoded" },
  ],
  follow_up_questions: [
    "Has the eviction notice been served in writing, and what is the exact date?",
    "Are the children currently enrolled in school meal programs?",
    "What is the household's expected income for the next 30 days?",
    "Are there any other adults contributing to household expenses?",
  ],
  ai_comments: [
    { type: "context", text: "Client mentioned the children have not eaten properly in recent days; flag for child welfare considerations." },
    { type: "suggestion", text: "Verify the eviction notice in writing before recommending Legal Aid referral." },
    { type: "flag", text: "Job ended last month — possible Unemployment Insurance eligibility not yet asked about." },
  ],
  keywords_extracted: [
    "eviction notice",
    "next week",
    "two kids",
    "haven't eaten properly",
    "in days",
    "job ended",
    "last month",
  ],
  language_detected: "en",
  model_meta: META,
};

const ROUTINE_FOOD = {
  summary: {
    staff_facing: "Client is stable and planning ahead for next month's groceries. Wants information on local food pantry options to stretch the household budget. No urgency, no immediate risk flags.",
    client_facing: "Thanks Maria. Someone from Hope Connect will share food pantry options near you so you can plan ahead with confidence.",
  },
  classification: {
    primary_category: "Food",
    secondary_categories: [],
    tags: ["food_pantry_inquiry", "planning_ahead", "budget_tight"],
  },
  severity: {
    level: "low",
    score: 18,
    confidence: 0.78,
    rationale: "Client is stable, planning ahead, and asking for routine food pantry information — a non-urgent informational need.",
    signals: ["planning ahead for groceries", "money is tight", "stable situation"],
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
  urgency_window: "planning",
  recommended_programs: [
    { name: "Local food pantry directory", reason: "Client explicitly asked for food pantry information.", source: "directory" },
    { name: "SNAP", reason: "Client reports tight budget; may benefit from SNAP screening.", source: "hardcoded" },
  ],
  follow_up_questions: [
    "Confirm the client's preferred pantry day-of-week and time-of-day.",
    "Ask whether the household has dietary restrictions the pantry should know about.",
  ],
  ai_comments: [
    { type: "context", text: "Client is in planning mode — no immediate urgency." },
  ],
  keywords_extracted: ["food pantry", "next month", "groceries", "stable", "money is tight"],
  language_detected: "en",
  model_meta: META,
};

const SELF_HARM = {
  summary: {
    staff_facing: "Client disclosed suicidal ideation while describing imminent loss of housing. They are couch-surfing and being asked to leave this week. Crisis resources must be offered immediately alongside housing referrals.",
    client_facing: "Thank you for trusting us with this, Alex. A Hope Connector will reach out very soon. If you are in immediate danger, please call or text 988.",
  },
  classification: {
    primary_category: "Housing",
    secondary_categories: ["Healthcare"],
    tags: ["suicidal_ideation", "imminent_homelessness", "couch_surfing"],
  },
  severity: {
    level: "high",
    score: 88,
    confidence: 0.84,
    rationale: "Client disclosed wanting to die alongside imminent loss of shelter — a high-severity case that the rule layer will floor to crisis.",
    signals: ["want to die", "kicking me out this week", "lost my apartment"],
  },
  risk_flags: {
    self_harm: true,
    domestic_abuse: false,
    child_safety: false,
    eviction_imminent: false,
    food_insecurity: false,
    medical_emergency: false,
    substance_abuse: false,
    isolation: true,
  },
  urgency_window: "today",
  recommended_programs: [
    { name: "988 Suicide and Crisis Lifeline", reason: "Client disclosed suicidal ideation; provide crisis line first.", source: "hardcoded" },
    { name: "Local shelter network", reason: "Imminent loss of couch-surfing arrangement.", source: "hardcoded" },
  ],
  follow_up_questions: [
    "Confirm whether the client is safe right now and whether they have a plan to harm themselves.",
    "Ask the client whether they are open to being connected to a counselor today.",
    "Identify the specific date the friend is asking the client to leave.",
  ],
  ai_comments: [
    { type: "flag", text: "Suicidal ideation disclosed — crisis floor applies regardless of LLM severity." },
    { type: "suggestion", text: "Lead client-facing reply with 988 contact info." },
  ],
  keywords_extracted: ["want to die", "lost my apartment", "couch", "kicking me out", "this week"],
  language_detected: "en",
  model_meta: META,
};

const DOMESTIC_ABUSE = {
  summary: {
    staff_facing: "Client disclosed ongoing domestic violence by a partner and concern for their child's safety. Wants to leave the home safely. Contact must be by text only per client's stated preference; do not call.",
    client_facing: "Thank you for sharing that, Dana. A Hope Connector will text you shortly with safe options.",
  },
  classification: {
    primary_category: "Housing",
    secondary_categories: ["Legal", "Healthcare"],
    tags: ["domestic_violence", "child_present", "text_only_contact"],
  },
  severity: {
    level: "high",
    score: 90,
    confidence: 0.88,
    rationale: "Active intimate-partner violence with a minor child in the household — rule layer will floor to crisis.",
    signals: ["hitting me", "ongoing domestic violence", "scared for myself and my child"],
  },
  risk_flags: {
    self_harm: false,
    domestic_abuse: true,
    child_safety: true,
    eviction_imminent: false,
    food_insecurity: false,
    medical_emergency: false,
    substance_abuse: false,
    isolation: false,
  },
  urgency_window: "today",
  recommended_programs: [
    { name: "National Domestic Violence Hotline", reason: "Client disclosed ongoing IPV; provide hotline as first option.", source: "hardcoded" },
    { name: "Local DV shelter network", reason: "Client wants to leave home safely.", source: "hardcoded" },
    { name: "Legal Aid", reason: "Client may need a protective order.", source: "hardcoded" },
  ],
  follow_up_questions: [
    "Confirm a safe time and channel for outreach without alerting the partner.",
    "Ask whether the child is currently safe and in the home.",
    "Ask if the client has identification and essential documents accessible.",
  ],
  ai_comments: [
    { type: "flag", text: "Text-only contact requested — do NOT call this client." },
    { type: "suggestion", text: "Coordinate with a DV-trained advocate before the first outreach." },
  ],
  keywords_extracted: ["domestic violence", "hitting me", "leave my house", "scared", "my child"],
  language_detected: "en",
  model_meta: META,
};

const SPANISH = {
  summary: {
    staff_facing: "La cliente busca información sobre una despensa de comida cercana para su familia con tres hijos pequeños. La despensa local cerró el mes pasado. Situación estable, sin urgencia inmediata.",
    client_facing: "Gracias por contactarnos, Lucía. Un miembro de Hope Connect le llamará pronto con información sobre despensas cercanas.",
  },
  classification: {
    primary_category: "Food",
    secondary_categories: [],
    tags: ["food_pantry_closed", "spanish_speaker", "three_minor_children"],
  },
  severity: {
    level: "low",
    score: 22,
    confidence: 0.8,
    rationale: "Necesidad alimentaria no urgente; la familia tiene tres hijos y la despensa local cerró.",
    signals: ["necesito ayuda con comida", "tres hijos pequeños", "la despensa cerró el mes pasado"],
  },
  risk_flags: {
    self_harm: false,
    domestic_abuse: false,
    child_safety: false,
    eviction_imminent: false,
    food_insecurity: true,
    medical_emergency: false,
    substance_abuse: false,
    isolation: false,
  },
  urgency_window: "this_month",
  recommended_programs: [
    { name: "Despensa de comida regional", reason: "La despensa local cerró; conectar con alternativas cercanas.", source: "directory" },
    { name: "SNAP", reason: "Familia con tres hijos puede calificar para asistencia alimentaria.", source: "hardcoded" },
    { name: "WIC", reason: "Hijos pequeños pueden calificar para WIC.", source: "hardcoded" },
  ],
  follow_up_questions: [
    "Confirmar las edades exactas de los tres hijos para evaluar elegibilidad de WIC.",
    "Preguntar si la familia tiene transporte para llegar a despensas alternativas.",
  ],
  ai_comments: [
    { type: "context", text: "Comunicación en español; asignar a personal bilingüe si es posible." },
  ],
  keywords_extracted: ["necesito ayuda", "comida", "tres hijos", "despensa", "cerró el mes pasado"],
  language_detected: "es",
  model_meta: META,
};

const MULTI_CATEGORY = {
  summary: {
    staff_facing: "Client reports overlapping needs: behind on rent after losing hours at work, fridge mostly empty, and out of insulin without funds for a refill. Multiple stabilization referrals needed.",
    client_facing: "Thanks for sharing all of this, Sam. A Hope Connector will reach out by email to help sort out housing, food, and the medication issue together.",
  },
  classification: {
    primary_category: "Housing",
    secondary_categories: ["Food", "Healthcare"],
    tags: ["behind_on_rent", "food_insecure", "out_of_insulin", "lost_hours_at_work"],
  },
  severity: {
    level: "high",
    score: 70,
    confidence: 0.81,
    rationale: "Behind on rent plus active medication gap (insulin) plus food insecurity — overlapping stabilization needs warrant high severity.",
    signals: ["behind on rent", "fridge is mostly empty", "ran out of my insulin"],
  },
  risk_flags: {
    self_harm: false,
    domestic_abuse: false,
    child_safety: false,
    eviction_imminent: false,
    food_insecurity: true,
    medical_emergency: false,
    substance_abuse: false,
    isolation: false,
  },
  urgency_window: "this_week",
  recommended_programs: [
    { name: "SNAP", reason: "Client reports food insecurity.", source: "hardcoded" },
    { name: "Local rental assistance", reason: "Client is behind on rent after lost work hours.", source: "hardcoded" },
    { name: "Patient assistance program for insulin", reason: "Client cannot afford insulin refill.", source: "hardcoded" },
  ],
  follow_up_questions: [
    "Ask how many days of insulin the client has left and which formulation.",
    "Ask the dollar amount the client is behind on rent and the landlord's stance.",
    "Ask whether the client has applied for any benefits in the last 12 months.",
  ],
  ai_comments: [
    { type: "flag", text: "Insulin gap is medically time-sensitive even though not framed as an emergency." },
  ],
  keywords_extracted: ["behind on rent", "groceries", "diabetes medication", "insulin", "lost hours"],
  language_detected: "en",
  model_meta: META,
};

const ONE_WORD = {
  summary: {
    staff_facing: "Client provided minimal one-to-three-word answers. Self-identified need is food and described situation as low income. Insufficient detail to fully classify; follow-up questions required.",
    client_facing: "Thanks Pat. A Hope Connector will reach out by text shortly to learn a bit more and help with food.",
  },
  classification: {
    primary_category: "Food",
    secondary_categories: [],
    tags: ["minimal_responses", "low_income", "needs_followup"],
  },
  severity: {
    level: "medium",
    score: 40,
    confidence: 0.45,
    rationale: "Limited information provided; client states food need and low income. Cannot reliably assess severity from terse answers.",
    signals: ["food", "low income", "kind of urgent"],
  },
  risk_flags: {
    self_harm: false,
    domestic_abuse: false,
    child_safety: false,
    eviction_imminent: false,
    food_insecurity: true,
    medical_emergency: false,
    substance_abuse: false,
    isolation: false,
  },
  urgency_window: "this_week",
  recommended_programs: [
    { name: "SNAP", reason: "Client reports food need and low income — SNAP screening warranted.", source: "hardcoded" },
    { name: "Local food pantry directory", reason: "Immediate food access option.", source: "directory" },
  ],
  follow_up_questions: [
    "Ask the client how many people are in the household.",
    "Ask whether the food need is for today, this week, or routine ongoing support.",
    "Ask whether the client has any current benefits enrollment.",
  ],
  ai_comments: [
    { type: "clarification", text: "Answers were one-to-three words; do not infer detail not stated." },
  ],
  keywords_extracted: ["Pat", "text", "food", "kind of", "low income"],
  language_detected: "en",
  model_meta: META,
};

const MEDICAL_EMERGENCY = {
  summary: {
    staff_facing: "Client reports active sharp chest pain since morning, no insurance, lives alone, cannot afford ER copay. This is a possible cardiac emergency. 911 / nearest ED guidance must be delivered immediately.",
    client_facing: "Robin, please call 911 or go to the nearest emergency room right away — chest pain that lasts hours can be serious. A Hope Connector will follow up by phone.",
  },
  classification: {
    primary_category: "Healthcare",
    secondary_categories: ["Legal"],
    tags: ["chest_pain", "uninsured", "lives_alone", "possible_cardiac_event"],
  },
  severity: {
    level: "high",
    score: 92,
    confidence: 0.9,
    rationale: "Active chest pain of several hours' duration in an uninsured client is a medical emergency requiring 911 / ED guidance immediately.",
    signals: ["chest pain since this morning", "no insurance", "live alone"],
  },
  risk_flags: {
    self_harm: false,
    domestic_abuse: false,
    child_safety: false,
    eviction_imminent: false,
    food_insecurity: false,
    medical_emergency: true,
    substance_abuse: false,
    isolation: true,
  },
  urgency_window: "today",
  recommended_programs: [
    { name: "911 / nearest emergency department", reason: "Active possible cardiac symptoms — emergency care first.", source: "hardcoded" },
    { name: "Hospital financial assistance / charity care", reason: "Client is uninsured; surface charity-care options for the bill.", source: "hardcoded" },
    { name: "Medicaid emergency enrollment screening", reason: "May qualify for emergency Medicaid coverage of the ED visit.", source: "hardcoded" },
  ],
  follow_up_questions: [
    "Confirm whether the client has called 911 or made it to an ED.",
    "Ask whether anyone can stay with the client while they wait for care.",
    "Identify the nearest hospital with strong charity-care policy.",
  ],
  ai_comments: [
    { type: "flag", text: "Medical emergency — staff must respond before any benefits-screening conversation." },
  ],
  keywords_extracted: ["chest pain", "this morning", "no insurance", "ER copay", "live alone"],
  language_detected: "en",
  model_meta: META,
};

const STABLE_PLANNING = {
  summary: {
    staff_facing: "Client has stable income on a fixed monthly budget and is researching LIHEAP eligibility ahead of winter heating costs. Pure planning inquiry; no current need or risk.",
    client_facing: "Thanks Jordan. A Hope Connector will email you LIHEAP eligibility details so you're set when winter rolls around.",
  },
  classification: {
    primary_category: "Utilities",
    secondary_categories: [],
    tags: ["liheap_inquiry", "winter_heating", "planning_ahead", "stable_income"],
  },
  severity: {
    level: "low",
    score: 10,
    confidence: 0.82,
    rationale: "Stable client researching a benefit ahead of seasonal need — no immediate severity.",
    signals: ["stable income", "fixed monthly budget", "planning ahead for winter"],
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
  urgency_window: "planning",
  recommended_programs: [
    { name: "LIHEAP", reason: "Client explicitly asked about LIHEAP eligibility.", source: "hardcoded" },
    { name: "Weatherization assistance", reason: "Often pairs with LIHEAP for cost reduction.", source: "hardcoded" },
  ],
  follow_up_questions: [
    "Confirm the client's household size and income range for LIHEAP screening.",
    "Ask whether the client rents or owns to determine which programs apply.",
  ],
  ai_comments: [
    { type: "context", text: "Pure informational inquiry — no urgency, no risk flags." },
  ],
  keywords_extracted: ["LIHEAP", "winter heating", "stable income", "planning ahead", "monthly budget"],
  language_detected: "en",
  model_meta: META,
};

const SUBSTANCE = {
  summary: {
    staff_facing: "Client is working part-time and seeking a more stable apartment. Disclosed in passing that they have been drinking too much to cope with stress and is independently looking into a support group. Note for staff outreach but not an emergency.",
    client_facing: "Thanks for sharing, Chris. A Hope Connector will call to talk through more stable housing options.",
  },
  classification: {
    primary_category: "Housing",
    secondary_categories: ["Healthcare"],
    tags: ["seeking_stable_housing", "part_time_work", "self_aware_coping"],
  },
  severity: {
    level: "medium",
    score: 45,
    confidence: 0.7,
    rationale: "Housing instability with self-disclosed coping concerns; client is already self-directing toward support, so severity is moderate, not crisis.",
    signals: ["month-to-month place", "drinking too much lately", "looking into a support group"],
  },
  risk_flags: {
    self_harm: false,
    domestic_abuse: false,
    child_safety: false,
    eviction_imminent: false,
    food_insecurity: false,
    medical_emergency: false,
    substance_abuse: true,
    isolation: false,
  },
  urgency_window: "this_month",
  recommended_programs: [
    { name: "Local housing search assistance", reason: "Client wants more stable housing.", source: "directory" },
    { name: "SAMHSA National Helpline", reason: "Client mentioned drinking concerns; provide support resource.", source: "hardcoded" },
  ],
  follow_up_questions: [
    "Ask about the client's monthly housing budget range.",
    "Ask whether the client has identified a specific support group already.",
  ],
  ai_comments: [
    { type: "context", text: "Substance disclosure was incidental and self-aware; do not lead with it in client-facing reply." },
  ],
  keywords_extracted: ["part-time", "stable apartment", "month-to-month", "drinking too much", "support group"],
  language_detected: "en",
  model_meta: META,
};

function pickFixture(userPrompt) {
  const u = String(userPrompt || '').toLowerCase();
  if (u.includes('want to die') || u.includes('end my life') || u.includes('kill myself')) return SELF_HARM;
  if (u.includes('domestic violence') || u.includes('hitting me')) return DOMESTIC_ABUSE;
  if (u.includes('chest pain') || u.includes('medical emergency')) return MEDICAL_EMERGENCY;
  if (u.includes('drinking too much')) return SUBSTANCE;
  if (u.includes('insulin') || u.includes('diabetes medication')) return MULTI_CATEGORY;
  if (u.includes('liheap') || u.includes('winter heating')) return STABLE_PLANNING;
  if (u.includes('food pantry') && u.includes('maria')) return ROUTINE_FOOD;
  if (u.includes('necesito') || u.includes('despensa') || u.includes('¿')) return SPANISH;
  if (u.includes('a5: low income')) return ONE_WORD;
  return EVICTION;
}

export async function generateAnalysis({ userPrompt } = {}) {
  return JSON.stringify(pickFixture(userPrompt));
}
