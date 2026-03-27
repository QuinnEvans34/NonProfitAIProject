// Rule-based urgency and crisis detection.
// The app owns these flags — the model does NOT decide urgency.

const CRISIS_PATTERNS = [
  /\b(suicid|kill\s*(my|him|her|them)?self|end\s*(my|their)\s*life|want\s*to\s*die)\b/i,
  /\b(abuse|abus(ed|ing)|domestic\s*violence|being\s*hit|hitting\s*me)\b/i,
  /\b(overdos|od['']?ing)\b/i,
];

const HIGH_URGENCY_PATTERNS = [
  /\b(no\s*(safe\s*)?place\s*to\s*(stay|sleep|go)|sleep(ing)?\s*(outside|rough|in\s*(my\s*)?car))\b/i,
  /\b(homeless|unhoused|evict(ed|ion)\s*(today|tonight|tomorrow|this\s*week))\b/i,
  /\b(no\s*food|haven['']?t\s*eaten|kids?\s*(are\s*)?(hungry|haven['']?t\s*eaten))\b/i,
  /(?<!not\s)(?<!no\s)\b(emergency|urgent|immediate|right\s*now|today|tonight)\b/i,
  /\b(fleeing|escaping|ran\s*away|kicked\s*out)\b/i,
  /\b(medical\s*emergency|need\s*(a\s*)?doctor\s*(now|urgently|immediately))\b/i,
  /\b(danger|threatened|unsafe|afraid\s*for\s*(my|our)\s*(life|safety))\b/i,
];

const MEDIUM_URGENCY_PATTERNS = [
  /\b(behind\s*on\s*rent|facing\s*eviction|eviction\s*notice)\b/i,
  /\b(lost\s*(my\s*)?(job|work|income|housing|apartment|home))\b/i,
  /\b(can['']?t\s*(afford|pay)\s*(rent|bills|utilities|medication))\b/i,
  /\b(this\s*week|soon|running\s*out)\b/i,
  /\b(struggling|desperate|overwhelm)\b/i,
  /\b(no\s*(health\s*)?insurance)\b/i,
  /\b(disability|disabled|chronic\s*(pain|illness))\b/i,
];

// Scan a single message for urgency signals.
// Returns { urgencyFlag: 'low'|'medium'|'high', crisisFlag: boolean, triggers: string[] }
export function assessMessage(text) {
  const triggers = [];

  for (const pattern of CRISIS_PATTERNS) {
    const match = text.match(pattern);
    if (match) triggers.push(`crisis: "${match[0]}"`);
  }
  if (triggers.length > 0) {
    return { urgencyFlag: 'high', crisisFlag: true, triggers };
  }

  for (const pattern of HIGH_URGENCY_PATTERNS) {
    const match = text.match(pattern);
    if (match) triggers.push(`high: "${match[0]}"`);
  }
  if (triggers.length > 0) {
    return { urgencyFlag: 'high', crisisFlag: false, triggers };
  }

  for (const pattern of MEDIUM_URGENCY_PATTERNS) {
    const match = text.match(pattern);
    if (match) triggers.push(`medium: "${match[0]}"`);
  }
  if (triggers.length > 0) {
    return { urgencyFlag: 'medium', crisisFlag: false, triggers };
  }

  return { urgencyFlag: 'low', crisisFlag: false, triggers: [] };
}

// Scan ALL user messages in a transcript and return the highest urgency found.
export function assessTranscript(transcript) {
  let worst = { urgencyFlag: 'low', crisisFlag: false, triggers: [] };
  const rank = { low: 0, medium: 1, high: 2 };

  for (const msg of transcript) {
    if (msg.role !== 'user') continue;
    const result = assessMessage(msg.content);
    if (rank[result.urgencyFlag] > rank[worst.urgencyFlag]) {
      worst = result;
    }
    if (result.crisisFlag) worst.crisisFlag = true;
    worst.triggers.push(...result.triggers);
  }

  return worst;
}
