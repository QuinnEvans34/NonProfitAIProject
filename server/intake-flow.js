// App-controlled intake flow state machine.
// The model generates conversational text; the app decides step transitions and data capture.

import { chatReply } from './ollama.js';
import { INTAKE_SYSTEM_PROMPT } from './prompts.js';
import { assessMessage, assessTranscript } from './urgency.js';
import * as store from './store.js';
import { buildQAPairs } from './store.js';
import { analyzeIntake } from './llm/analyzer.js';
import { computeHelpScore } from './help-score.js';

// ── Step definitions ──
// Each step: { id, prompt (instruction for model), extract (pull data from user reply), next (decide next step) }

const NEED_CATEGORIES = ['Housing', 'Food', 'Healthcare', 'Employment', 'Legal', 'Utilities', 'Other'];

const STEPS = {
  greeting: {
    prompt: () =>
      'Greet the client in 2 sentences. Say you are an AI intake assistant (not a human). ' +
      'Say a human case manager will review their information. Then ask if they are ready to start.',
    extract: () => ({}),
    next: () => 'ask_name',
  },

  ask_name: {
    prompt: () =>
      'In one sentence, ask for their first name so you know what to call them.',
    extract: (text) => {
      const cleaned = text.replace(/^(my name is|i['']?m|call me|it['']?s|hi i['']?m|hey i['']?m)\s*/i, '').trim();
      const name = cleaned.split(/[\s,]+/).slice(0, 3).join(' ');
      return name.length > 0 ? { clientName: name } : null;
    },
    next: () => 'ask_contact',
  },

  ask_contact: {
    prompt: (intake) =>
      `Say "Thanks, ${intake.clientName || ''}." then ask in one sentence how they prefer to be contacted ` +
      'for follow-up: phone, email, text, or in person.',
    extract: (text) => {
      const lower = text.toLowerCase();
      if (/phone|call/i.test(lower)) return { contactPreference: 'phone' };
      if (/email/i.test(lower)) return { contactPreference: 'email' };
      if (/text|sms/i.test(lower)) return { contactPreference: 'text' };
      if (/in\s*person|walk.?in|office/i.test(lower)) return { contactPreference: 'in-person' };
      return { contactPreference: text.trim().slice(0, 50) };
    },
    next: () => 'ask_category',
  },

  ask_category: {
    prompt: () =>
      'In 1-2 sentences, ask which area they need help with. List these options naturally: ' +
      'housing, food, healthcare, employment, legal help, utilities, or something else.',
    extract: (text) => {
      const lower = text.toLowerCase();
      for (const cat of NEED_CATEGORIES) {
        if (lower.includes(cat.toLowerCase())) return { needCategory: cat };
      }
      if (/rent|apartment|shelter|homeless|evict/i.test(lower)) return { needCategory: 'Housing' };
      if (/hungry|meal|grocery|snap|ebt/i.test(lower)) return { needCategory: 'Food' };
      if (/doctor|medical|health|insurance|prescription|medicaid/i.test(lower)) return { needCategory: 'Healthcare' };
      if (/job|work|resume|unemploy/i.test(lower)) return { needCategory: 'Employment' };
      if (/lawyer|court|legal|custody/i.test(lower)) return { needCategory: 'Legal' };
      if (/electric|gas|water|bill|utilit/i.test(lower)) return { needCategory: 'Utilities' };
      return { needCategory: 'Other' };
    },
    next: () => 'ask_urgency',
  },

  ask_urgency: {
    prompt: (intake) =>
      `In one sentence, ask if their ${intake.needCategory?.toLowerCase() || ''} need is urgent or ` +
      'time-sensitive right now, or if they are planning ahead.',
    extract: (text) => {
      const assessment = assessMessage(text);
      return { _urgencyFromAnswer: assessment };
    },
    next: () => 'ask_situation',
  },

  ask_situation: {
    prompt: (intake) =>
      `In 1-2 sentences, ask ${intake.clientName || 'them'} to briefly describe their situation ` +
      'in their own words — whatever they are comfortable sharing. ' +
      'Say this helps the case manager understand how best to help.',
    extract: (text) => {
      return text.trim().length > 0 ? { situationSummary: text.trim() } : null;
    },
    next: () => 'confirm',
  },

  confirm: {
    prompt: (intake) =>
      `Briefly read back what you collected and ask ${intake.clientName || 'them'} to confirm or correct it:\n` +
      `Name: ${intake.clientName || '(not provided)'}\n` +
      `Contact: ${intake.contactPreference || '(not provided)'}\n` +
      `Need: ${intake.needCategory || '(not provided)'}\n` +
      `Situation: ${intake.structuredAnswers?.situationSummary || '(not provided)'}\n` +
      'Keep the readback concise. End with: "Does this look right, or would you like to change anything?"',
    extract: (text) => {
      const lower = text.toLowerCase().trim();
      const confirmed = /^(yes|yeah|yep|yup|correct|right|looks?\s*(good|right|correct)|that['']?s\s*(right|correct)|confirm|good|perfect|ok|okay)/i.test(lower);
      return { _confirmed: confirmed };
    },
    next: (_intake, extracted) => {
      if (extracted._confirmed) return 'complete';
      return 'ask_name';
    },
  },

  complete: {
    prompt: (intake) =>
      `In 2 sentences, thank ${intake.clientName || 'them'} and let them know a case manager ` +
      `will review their information and reach out via ${intake.contactPreference || 'their preferred method'}. ` +
      'Keep it warm and reassuring. Do not add anything else.',
    extract: () => ({}),
    next: () => null,
  },
};

