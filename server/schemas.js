// JSON schemas for OpenAI Structured Outputs (strict mode: every property required,
// no additional properties).

import { LEVELS } from '../shared/levels.js';

const str = { type: 'string' };
const strArr = { type: 'array', items: str };
const likelihood = { type: 'string', enum: ['low', 'medium', 'high'] };
const condition = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'likelihood', 'rationale'],
  properties: { name: str, likelihood, rationale: str },
};

export const TRIAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'triage_level', 'summary', 'likely_conditions', 'red_flags_detected', 'follow_up_questions',
    'needs_more_info', 'advice', 'when_to_seek_care', 'referral_note', 'confidence', 'spoken_response',
    'english_translation', 'detected_language',
  ],
  properties: {
    triage_level: { type: 'string', enum: LEVELS },
    summary: str,
    likely_conditions: { type: 'array', items: condition },
    red_flags_detected: strArr,
    follow_up_questions: strArr,
    needs_more_info: { type: 'boolean' },
    advice: strArr,
    when_to_seek_care: str,
    referral_note: str,
    confidence: likelihood,
    spoken_response: str,
    english_translation: str,
    detected_language: str,
  },
};

export const VISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'image_quality', 'retake_advice', 'findings', 'possible_conditions', 'rdt_result',
    'triage_level', 'recommendations', 'confidence', 'summary',
  ],
  properties: {
    image_quality: { type: 'string', enum: ['good', 'acceptable', 'poor', 'unusable'] },
    retake_advice: str,
    findings: strArr,
    possible_conditions: { type: 'array', items: condition },
    rdt_result: { type: 'string', enum: ['positive', 'negative', 'invalid', 'unreadable', 'not_applicable'] },
    triage_level: { type: 'string', enum: LEVELS },
    recommendations: strArr,
    confidence: likelihood,
    summary: str,
  },
};
