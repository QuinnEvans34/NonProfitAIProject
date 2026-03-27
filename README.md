# Nonprofit AI Intake & Triage Prototype

A local-only prototype of an AI-assisted intake and triage system for nonprofit social services. A client completes a guided intake conversation with an AI assistant, and staff review the results on a dashboard.

**This is a prototype for brainstorming and demo purposes, not a production system.**

## What it does

- **Client intake chat** — A guided conversation collects the client's name, contact preference, area of need, urgency, and situation description. The AI assistant generates natural language responses but the app controls the flow and step order.
- **Urgency detection** — Rule-based keyword matching flags high-urgency and crisis situations automatically.
- **Summary generation** — After intake completes, the local LLM generates a plain-language summary for staff review.
- **Staff dashboard** — Case managers can browse all intakes, see urgency flags, review transcripts and summaries, update case status, and add notes.
- **Seeded demo cases** — Two realistic example intakes are created on startup so the dashboard is not empty.

## Tech stack

| Layer | Tool |
|-------|------|
| Frontend | React 19, React Router 7, Vite 6 |
| Backend | Node.js, Express 4 |
| LLM | Ollama (local), qwen3:30b |
| Storage | In-memory (no database) |
| Dev runner | concurrently |

## Prerequisites

You need the following installed on your machine:

