import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRedFlags } from '../shared/redflags.js';
import { assessVitals } from '../shared/vitals.js';
import { evaluateProtocol, suggestProtocol, PROTOCOLS } from '../shared/protocols.js';
import { offlineTriage } from '../shared/safety.js';
import { maxLevel } from '../shared/levels.js';

const level = (text, ctx) => checkRedFlags(text, ctx).level;

test('detects emergencies in English', () => {
  assert.equal(level('My father has crushing chest pain'), 'emergency');
  assert.equal(level("she can't breathe and her lips are blue"), 'emergency');
  assert.equal(level('the baby had a seizure this morning'), 'emergency');
  assert.equal(level('his face is drooping and he has slurred speech'), 'emergency');
  assert.equal(level('I want to kill myself'), 'emergency');
  assert.equal(level('child is unable to drink and vomits everything'), 'emergency');
  assert.equal(level('fever and a stiff neck'), 'emergency');
  assert.equal(level('bitten by a snake on the leg'), 'emergency');
});

test('detects emergencies in Spanish, French and Swahili', () => {
  assert.equal(level('Tengo dolor en el pecho muy fuerte'), 'emergency');
  assert.equal(level('mi hijo no puede respirar'), 'emergency');
  assert.equal(level("J'ai une douleur thoracique"), 'emergency');
  assert.equal(level('Mtoto ana degedege'), 'emergency');
  assert.equal(level('Ana maumivu ya kifua'), 'emergency');
});

test('respects simple negation', () => {
  assert.equal(level('I have a runny nose, no chest pain'), null);
  assert.equal(level('no fever, no seizure, just tired'), null);
  // negation does not leak across clauses
  assert.equal(level('no cough but chest pain since morning'), 'emergency');
});

test('safety-critical rules are not negatable', () => {
  assert.equal(level("I don't want to live anymore"), 'emergency');
  assert.equal(level('he is not breathing'), 'emergency');
});

test('context rules: pregnancy and young infants', () => {
  assert.equal(level('some bleeding today'), null);
  assert.equal(level('some bleeding today', { pregnant: true }), 'emergency');
  assert.equal(level('bad headache and blurred vision', { pregnant: true }), 'emergency');
  assert.equal(level('baby has a fever', { ageYears: 0.1 }), 'emergency');
  assert.equal(level('has a fever', { ageYears: 30 }), null);
});

test('urgent findings', () => {
  assert.equal(level('cough for three weeks with night sweats'), 'urgent');
  assert.equal(level('blood in stool'), 'urgent');
  assert.equal(level('high fever since yesterday'), 'urgent');
  assert.equal(level('food poisoning after lunch'), null);
});

test('vitals use age-specific WHO thresholds', () => {
  assert.equal(assessVitals({ respRate: 45 }, { ageYears: 3 }).level, 'urgent'); // fast breathing 1-5y
  assert.equal(assessVitals({ respRate: 45 }, { ageYears: 30 }).level, 'emergency');
  assert.equal(assessVitals({ respRate: 18 }, { ageYears: 30 }).level, null);
  assert.equal(assessVitals({ spo2: 88 }).level, 'emergency');
  assert.equal(assessVitals({ tempC: 38.2 }, { ageYears: 0.1 }).level, 'emergency');
  assert.equal(assessVitals({ systolic: 150, diastolic: 95 }, { pregnant: true }).level, 'urgent');
  assert.equal(assessVitals({ systolic: 165, diastolic: 100 }, { pregnant: true }).level, 'emergency');
  assert.equal(assessVitals({ muacMm: 110 }, { ageYears: 2 }).level, 'urgent');
  assert.equal(assessVitals({ glucoseMgDl: 45 }).level, 'emergency');
  assert.equal(assessVitals({ tempC: '' }).level, null);
});

test('protocols evaluate deterministically', () => {
  assert.equal(suggestProtocol({ ageYears: 0.05 }), 'newborn_0_2m');
  assert.equal(suggestProtocol({ ageYears: 2 }), 'child_2m_5y');
  assert.equal(suggestProtocol({ ageYears: 25, pregnant: true }), 'pregnancy');
  assert.equal(evaluateProtocol('child_2m_5y', { cant_drink: true }).level, 'emergency');
  assert.equal(evaluateProtocol('child_2m_5y', { fever: true, cant_drink: false }).level, 'routine');
  // partially answered with no positives: no conclusion yet
  assert.equal(evaluateProtocol('child_2m_5y', { fever: false }).level, null);
  const all = Object.fromEntries(PROTOCOLS[0].questions.map((q) => [q.id, false]));
  assert.equal(evaluateProtocol('child_2m_5y', all).level, 'self_care');
});

test('offline triage never concludes self-care from free text', () => {
  assert.equal(offlineTriage({ text: 'mild headache' }).level, 'routine');
  assert.equal(offlineTriage({ text: 'chest pain' }).level, 'emergency');
});

test('maxLevel picks the most severe', () => {
  assert.equal(maxLevel('routine', null, 'urgent', 'self_care'), 'urgent');
  assert.equal(maxLevel(null, undefined), null);
});
