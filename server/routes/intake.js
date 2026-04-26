import { Router } from 'express';
import * as store from '../store.js';
import { startIntake, processMessage, runAnalyzer } from '../intake-flow.js';

const router = Router();

// POST /api/intakes/start — begin a new guided intake conversation
router.post('/start', async (req, res) => {
  try {
    const result = await startIntake();
    res.status(201).json(result);
  } catch (err) {
    console.error('startIntake error:', err);
    res.status(500).json({ error: 'Failed to start intake' });
  }
});

// POST /api/intakes/:id/message — send a user message and get the next assistant reply
router.post('/:id/message', async (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content string is required' });
  }
  try {
    const result = await processMessage(req.params.id, content);
    res.json(result);
  } catch (err) {
    console.error('processMessage error:', err);
    if (err.message === 'Intake not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Intake already completed') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// POST /api/intakes — create a new intake record (raw, for testing)
router.post('/', (req, res) => {
  const intake = store.create(req.body);
  res.status(201).json(intake);
});

// GET /api/intakes — list all intakes (newest first)
router.get('/', (_req, res) => {
  res.json(store.getAll());
});

// GET /api/intakes/:id — get one intake
router.get('/:id', (req, res) => {
  const intake = store.getById(req.params.id);
  if (!intake) return res.status(404).json({ error: 'Intake not found' });
  res.json(intake);
});

// POST /api/intakes/:id/reanalyze — staff-triggered re-run of the analyzer
router.post('/:id/reanalyze', async (req, res) => {
  const intake = store.getById(req.params.id);
  if (!intake) return res.status(404).json({ error: 'Intake not found' });
  if (intake.currentStep !== 'complete') {
    return res.status(400).json({ error: 'Intake is not complete' });
  }
  try {
    await runAnalyzer(req.params.id);
    res.json(store.getById(req.params.id));
  } catch (err) {
    console.error('reanalyze error:', err);
    res.status(500).json({ error: 'Failed to re-analyze' });
  }
});

// PATCH /api/intakes/:id — update allowed fields
const PATCHABLE = ['status', 'summary', 'staffNotes', 'structuredAnswers', 'urgencyFlag',
  'crisisFlag', 'clientName', 'contactPreference', 'needCategory', 'transcript', 'currentStep'];

router.patch('/:id', (req, res) => {
  const intake = store.getById(req.params.id);
  if (!intake) return res.status(404).json({ error: 'Intake not found' });

  const patch = {};
  for (const key of PATCHABLE) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const updated = store.update(req.params.id, patch);
  res.json(updated);
});

export default router;
