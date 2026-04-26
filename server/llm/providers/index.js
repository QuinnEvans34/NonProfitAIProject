// Provider selection. Reads LLM_PROVIDER env var; defaults to ollama.

import * as ollama from './ollama.js';
import * as azure from './azure.js';
import * as mock from './mock.js';

const PROVIDERS = { ollama, azure, mock };

export function getProvider() {
  const name = process.env.LLM_PROVIDER || 'ollama';
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown LLM_PROVIDER: ${name}`);
  return { name, generateAnalysis: provider.generateAnalysis };
}