const STEP_ORDER = ['greeting', 'ask_name', 'ask_contact', 'ask_category', 'ask_urgency', 'ask_situation', 'confirm', 'complete'];

// ── Public API ──

// Start a new intake. Creates a record and generates the greeting.
export async function startIntake() {
  const intake = store.create({ currentStep: 'greeting', status: 'in_progress' });

  const step = STEPS.greeting;
  const systemPrompt = INTAKE_SYSTEM_PROMPT + '\n\nYour current task:\n' + step.prompt(intake);
  const assistantMessage = await chatReply(systemPrompt, []);

  intake.transcript.push({ role: 'assistant', content: assistantMessage, step: 'greeting' });
  intake.currentStep = 'ask_name';
  store.update(intake.id, { transcript: intake.transcript, currentStep: 'ask_name' });

  return {
    id: intake.id,
    message: assistantMessage,
    step: 'greeting',
    nextStep: 'ask_name',
    isComplete: false,
    stepIndex: 0,
    totalSteps: STEP_ORDER.length,
  };
}

// Process a user message for the given intake. Returns the next assistant message.
export async function processMessage(intakeId, userMessage) {
  const intake = store.getById(intakeId);
  if (!intake) throw new Error('Intake not found');
  if (intake.currentStep === 'complete' || intake.status === 'submitted') {
    throw new Error('Intake already completed');
  }

  const currentStepId = intake.currentStep;
  const step = STEPS[currentStepId];
  if (!step) throw new Error(`Unknown step: ${currentStepId}`);

  // Record user message
  intake.transcript.push({ role: 'user', content: userMessage, step: currentStepId });

  // Run urgency scan on every user message
  const msgUrgency = assessMessage(userMessage);

  // Extract structured data from this step
  const extracted = step.extract(userMessage, intake) || {};

  // Apply extracted data to intake record
  if (extracted.clientName) intake.clientName = extracted.clientName;
  if (extracted.contactPreference) intake.contactPreference = extracted.contactPreference;
  if (extracted.needCategory) intake.needCategory = extracted.needCategory;
  if (extracted.situationSummary) {
    intake.structuredAnswers = { ...intake.structuredAnswers, situationSummary: extracted.situationSummary };
  }

  // Update urgency: take the highest seen so far
  const urgencyRank = { low: 0, medium: 1, high: 2 };
  const currentRank = urgencyRank[intake.urgencyFlag] || 0;

  if (extracted._urgencyFromAnswer) {
    const answerRank = urgencyRank[extracted._urgencyFromAnswer.urgencyFlag] || 0;
    if (answerRank > currentRank) {
      intake.urgencyFlag = extracted._urgencyFromAnswer.urgencyFlag;
      intake.crisisFlag = extracted._urgencyFromAnswer.crisisFlag || intake.crisisFlag || false;
    }
  }

  // Also apply scan from any message in the conversation
  if (urgencyRank[msgUrgency.urgencyFlag] > urgencyRank[intake.urgencyFlag || 'low']) {
    intake.urgencyFlag = msgUrgency.urgencyFlag;
  }
  if (msgUrgency.crisisFlag) intake.crisisFlag = true;

  // Determine next step
  const nextStepId = step.next(intake, extracted);
  intake.currentStep = nextStepId || 'complete';

  // Generate assistant response for the next step
  const nextStep = STEPS[intake.currentStep];
  const stepInstruction = nextStep.prompt(intake);

  const systemPrompt = INTAKE_SYSTEM_PROMPT + '\n\nYour current task:\n' + stepInstruction;
  const assistantMessage = await chatReply(systemPrompt, intake.transcript);

  intake.transcript.push({ role: 'assistant', content: assistantMessage, step: intake.currentStep });

  const isComplete = intake.currentStep === 'complete';

  if (isComplete) {
    intake.status = 'submitted';

    runAnalyzer(intake.id).catch((err) =>
      console.error('Analyzer failed for', intake.id, err.message)
    );
  }

  // Persist
  store.update(intake.id, {
    transcript: intake.transcript,
    currentStep: intake.currentStep,
    status: intake.status,
    clientName: intake.clientName,
    contactPreference: intake.contactPreference,
    needCategory: intake.needCategory,
    urgencyFlag: intake.urgencyFlag || 'low',
    crisisFlag: intake.crisisFlag || false,
    structuredAnswers: intake.structuredAnswers,
  });

  return {
    id: intake.id,
    message: assistantMessage,
    step: intake.currentStep,
    isComplete,
    stepIndex: STEP_ORDER.indexOf(intake.currentStep),
    totalSteps: STEP_ORDER.length,
    // Send structured data back so the frontend can display it
    ...(isComplete ? { intake: store.getById(intake.id) } : {}),
  };
}

