// Deterministic safety assessment combining red flags, vitals and protocol answers.
// Used on its own when offline, and as a floor under the AI result when online.

import { checkRedFlags } from './redflags.js';
import { assessVitals } from './vitals.js';
import { evaluateProtocol } from './protocols.js';
import { maxLevel } from './levels.js';

/**
 * @param {object} input
 * @param {string} [input.text]          all free text from the patient / CHW
 * @param {object} [input.patient]       {ageYears, sex, pregnant}
 * @param {object} [input.vitals]
 * @param {{id: string, answers: object}} [input.protocol]
 */
export function safetyAssessment({ text = '', patient = {}, vitals = {}, protocol } = {}) {
  const context = {
    ageYears: typeof patient.ageYears === 'number' ? patient.ageYears : patient.ageYears ? Number(patient.ageYears) : undefined,
    sex: patient.sex,
    pregnant: Boolean(patient.pregnant),
  };
  const flags = checkRedFlags(text, context);
  const vit = assessVitals(vitals, context);
  const proto = protocol?.id ? evaluateProtocol(protocol.id, protocol.answers) : { level: null, positives: [] };
  return {
    level: maxLevel(flags.level, vit.level, proto.level),
    redFlags: flags.hits,
    vitals: vit.findings,
    protocol: proto,
  };
}

/** Conservative result for when no AI is available (offline or AI failure). */
export function offlineTriage(input) {
  const s = safetyAssessment(input);
  // Without AI we never conclude self-care from free text alone: default to "see a health worker".
  const level = s.level && s.level !== 'self_care' ? s.level : s.protocol.level === 'self_care' ? 'self_care' : 'routine';
  return { ...s, level, source: 'rules' };
}
