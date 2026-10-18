// Thin OpenAI API client (no SDK dependency): structured JSON chat, vision,
// speech-to-text and text-to-speech.

import { config } from './config.js';

export class AiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function call(pathname, init) {
  if (!config.openaiApiKey) throw new AiError('OPENAI_API_KEY is not configured', 503);
  let res;
  try {
    res = await fetch(`${config.openaiBaseUrl}${pathname}`, {
      ...init,
      headers: { Authorization: `Bearer ${config.openaiApiKey}`, ...init.headers },
      signal: AbortSignal.timeout(config.aiTimeoutMs),
    });
  } catch (err) {
    throw new AiError(`OpenAI request failed: ${err.name === 'TimeoutError' ? 'timeout' : err.message}`);
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message ?? '';
    } catch {
      /* ignore */
    }
    throw new AiError(`OpenAI ${pathname} returned ${res.status}${detail ? `: ${detail}` : ''}`, res.status === 429 ? 429 : 502);
  }
  return res;
}

/**
 * Chat completion constrained to a JSON schema (Structured Outputs).
 * @param {{model: string, system: string, messages: Array, schema: object, schemaName: string}} opts
 */
export async function chatJson({ model, system, messages, schema, schemaName }) {
  const body = {
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
  };
  if (process.env.OPENAI_REASONING_EFFORT) body.reasoning_effort = process.env.OPENAI_REASONING_EFFORT;
  const res = await call('/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const choice = data.choices?.[0];
  if (choice?.message?.refusal) throw new AiError(`Model refused: ${choice.message.refusal}`);
  const content = choice?.message?.content;
  if (!content) throw new AiError('Empty model response');
  try {
    return { result: JSON.parse(content), model: data.model ?? model, usage: data.usage };
  } catch {
    throw new AiError('Model returned invalid JSON');
  }
}

/** Speech-to-text. Returns plain text. */
export async function transcribe({ buffer, mimeType, filename, language }) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), filename || 'audio.webm');
  form.append('model', config.models.transcribe);
  if (language) form.append('language', language);
  // Vocabulary hint improves recognition of symptom terms.
  form.append('prompt', 'A person describing health symptoms to a triage assistant: fever, cough, diarrhoea, vomiting, malaria, pregnancy, breathing, pain, convulsions.');
  const res = await call('/audio/transcriptions', { method: 'POST', body: form });
  const data = await res.json();
  return (data.text ?? '').trim();
}

/** Text-to-speech. Returns an mp3 Buffer. */
export async function speak({ text, language }) {
  const body = {
    model: config.models.tts,
    voice: config.models.ttsVoice,
    input: text.slice(0, 4000),
    response_format: 'mp3',
  };
  if (config.models.tts.includes('gpt-4o')) {
    body.instructions = `Speak in ${language || 'the language of the text'} in a calm, warm, clear and reassuring tone, like a kind nurse. Speak slowly. Emphasise any instruction to seek care urgently.`;
  }
  const res = await call('/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return Buffer.from(await res.arrayBuffer());
}