- **Node.js** v18 or later — [https://nodejs.org](https://nodejs.org)
- **Ollama** — [https://ollama.com](https://ollama.com)
- **~18 GB disk space** for the qwen3:30b model weights

Verify Node is installed:

```bash
node --version   # should print v18.x or later
npm --version    # should print 9.x or later
```

## Install Ollama and the model

### 1. Install Ollama

On macOS:

```bash
brew install ollama
```

Or download from [https://ollama.com/download](https://ollama.com/download).

### 2. Start the Ollama server

```bash
ollama serve
```

Leave this running in its own terminal tab. It listens on `http://localhost:11434`.

### 3. Pull the model

In a separate terminal:

```bash
ollama pull qwen3:30b
```

This downloads ~18 GB. It only needs to happen once.

### 4. Verify Ollama is running

```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response listing `qwen3:30b` in the models array.

## Install the project

```bash
git clone <repo-url>
cd NonProfitAIProject

# Install root dependencies (concurrently)
npm install

# Install server dependencies (express, cors)
npm install --prefix server

# Install client dependencies (react, vite, react-router-dom)
npm install --prefix client
```

## Run the project

Make sure Ollama is running first (see above), then:

```bash
npm run dev
```

This starts both servers concurrently:
- **Backend** on `http://localhost:3001`
- **Frontend** on `http://localhost:5173`

You should see output like:

```
[server] Seeding 2 demo intake records...
[server] Seeded 2 demo intakes (Maria Garcia - Food/Low, James Thompson - Housing/High)
[server] Server running on http://localhost:3001
[client]   VITE v6.x.x  ready in XXXms
[client]   ➜  Local:   http://localhost:5173/
```

## Verify everything works

1. **Backend health check:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return `{"ok":true}`

2. **Ollama connectivity:**
   ```bash
   curl http://localhost:3001/api/chat/status
   ```
   Should return `{"available":true}`

3. **Open the app:** [http://localhost:5173](http://localhost:5173)

## Pages and routes

| URL | Page | Description |
|-----|------|-------------|
| `/` | Intake Chat | Client-facing guided intake conversation |
| `/dashboard` | Staff Dashboard | List of all intakes with urgency/status badges and filtering |
| `/dashboard/:id` | Intake Detail | Full review: summary, structured data, transcript, status controls, staff notes |

## How the app works

### Intake flow

The intake follows a fixed sequence of steps controlled by the app:

1. **Greeting** — AI discloses it's not human, mentions case manager review
2. **Name** — Asks for first name
3. **Contact** — Asks preferred contact method (phone/email/text/in-person)
4. **Category** — Asks area of need (housing, food, healthcare, employment, legal, utilities, other)
5. **Urgency** — Asks if the situation is urgent or planned
6. **Situation** — Asks for a brief description in the client's own words
7. **Confirm** — Reads back collected info, asks client to confirm
8. **Complete** — Thanks client, submits for review

The app extracts structured data from each response using regex heuristics. The model only generates the conversational wording.

### Urgency detection

Urgency is detected by rule-based pattern matching on every user message, not by the model. Three levels:

- **High** — mentions of homelessness tonight, eviction today, fleeing, no food, danger, medical emergency
- **Medium** — behind on rent, lost job, can't afford bills, struggling, no insurance
- **Low** — nothing matched

A `crisisFlag` is set if messages match patterns for abuse, self-harm, or overdose.

### Summary generation

After intake completes, the backend sends the transcript and structured answers to Ollama to generate a plain-language staff summary. This runs asynchronously — it may take 10-15 seconds depending on hardware.

## Backend API overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/chat/status` | Check if Ollama is reachable |
| `POST` | `/api/intakes/start` | Begin a new guided intake |
| `POST` | `/api/intakes/:id/message` | Send a user message, get next assistant reply |
| `POST` | `/api/intakes` | Create an intake record directly (testing) |
| `GET` | `/api/intakes` | List all intakes |
| `GET` | `/api/intakes/:id` | Get a single intake with full transcript |
| `PATCH` | `/api/intakes/:id` | Update status, staff notes, etc. |
| `POST` | `/api/chat/reply` | Raw Ollama chat (for testing) |
| `POST` | `/api/chat/summary` | Raw summary generation (for testing) |

## Important limitations

- **In-memory storage only.** All data is lost when the server restarts. There is no database.
- **No authentication.** Anyone with the URL can access both the intake and the dashboard.
- **No encryption or compliance.** This prototype has no HIPAA, SOC 2, or data protection controls.
- **No CRM or export.** Data only exists in the running server's memory.
- **No production deployment.** This is designed to run locally only.
- **Model response quality varies.** qwen3:30b generally follows instructions well but may occasionally produce longer or off-tone responses.
- **Model speed depends on hardware.** Each response may take 5-20 seconds depending on your GPU/CPU.
- **Urgency detection is regex-based.** It works for obvious keywords but is not validated against real case data.

## Demo tips for Monday

1. Start with the **dashboard** (`/dashboard`) to show the two seeded cases.
2. Click into **James Thompson** (high urgency) to show the detail view, summary, and transcript.
3. Change his status to **In Review** and add a staff note. Save it.
4. Go back to the dashboard to show the updated status.
5. Click **New Intake** and walk through a live intake conversation (~2-3 minutes).
6. After completion, click **View Dashboard** to show the new intake alongside the seeded ones.
7. Key talking points:
   - The AI always discloses it's AI
   - The app controls the flow — the model just writes the words
   - Urgency flags are set by the app, not by the model
   - A case manager always reviews the intake
   - This is a prototype to test the interaction model

## Switching to a smaller/faster model

If qwen3:30b is too slow on your hardware, you can switch models in one place:

```bash
# Pull a smaller model
ollama pull qwen3:8b

# Set the env var before starting the server
OLLAMA_MODEL=qwen3:8b npm run dev
```

Or edit the default directly in `server/ollama.js` (line 4).

## Troubleshooting

### "Could not connect to the server" when starting an intake

The backend or Ollama is not running.

```bash
# Check the backend
curl http://localhost:3001/api/health

# Check Ollama
curl http://localhost:11434/api/tags
```

If Ollama is not running, start it with `ollama serve` in a separate terminal.

### Responses are very slow (30+ seconds)

The qwen3:30b model is large. Options:
- Switch to `qwen3:8b` (see above)
- Ensure no other heavy processes are using your GPU
- On CPU-only machines, expect 20-60 second responses with the 30b model

### Dashboard is empty

The server seeds 2 demo intakes on startup, but only when the store is empty. If you restarted the server, the seeds should reappear. If they don't, check the server logs for errors.

### "Intake already completed" error

You tried to send a message to a finished intake. Click **Start New Intake** or navigate to `/` to begin a fresh one.

### Port already in use

Another process is using port 3001 or 5173.

```bash
# Find what's using the port
lsof -i :3001
lsof -i :5173

# Kill it
kill -9 <PID>
```

### Summary says "still being generated"

Summary generation is async and depends on Ollama speed. Wait 10-15 seconds and click the **Refresh** button on the detail page, or reload the page.

## Project structure

```
NonProfitAIProject/
├── package.json              # Root: runs both servers via concurrently
├── server/
│   ├── index.js              # Express entry point
│   ├── store.js              # In-memory data store
│   ├── ollama.js             # Ollama HTTP client (model config here)
│   ├── prompts.js            # All prompt templates
│   ├── intake-flow.js        # App-controlled intake step machine
│   ├── urgency.js            # Rule-based urgency/crisis detection
│   ├── seed.js               # Demo data seeder
│   └── routes/
│       ├── intake.js         # Intake CRUD + flow endpoints
│       └── chat.js           # Direct Ollama chat/summary endpoints
├── client/
│   ├── vite.config.js        # Vite config with API proxy
│   ├── index.html
│   └── src/
│       ├── App.jsx           # Routes and nav
│       ├── pages/
│       │   ├── IntakeChat.jsx
│       │   ├── Dashboard.jsx
│       │   └── IntakeDetail.jsx
│       └── components/
│           ├── ChatMessage.jsx
│           └── StatusBadge.jsx
```
