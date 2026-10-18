// Deterministic stand-in for the AI, used when no OPENAI_API_KEY is set (demo mode) and in
// tests. It is intentionally simple and clearly labelled as a demo in every response.

import { LEVEL_INFO } from '../shared/levels.js';

const DEMO = '[Demo mode — add OPENAI_API_KEY for full AI assessment] ';

export function mockTriage(input, safety) {
  const userTurns = input.messages.filter((m) => m.role === 'user');
  const text = userTurns.map((m) => m.content).join(' ').toLowerCase();
  const level = safety.level ?? 'routine';
  const findings = [...safety.redFlags, ...safety.vitals].map((f) => f.message);
  const needsMore = userTurns.length < 2 && !safety.level;
  const conditions = [];
  if (/fever|hot|fiebre|fievre|homa/.test(text)) conditions.push({ name: 'Possible infection (e.g. malaria, flu)', likelihood: 'medium', rationale: 'Fever was reported.' });
  if (/cough|tos|toux|kikohozi/.test(text)) conditions.push({ name: 'Possible respiratory infection', likelihood: 'medium', rationale: 'Cough was reported.' });
  if (/diarr|loose|kuhara/.test(text)) conditions.push({ name: 'Possible gastroenteritis', likelihood: 'medium', rationale: 'Diarrhoea was reported.' });
  return {
    triage_level: level,
    summary: DEMO + (findings.length ? findings.join(' ') : 'No danger signs were detected by the safety rules.'),
    likely_conditions: conditions,
    red_flags_detected: findings,
    follow_up_questions: needsMore ? ['How long have you had these symptoms?', 'How old is the person who is unwell?'] : [],
    needs_more_info: needsMore,
    advice: level === 'emergency' ? [LEVEL_INFO[level].action.en] : [LEVEL_INFO[level].action.en, 'Drink plenty of fluids and rest.'],
    when_to_seek_care: 'Seek care immediately if breathing becomes difficult, there is chest pain, confusion, convulsions, or the person cannot drink.',
    referral_note: `DEMO. Age ${input.patient.ageYears ?? '?'}y. Complaint: ${userTurns.map((m) => m.content).join(' / ').slice(0, 300)}. Level: ${level}.`,
    confidence: 'low',
    spoken_response: needsMore
      ? `${LEVEL_INFO[level].action.en} How long have you had these symptoms?`
      : LEVEL_INFO[level].action.en,
  };
}

export function mockVision(kind) {
  return {
    image_quality: 'acceptable',
    retake_advice: 'Use good daylight, hold the camera steady and fill the frame.',
    findings: [`${DEMO}Image received (${kind}). No AI analysis was performed.`],
    possible_conditions: [],
    rdt_result: kind === 'rdt' ? 'unreadable' : 'not_applicable',
    triage_level: 'routine',
    recommendations: ['Have a trained health worker assess the image or patient directly.'],
    confidence: 'low',
    summary: `${DEMO}Image analysis requires an OpenAI API key.`,
  };
}
