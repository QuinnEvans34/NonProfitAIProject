import express from 'express';
import cors from 'cors';
import intakeRoutes from './routes/intake.js';
import chatRoutes from './routes/chat.js';
import { seedIfEmpty } from './seed.js';
import { warmUpModel } from './ollama.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/intakes', intakeRoutes);
app.use('/api/chat', chatRoutes);

// Seed demo data if store is empty (dev convenience)
seedIfEmpty();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Warm up the Ollama model in the background so the first intake
  // doesn't pay the cold-start cost (~15s for qwen3:30b).
  warmUpModel();
});
