/**
 * Tiny client for any OpenAI-compatible chat API (Groq by default - it has a free tier).
 *
 * Environment variables (set them in Render, NEVER in code):
 *   GROQ_API_KEY   (or LLM_API_KEY)  - the secret key
 *   LLM_MODEL      - optional, default "llama-3.1-8b-instant"
 *   LLM_BASE_URL   - optional, default "https://api.groq.com/openai/v1"
 *                    (Gemini: https://generativelanguage.googleapis.com/v1beta/openai)
 */
const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const TIMEOUT_MS = 20000;

function getConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || process.env.GROQ_API_KEY || '',
    baseUrl: (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
  };
}

class LlmError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function chatCompletion(messages, { maxTokens = 450, temperature = 0.3 } = {}) {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey) {
    throw new LlmError('The assistant is not configured yet (missing API key on the server).', 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new LlmError('The assistant is busy right now (free usage limit). Try again in a minute.', 429);
    }
    if (!response.ok) {
      throw new LlmError(`The assistant service returned an error (${response.status}).`, 502);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new LlmError('The assistant returned an empty answer.', 502);
    return reply;
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (err.name === 'AbortError') throw new LlmError('The assistant took too long to answer. Try again.', 504);
    throw new LlmError('Could not reach the assistant service.', 502);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { chatCompletion, LlmError, getConfig };
