import { Router } from 'express';
import { chatReply, generateSummary, isAvailable } from '../ollama.js';
import { INTAKE_SYSTEM_PROMPT, buildSummaryPrompt } from '../prompts.js';

const router = Router();

// POST /api/chat/reply — get one assistant reply from Ollama
// Body: { messages: [{ role, content }] }
// The caller controls the conversation; this just wraps the model call.
router.post('/reply', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const reply = await chatReply(INTAKE_SYSTEM_PROMPT, messages);
  res.json({ reply });
});

// POST /api/chat/summary — generate a staff-facing intake summary
// Body: { transcript: [{ role, content }], structuredAnswers: { ... } }
router.post('/summary', async (req, res) => {
  const { transcript, structuredAnswers } = req.body;

  if (!Array.isArray(transcript) || transcript.length === 0) {
    return res.status(400).json({ error: 'transcript array is required' });
  }

  const prompt = buildSummaryPrompt(transcript, structuredAnswers);
  const summary = await generateSummary(prompt);
  res.json({ summary });
});

// GET /api/chat/status — check if Ollama is reachable
router.get('/status', async (_req, res) => {
  const available = await isAvailable();
  res.json({ available });
});

export default router;
