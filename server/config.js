import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader (no dependency). Existing environment variables win.
const envFile = path.join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const env = process.env;

/** Parse "chw:token1,clinician:token2" into a Map token -> role. */
function parseTokens(s) {
  const map = new Map();
  for (const pair of (s || '').split(',').map((x) => x.trim()).filter(Boolean)) {
    const [role, token] = pair.split(':');
    if (role && token) map.set(token, role);
  }
  return map;
}

export const config = {
  port: Number(env.PORT || 3000),
  openaiApiKey: env.OPENAI_API_KEY || '',
  openaiBaseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  models: {
    triage: env.OPENAI_MODEL || 'gpt-5-mini',
    vision: env.OPENAI_VISION_MODEL || env.OPENAI_MODEL || 'gpt-5-mini',
    transcribe: env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe',
    tts: env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    ttsVoice: env.OPENAI_TTS_VOICE || 'coral',
  },
  // Forces mock AI responses even when a key is present (demos, tests).
  mockAi: env.MOCK_AI === '1' || !env.OPENAI_API_KEY,
  dbPath: env.DB_PATH || path.join(ROOT, 'data', 'health-ai.db'),
  tokens: parseTokens(env.ACCESS_TOKENS),
  emergencyNumber: env.EMERGENCY_NUMBER || '112',
  rateLimitPerMinute: Number(env.RATE_LIMIT_PER_MINUTE || 30),
  aiTimeoutMs: Number(env.AI_TIMEOUT_MS || 45000),
};

export const authEnabled = () => config.tokens.size > 0;

// Free-text description of the deployment setting, given to the AI so it weighs locally
// common conditions (e.g. "rural western Kenya, malaria-endemic, high HIV prevalence").
config.regionContext = env.REGION_CONTEXT || '';
