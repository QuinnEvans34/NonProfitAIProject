// App-controlled intake flow state machine.
// The model generates conversational text; the app decides step transitions and data capture.

import { chatReply, generateSummary } from './ollama.js';
import { INTAKE_SYSTEM_PROMPT, buildSummaryPrompt } from './prompts.js';
import { assessMessage, assessTranscript } from './urgency.js';
import * as store from './store.js';

// ── Step definitions ──
// Each step: { id, prompt (instruction for model), extract (pull data from user reply), next (decide next step) }

const NEED_CATEGORIES = ['Housing', 'Food', 'Healthcare', 'Employment', 'Legal', 'Utilities', 'Other'];

const STEPS = {
  greeting: {
    prompt: () =>
      'Introduce yourself as an AI intake assistant for a community services organization. ' +
      'Say clearly that you are an AI, not a human. Say that a human case manager will review ' +
      'everything shared here. Ask if they are ready to get started. Keep it to 2-3 sentences.',
    extract: () => ({}), // nothing to capture
    next: () => 'ask_name',
  },

  ask_name: {
    prompt: () => 'Ask the client for their first name (last name optional). Keep it brief.',
    extract: (text) => {
      // Take the first 1-3 words that look like a name (capitalized or not)
      const cleaned = text.replace(/^(my name is|i['']?m|call me|it['']?s)\s*/i, '').trim();
      const name = cleaned.split(/[\s,]+/).slice(0, 3).join(' ');
      return name.length > 0 ? { clientName: name } : null;
    },
    next: () => 'ask_contact',
  },

  ask_contact: {
    prompt: (intake) =>
      `Thank ${intake.clientName || 'them'} and ask how they would prefer to be contacted ` +
      'for follow-up — phone, email, text, or in person. One short sentence.',
    extract: (text) => {
      const lower = text.toLowerCase();
      if (/phone|call/i.test(lower)) return { contactPreference: 'phone' };
      if (/email/i.test(lower)) return { contactPreference: 'email' };
      if (/text|sms/i.test(lower)) return { contactPreference: 'text' };
      if (/in\s*person|walk.?in|office/i.test(lower)) return { contactPreference: 'in-person' };
      // Accept whatever they said
      return { contactPreference: text.trim().slice(0, 50) };
    },
    next: () => 'ask_category',
  },

  ask_category: {
    prompt: () =>
      'Ask what general area they need help with. Offer these options naturally in a sentence: ' +
      'housing, food, healthcare, employment, legal help, utilities, or something else. ' +
      'Ask them to pick the one that fits best.',
    extract: (text) => {
      const lower = text.toLowerCase();
      for (const cat of NEED_CATEGORIES) {
        if (lower.includes(cat.toLowerCase())) return { needCategory: cat };
      }
      // Check common synonyms
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
      `Ask whether their ${intake.needCategory?.toLowerCase() || ''} situation is happening right now or ` +
      'is urgent, or whether they are planning ahead. Keep it to one clear question.',
    extract: (text) => {
      // Rule-based urgency from this specific answer
      const assessment = assessMessage(text);
      return { _urgencyFromAnswer: assessment };
    },
    next: () => 'ask_situation',
  },

  ask_situation: {
    prompt: (intake) =>
      `Ask ${intake.clientName || 'them'} to describe their situation in a few sentences — ` +
      'whatever they are comfortable sharing. Say this helps the case manager understand how to help.',
    extract: (text) => {
      return text.trim().length > 0 ? { situationSummary: text.trim() } : null;
    },
    next: () => 'confirm',
  },

  confirm: {
    prompt: (intake) => {
      const lines = [
        `Read back what you have collected and ask ${intake.clientName || 'them'} to confirm it looks right, or to correct anything:`,
        `- Name: ${intake.clientName || '(not provided)'}`,
        `- Contact preference: ${intake.contactPreference || '(not provided)'}`,
        `- Area of need: ${intake.needCategory || '(not provided)'}`,
        `- Urgency: ${intake.urgencyFlag || 'not yet assessed'}`,
        `- Situation: ${intake.structuredAnswers?.situationSummary || '(not provided)'}`,
        'Ask them to say "yes" if correct or tell you what to change. Keep it concise.',
      ];
      return lines.join('\n');
    },
    extract: (text) => {
      const lower = text.toLowerCase();
      const confirmed = /^(yes|yeah|yep|correct|looks?\s*(good|right|correct)|that['']?s\s*(right|correct)|confirm)/i.test(lower);
      return { _confirmed: confirmed };
    },
    next: (intake, extracted) => {
      if (extracted._confirmed) return 'complete';
      // If not confirmed, cycle back to ask_name to let them re-do
      // In practice for the demo, most people will just say yes
      return 'ask_name';
    },
  },

  complete: {
    prompt: (intake) =>
      `Thank ${intake.clientName || 'them'} for sharing this information. Let them know that a human ` +
      'case manager will review their intake and follow up using their preferred contact method. ' +
      'Remind them that if they are in immediate danger, they should call 911. Keep it warm and brief.',
    extract: () => ({}),
    next: () => null, // terminal
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

    // Generate summary asynchronously — don't block the response
    generateIntakeSummary(intake.id).catch((err) =>
      console.error('Summary generation failed for', intake.id, err.message)
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

// Generate and save the intake summary.
async function generateIntakeSummary(intakeId) {
  const intake = store.getById(intakeId);
  if (!intake) return;

  const prompt = buildSummaryPrompt(intake.transcript, {
    ...intake.structuredAnswers,
    clientName: intake.clientName,
    contactPreference: intake.contactPreference,
    needCategory: intake.needCategory,
    urgencyFlag: intake.urgencyFlag,
    crisisFlag: intake.crisisFlag ? 'Yes' : 'No',
  });

  const summary = await generateSummary(prompt);
  store.update(intakeId, { summary });
}

export { STEP_ORDER, NEED_CATEGORIES };
