// Triage orchestration: deterministic safety floor -> AI assessment -> conservative merge.

import { config } from './config.js';
import { chatJson, AiError } from './openai.js';
import { triageSystemPrompt, visionSystemPrompt } from './prompts.js';
import { TRIAGE_SCHEMA, VISION_SCHEMA } from './schemas.js';
import { redact } from './privacy.js';
import { safetyAssessment, offlineTriage } from '../shared/safety.js';
import { maxLevel, rank, isValidLevel, LEVEL_INFO } from '../shared/levels.js';
import { mockTriage, mockVision } from './mock.js';

export const DISCLAIMER =
  'Health AI gives guidance, not a diagnosis. It does not replace a health worker. In an emergency, call your local emergency number or go to the nearest health facility.';

const MAX_MESSAGES = 30;
const MAX_CHARS = 4000;

export function validateTriageInput(body) {
  const errors = [];
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (!messages.length) errors.push('messages must be a non-empty array');
  const clean = messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m?.role === 'assistant' ? 'assistant' : 'user',
    content: String(m?.content ?? '').slice(0, MAX_CHARS),
  }));
  if (!clean.some((m) => m.role === 'user' && m.content.trim())) errors.push('at least one user message is required');
  const p = body?.patient ?? {};
  const ageYears = p.ageYears === undefined || p.ageYears === null || p.ageYears === '' ? undefined : Number(p.ageYears);
  if (ageYears !== undefined && (!Number.isFinite(ageYears) || ageYears < 0 || ageYears > 130)) errors.push('patient.ageYears must be between 0 and 130');
  return {
    errors,
    input: {
      messages: clean,
      patient: { ageYears, sex: ['female', 'male', 'other'].includes(p.sex) ? p.sex : undefined, pregnant: Boolean(p.pregnant) },
      vitals: typeof body?.vitals === 'object' && body.vitals ? body.vitals : {},
      protocol: body?.protocol?.id ? { id: String(body.protocol.id), answers: body.protocol.answers ?? {} } : undefined,
      language: typeof body?.language === 'string' && /^([a-z]{2}|auto)$/.test(body.language) ? body.language : 'en',
      mode: body?.mode === 'chw' ? 'chw' : 'self',
    },
  };
}

function contextBlock({ patient, vitals, protocol }, safety) {
  const lines = ['CASE CONTEXT (from structured fields):'];
  lines.push(`- Age: ${patient.ageYears ?? 'unknown'} years; sex: ${patient.sex ?? 'unknown'}; pregnant: ${patient.pregnant ? 'yes' : 'no/unknown'}`);
  const v = Object.entries(vitals).filter(([, val]) => val !== '' && val !== null && val !== undefined);
  if (v.length) lines.push(`- Vitals: ${v.map(([k, val]) => `${k}=${val}`).join(', ')}`);
  if (protocol) {
    const yes = safety.protocol.positives.map((p) => p.text);
    lines.push(`- CHW protocol "${protocol.id}": positive answers: ${yes.length ? yes.join('; ') : 'none'}`);
  }
  lines.push(`SAFETY ENGINE FLOOR: ${safety.level ?? 'none'}`);
  for (const f of [...safety.redFlags, ...safety.vitals]) lines.push(`- [${f.level}] ${f.message}`);
  return lines.join('\n');
}

/** Build the deterministic part of the response used when AI is unavailable. */
function rulesOnlyResult(input, reason) {
  const off = offlineTriage({ text: userText(input), patient: input.patient, vitals: input.vitals, protocol: input.protocol });
  const msgs = [...off.redFlags, ...off.vitals].map((f) => f.message);
  return {
    triage_level: off.level,
    summary: msgs.length ? msgs.join(' ') : 'The AI assistant is unavailable, so a safety check was done using fixed rules only.',
    likely_conditions: [],
    red_flags_detected: msgs,
    follow_up_questions: [],
    needs_more_info: false,
    advice: [LEVEL_INFO[off.level].action.en],
    when_to_seek_care: 'Seek care immediately if breathing difficulty, chest pain, confusion, convulsions, heavy bleeding or inability to drink develop.',
    referral_note: `Rules-only triage (${reason}). Level: ${off.level}. Findings: ${msgs.join('; ') || 'none'}.`,
    confidence: 'low',
    spoken_response: `${LEVEL_INFO[off.level].action.en}`,
    english_translation: '',
    detected_language: input.language === 'auto' ? 'en' : input.language,
  };
}

const userText = (input) => input.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');

/**
 * Merge AI output with the deterministic safety floor. The final level is never lower than
 * the safety floor; low-confidence "self_care" is raised to "routine".
 */
