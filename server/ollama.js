// Ollama integration. Single config point for model and endpoint.
// ── Model warm-up and summary generation are the two key reliability points ──

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:30b';

// ── Thinking-tag cleanup ──
// qwen3 models emit <think>...</think> blocks by default. Strip them from all
// responses so the frontend only sees the final answer.
function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// Send a chat completion request to Ollama. Returns the assistant's text.
async function ollamaChat(messages, { model = DEFAULT_MODEL, temperature = 0.7, timeout = 90_000 } = {}) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature },
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama ${res.status}: ${body}`);
  }

  const data = await res.json();
  const raw = data.message?.content?.trim() || '';
  return stripThinking(raw);
}

// Generate a conversational assistant reply given a message history.
// Appends /no_think to the system prompt to disable qwen3 thinking mode for
// faster, cleaner responses during the intake conversation.
export async function chatReply(systemPrompt, messages) {
  const fullMessages = [
    { role: 'system', content: systemPrompt + '\n\n/no_think' },
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
// Uses a longer timeout because the model may be finishing the completion
// message response when this fires.
export async function generateSummary(summaryPrompt) {
  const messages = [
    { role: 'user', content: summaryPrompt + '\n\n/no_think' },
  ];

  try {
    const summary = await ollamaChat(messages, { temperature: 0.3, timeout: 120_000 });
    if (!summary || summary.length < 10) {
      console.warn('Ollama returned an empty or too-short summary, using fallback.');
      return 'Summary could not be generated — the model returned an empty response. Please review the transcript directly.';
    }
    return summary;
  } catch (err) {
    console.error('Ollama generateSummary error:', err.message);
    return 'Summary could not be generated — Ollama was unavailable. Please review the transcript directly.';
  }
}

// ── Model warm-up ──
// Sends a tiny request on server boot so the model is loaded into VRAM before
// the first real user interaction. Without this, the first intake start takes
// ~15 seconds while the model loads.
export async function warmUpModel() {
  console.log(`Warming up Ollama model "${DEFAULT_MODEL}"...`);
  const start = Date.now();
  try {
    await ollamaChat(
      [{ role: 'user', content: 'Hi /no_think' }],
      { timeout: 120_000 },
    );
    console.log(`Model warm-up complete in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.warn(`Model warm-up failed (${err.message}). First request will be slow.`);
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
