// Seeds 2 demo intakes when the store is empty. Only runs on startup.
// These give the dashboard something to show before a live demo intake is completed.

import * as store from './store.js';

export function seedIfEmpty() {
  if (store.getAll().length > 0) return;

  console.log('Seeding 2 demo intake records...');

  // Case 1: Non-urgent, food assistance
  store.create({
    status: 'submitted',
    clientName: 'Maria Garcia',
    contactPreference: 'phone',
    needCategory: 'Food',
    urgencyFlag: 'low',
    crisisFlag: false,
    structuredAnswers: {
      situationSummary: 'I am a single parent with two children. My hours at work got cut this month and I am having trouble keeping up with groceries. I heard there might be food pantry resources available in the area.',
    },
    transcript: [
      { role: 'assistant', content: 'Hi there! I\'m an AI intake assistant — not a human, but I\'m here to help collect some information so a case manager can follow up with you. Ready to get started?', step: 'greeting' },
      { role: 'user', content: 'Yes, I\'m ready.', step: 'ask_name' },
      { role: 'assistant', content: 'Great! What\'s your first name?', step: 'ask_name' },
      { role: 'user', content: 'Maria Garcia', step: 'ask_name' },
      { role: 'assistant', content: 'Thanks, Maria. How would you prefer to be contacted for follow-up — phone, email, text, or in person?', step: 'ask_contact' },
      { role: 'user', content: 'Phone is best for me', step: 'ask_contact' },
      { role: 'assistant', content: 'Got it. What area do you need help with? We can help with housing, food, healthcare, employment, legal help, utilities, or something else.', step: 'ask_category' },
      { role: 'user', content: 'Food assistance', step: 'ask_category' },
      { role: 'assistant', content: 'Is your need for food assistance urgent right now, or are you planning ahead?', step: 'ask_urgency' },
      { role: 'user', content: 'Not urgent right now, but I\'m worried about next month.', step: 'ask_urgency' },
      { role: 'assistant', content: 'Thanks for letting me know, Maria. Could you briefly describe your situation in your own words? This will help the case manager understand how best to help.', step: 'ask_situation' },
      { role: 'user', content: 'I am a single parent with two children. My hours at work got cut this month and I am having trouble keeping up with groceries. I heard there might be food pantry resources available in the area.', step: 'ask_situation' },
      { role: 'assistant', content: 'Here\'s what I have: Name: Maria Garcia, Contact: phone, Need: Food, Situation: reduced work hours, difficulty with groceries, interested in food pantry resources. Does this look right, or would you like to change anything?', step: 'confirm' },
      { role: 'user', content: 'Yes, that\'s correct.', step: 'confirm' },
      { role: 'assistant', content: 'Thank you, Maria. A case manager will review your information and reach out to you by phone. Take care!', step: 'complete' },
    ],
    summary: 'Maria Garcia is a single parent with two children who reported reduced work hours this month, making it difficult to cover grocery costs. She expressed interest in food pantry resources in her area. Her need is not immediately urgent but may become more pressing. Staff should review for possible food assistance programs and local pantry referrals.',
    staffNotes: '',
    currentStep: 'complete',
  });

  // Case 2: High-urgency housing crisis
  const crisisCreated = new Date(Date.now() - 45 * 60000).toISOString(); // 45 min ago
  store.create({
    createdAt: crisisCreated,
    status: 'submitted',
    clientName: 'James Thompson',
    contactPreference: 'text',
    needCategory: 'Housing',
    urgencyFlag: 'high',
    crisisFlag: false,
    structuredAnswers: {
      situationSummary: 'I got an eviction notice yesterday. I have until Friday to leave. I don\'t have family nearby and I don\'t know where to go. I have a 6-year-old daughter with me.',
    },
    transcript: [
      { role: 'assistant', content: 'Hi, I\'m an AI intake assistant here to collect some information for a case manager. I\'m not a human, but everything you share will be reviewed by one. Are you ready to start?', step: 'greeting' },
      { role: 'user', content: 'Yes please, I need help fast.', step: 'ask_name' },
      { role: 'assistant', content: 'Of course. What\'s your first name?', step: 'ask_name' },
      { role: 'user', content: 'James Thompson', step: 'ask_name' },
      { role: 'assistant', content: 'Thanks, James. How would you prefer to be contacted — phone, email, text, or in person?', step: 'ask_contact' },
      { role: 'user', content: 'Text me please', step: 'ask_contact' },
      { role: 'assistant', content: 'What area do you need help with? Housing, food, healthcare, employment, legal help, utilities, or something else?', step: 'ask_category' },
      { role: 'user', content: 'Housing, definitely housing', step: 'ask_category' },
      { role: 'assistant', content: 'Is your housing situation urgent right now, or are you planning ahead?', step: 'ask_urgency' },
      { role: 'user', content: 'It\'s urgent. I got an eviction notice and I have to be out by Friday.', step: 'ask_urgency' },
      { role: 'assistant', content: 'I understand this is a stressful time, James. Could you briefly describe your situation so the case manager knows how to help?', step: 'ask_situation' },
      { role: 'user', content: 'I got an eviction notice yesterday. I have until Friday to leave. I don\'t have family nearby and I don\'t know where to go. I have a 6-year-old daughter with me.', step: 'ask_situation' },
      { role: 'assistant', content: 'Here\'s what I have: Name: James Thompson, Contact: text, Need: Housing, Situation: eviction notice with Friday deadline, no family nearby, has a 6-year-old daughter. Does this look right?', step: 'confirm' },
      { role: 'user', content: 'Yes', step: 'confirm' },
      { role: 'assistant', content: 'Thank you, James. A case manager will review your information and reach out via text as soon as possible. If you feel unsafe at any point, please call 911.', step: 'complete' },
    ],
    summary: 'James Thompson reported receiving an eviction notice with a Friday deadline. He has a 6-year-old daughter and no family nearby for support. He does not currently know where they will go. This should be reviewed urgently for emergency shelter options, tenant rights resources, and family housing assistance. Contact by text is preferred.',
    staffNotes: '',
    currentStep: 'complete',
  });

  console.log('Seeded 2 demo intakes (Maria Garcia - Food/Low, James Thompson - Housing/High)');
}