export function mergeWithSafety(ai, safety) {
  let aiLevel = isValidLevel(ai.triage_level) ? ai.triage_level : 'routine';
  let level = maxLevel(aiLevel, safety.level) ?? 'routine';
  const reasons = [];
  if (rank(safety.level) > rank(aiLevel)) reasons.push(`Safety rules raised the level from "${aiLevel}" to "${safety.level}".`);
  if (level === 'self_care' && ai.confidence === 'low') {
    level = 'routine';
    reasons.push('Low AI confidence: raised from self-care to "see a health worker".');
  }
  return { level, overridden: reasons.length > 0, overrideReasons: reasons, aiLevel };
}

export async function runTriage(input) {
  let safety = safetyAssessment({ text: userText(input), patient: input.patient, vitals: input.vitals, protocol: input.protocol });
  let ai;
  let source = 'ai';
  let model = config.models.triage;
  let aiError = null;

  if (config.mockAi) {
    ai = mockTriage(input, safety);
    source = 'mock';
    model = 'mock';
  } else {
    try {
      const messages = [
        { role: 'user', content: contextBlock(input, safety) },
        ...input.messages.map((m) => ({ role: m.role, content: m.role === 'user' ? redact(m.content) : m.content })),
      ];
      const out = await chatJson({
        model: config.models.triage,
        system: triageSystemPrompt(input),
        messages,
        schema: TRIAGE_SCHEMA,
        schemaName: 'triage_assessment',
      });
      ai = out.result;
      model = out.model;
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      aiError = err.message;
      ai = rulesOnlyResult(input, 'AI unavailable');
      source = 'rules';
    }
  }

  // Second safety pass on the model's English translation, so the deterministic floor also
  // covers languages the red-flag rules do not know (Hausa, Amharic, Arabic, …).
  if (ai.english_translation && source === 'ai') {
    const translated = safetyAssessment({
      text: `${userText(input)}\n${ai.english_translation}`, patient: input.patient, vitals: input.vitals, protocol: input.protocol,
    });
    if (rank(translated.level) > rank(safety.level)) safety = { ...translated, viaTranslation: true };
  }

  const merged = mergeWithSafety(ai, safety);
  const info = LEVEL_INFO[merged.level];
  const replyLang = input.language === 'auto' ? ai.detected_language : input.language;
  const lang = info.action[replyLang] ? replyLang : 'en';
  // When safety rules escalate, make sure the spoken response leads with the action.
  let spoken = ai.spoken_response;
  if (merged.overridden && rank(merged.level) >= rank('urgent')) spoken = `${info.action[lang]} ${spoken}`;

  return {
    level: merged.level,
    levelLabel: info.label[lang],
    action: info.action[lang],
    overridden: merged.overridden,
    overrideReasons: merged.overrideReasons,
    aiLevel: merged.aiLevel,
    source,
    model,
    aiError,
    language: lang,
    assessment: { ...ai, spoken_response: spoken },
    safety,
    emergencyNumber: config.emergencyNumber,
    disclaimer: DISCLAIMER,
  };
}

const VISION_KINDS = ['rdt', 'skin', 'wound', 'eye', 'other'];

export async function runVision({ image, mimeType, kind, notes, language, patient }) {
  kind = VISION_KINDS.includes(kind) ? kind : 'other';
  const safety = safetyAssessment({ text: notes || '', patient: patient || {} });
  let ai;
  let source = 'ai';
  let model = config.models.vision;
  if (config.mockAi) {
    ai = mockVision(kind);
    source = 'mock';
    model = 'mock';
  } else {
    const dataUrl = `data:${mimeType};base64,${image.toString('base64')}`;
    const out = await chatJson({
      model: config.models.vision,
      system: visionSystemPrompt({ language, kind }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Image type: ${kind}. Health worker notes: ${redact(notes || 'none')}. Patient age: ${patient?.ageYears ?? 'unknown'}.` },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
      schema: VISION_SCHEMA,
      schemaName: 'image_assessment',
    });
    ai = out.result;
    model = out.model;
  }
  const merged = mergeWithSafety(ai, safety);
  // A poor image can never support reassurance.
  if (['poor', 'unusable'].includes(ai.image_quality) && rank(merged.level) < rank('routine')) {
    merged.level = 'routine';
    merged.overridden = true;
    merged.overrideReasons.push('Image quality too low to reassure.');
  }
  return {
    kind,
    level: merged.level,
    levelLabel: LEVEL_INFO[merged.level].label[language] ?? LEVEL_INFO[merged.level].label.en,
    overridden: merged.overridden,
    overrideReasons: merged.overrideReasons,
    source,
    model,
    assessment: ai,
    safety,
    requiresHumanConfirmation: true,
    disclaimer: `${DISCLAIMER} Image results are decision support only and must be confirmed by a trained health worker${kind === 'rdt' ? ' reading the test with their own eyes, following the manufacturer’s instructions' : ''}.`,
  };
}