export async function runAnalyzer(intakeId) {
  const intake = store.getById(intakeId);
  if (!intake) return;

  console.log(`Running analyzer for intake ${intakeId}...`);
  const start = Date.now();

  try {
    const qaPairs = buildQAPairs(intake);
    const ruleSignals = assessTranscript(intake.transcript);
    const analysis = await analyzeIntake(qaPairs, ruleSignals);
    const { score: helpScore } = computeHelpScore(analysis);

    const severityToUrgency = { crisis: 'high', high: 'high', medium: 'medium', low: 'low' };
    const urgencyFlag = severityToUrgency[analysis.severity.level] || 'low';
    const crisisFlag = analysis.severity.level === 'crisis' || ruleSignals.crisisFlag;

    const patch = {
      qaPairs,
      analysis,
      helpScore,
      summary: analysis.summary.staff_facing,
      urgencyFlag,
      crisisFlag,
    };

    if (!intake.needCategory || intake.needCategory === 'Other') {
      patch.needCategory = analysis.classification.primary_category;
    }

    store.update(intakeId, patch);
    console.log(`Analyzer saved for ${intakeId} in ${((Date.now() - start) / 1000).toFixed(1)}s (helpScore=${helpScore}, severity=${analysis.severity.level})`);
  } catch (err) {
    console.error(`Analyzer failed for ${intakeId}:`, err.message);
    store.update(intakeId, {
      qaPairs: buildQAPairs(intake),
      summary: 'AI analysis unavailable. Please review the transcript and case information directly.',
    });
  }
}

export { STEP_ORDER, NEED_CATEGORIES };
