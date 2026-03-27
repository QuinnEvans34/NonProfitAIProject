// Ollama integration. Single config point for model and endpoint.

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:30b';

// Send a chat completion request to Ollama. Returns the assistant's text.
// On any failure, returns the fallback string instead of throwing.
async function ollamaChat(messages, { model = DEFAULT_MODEL, temperature = 0.7 } = {}) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature },
    }),
    signal: AbortSignal.timeout(90_000), // 90s — large model can be slow
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.message?.content?.trim() || '';
}

// Generate a conversational assistant reply given a message history.
// `systemPrompt` sets the persona. `messages` is the conversation so far.
export async function chatReply(systemPrompt, messages) {
  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  try {
    return await ollamaChat(fullMessages);
  } catch (err) {
    console.error('Ollama chatReply error:', err.message);
    return 'I\'m sorry, I\'m having trouble connecting right now. Please try again in a moment.';
  }
}

// Generate a plain-text intake summary for staff review.
// `summaryPrompt` is the full prompt including transcript and structured data.
export async function generateSummary(summaryPrompt) {
  const messages = [{ role: 'user', content: summaryPrompt }];

  try {
    return await ollamaChat(messages, { temperature: 0.3 });
  } catch (err) {
    console.error('Ollama generateSummary error:', err.message);
    return 'Summary could not be generated — Ollama was unavailable. Please review the transcript directly.';
  }
}

// Quick connectivity check. Returns true if Ollama responds.
export async function isAvailable() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { DEFAULT_MODEL, OLLAMA_BASE_URL };
