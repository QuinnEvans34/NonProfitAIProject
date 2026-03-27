import express from 'express';
import cors from 'cors';
import intakeRoutes from './routes/intake.js';
import chatRoutes from './routes/chat.js';

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
