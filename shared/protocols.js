// Guided assessment protocols for community health workers (CHWs).
// Modelled on WHO IMCI / integrated community case management (iCCM) and WHO maternal &
// newborn danger signs. Deterministic: answers map directly to triage levels.
// CLINICAL CONTENT NOTICE: align with your national CHW guidelines before deployment.

import { maxLevel } from './levels.js';

const q = (id, level, en, es, fr, sw) => ({ id, level, text: { en, es, fr, sw } });

export const PROTOCOLS = [
  {
    id: 'child_2m_5y',
    title: { en: 'Sick child (2 months – 5 years)', es: 'Niño enfermo (2 meses – 5 años)', fr: 'Enfant malade (2 mois – 5 ans)', sw: 'Mtoto mgonjwa (miezi 2 – miaka 5)' },
    ageRange: [2 / 12, 5],
    vitals: ['tempC', 'respRate', 'muacMm', 'spo2'],
    questions: [
      q('cant_drink', 'emergency', 'Is the child unable to drink or breastfeed?', '¿El niño no puede beber o mamar?', 'L’enfant est-il incapable de boire ou de téter ?', 'Je, mtoto hawezi kunywa au kunyonya?'),
      q('vomits_everything', 'emergency', 'Does the child vomit everything?', '¿Vomita todo?', 'L’enfant vomit-il tout ?', 'Je, mtoto anatapika kila kitu?'),
      q('convulsions', 'emergency', 'Has the child had convulsions in this illness?', '¿Ha tenido convulsiones?', 'L’enfant a-t-il eu des convulsions ?', 'Je, mtoto amepata degedege?'),
      q('lethargic', 'emergency', 'Is the child very sleepy or unconscious?', '¿Está muy somnoliento o inconsciente?', 'L’enfant est-il léthargique ou inconscient ?', 'Je, mtoto amelegea sana au hajitambui?'),
      q('chest_indrawing', 'emergency', 'Is there chest indrawing (lower chest sucks in when breathing in)?', '¿Hay tiraje subcostal?', 'Y a-t-il un tirage sous-costal ?', 'Je, kifua kinavutika ndani anapovuta pumzi?'),
      q('swelling_both_feet', 'emergency', 'Is there swelling of both feet?', '¿Hinchazón en ambos pies?', 'Gonflement des deux pieds ?', 'Je, miguu yote miwili imevimba?'),
      q('blood_in_stool', 'urgent', 'Is there blood in the stool?', '¿Hay sangre en las heces?', 'Y a-t-il du sang dans les selles ?', 'Je, kuna damu kwenye choo?'),
      q('diarrhoea_14d', 'urgent', 'Has diarrhoea lasted 14 days or more?', '¿Diarrea por 14 días o más?', 'Diarrhée depuis 14 jours ou plus ?', 'Je, kuhara kumedumu siku 14 au zaidi?'),
      q('fever_7d', 'urgent', 'Has fever lasted 7 days or more?', '¿Fiebre por 7 días o más?', 'Fièvre depuis 7 jours ou plus ?', 'Je, homa imedumu siku 7 au zaidi?'),
      q('cough_14d', 'urgent', 'Has cough lasted 14 days or more?', '¿Tos por 14 días o más?', 'Toux depuis 14 jours ou plus ?', 'Je, kikohozi kimedumu siku 14 au zaidi?'),
      q('diarrhoea', 'routine', 'Does the child have diarrhoea (3+ loose stools/day)?', '¿Tiene diarrea?', 'L’enfant a-t-il la diarrhée ?', 'Je, mtoto anaharisha?'),
      q('fever', 'routine', 'Does the child have fever now or in the last 3 days?', '¿Tiene fiebre?', 'L’enfant a-t-il de la fièvre ?', 'Je, mtoto ana homa?'),
      q('cough', 'routine', 'Does the child have cough or difficult breathing?', '¿Tiene tos o dificultad para respirar?', 'L’enfant tousse-t-il ou respire-t-il difficilement ?', 'Je, mtoto anakohoa au anapumua kwa shida?'),
    ],
    guidance: {
      emergency: 'DANGER SIGN: refer to a health facility immediately. Give pre-referral treatment per your national iCCM protocol, keep the child warm and continue breastfeeding/fluids on the way.',
      urgent: 'Refer to a health facility today. Explain to the caregiver why referral is needed.',
      routine: 'Treat at community level per iCCM if trained (e.g. RDT for fever, ORS + zinc for diarrhoea, count breaths for cough). Follow up in 3 days or sooner if worse.',
      self_care: 'No danger signs found. Counsel the caregiver on home care and when to return.',
    },
  },
  {
    id: 'newborn_0_2m',
    title: { en: 'Newborn / young infant (0 – 2 months)', es: 'Recién nacido (0 – 2 meses)', fr: 'Nouveau-né (0 – 2 mois)', sw: 'Mtoto mchanga (miezi 0 – 2)' },
    ageRange: [0, 2 / 12],
    vitals: ['tempC', 'respRate'],
    questions: [
      q('not_feeding', 'emergency', 'Is the baby not feeding well or unable to feed?', '¿El bebé no se alimenta bien?', 'Le bébé ne s’alimente-t-il pas bien ?', 'Je, mtoto hanyonyi vizuri?'),
      q('convulsions', 'emergency', 'Has the baby had convulsions?', '¿Ha tenido convulsiones?', 'Le bébé a-t-il eu des convulsions ?', 'Je, mtoto amepata degedege?'),
      q('movement_only_stimulated', 'emergency', 'Does the baby move only when stimulated, or not at all?', '¿Se mueve solo al estimularlo o nada?', 'Le bébé ne bouge-t-il que stimulé ou pas du tout ?', 'Je, mtoto anajongea tu akichochewa au hajongei kabisa?'),
      q('severe_chest_indrawing', 'emergency', 'Is there severe chest indrawing?', '¿Tiraje subcostal grave?', 'Tirage sous-costal grave ?', 'Je, kifua kinavutika ndani sana?'),
      q('fever_or_cold', 'emergency', 'Does the baby feel hot (fever) or very cold?', '¿Se siente caliente o muy frío?', 'Le bébé est-il chaud ou très froid ?', 'Je, mtoto ana joto kali au baridi sana?'),
      q('yellow_palms', 'emergency', 'Are the palms or soles yellow?', '¿Palmas o plantas amarillas?', 'Paumes ou plantes jaunes ?', 'Je, viganja au nyayo ni za njano?'),
      q('umbilicus_red', 'urgent', 'Is the umbilical stump red, draining pus, or with redness spreading to skin?', '¿Ombligo rojo o con pus?', 'Ombilic rouge ou avec du pus ?', 'Je, kitovu ni chekundu au kina usaha?'),
      q('skin_pustules', 'routine', 'Are there skin pustules (small pus spots)?', '¿Pústulas en la piel?', 'Pustules sur la peau ?', 'Je, kuna vipele vya usaha?'),
    ],
    guidance: {
      emergency: 'DANGER SIGN in a young infant: possible serious bacterial infection. Refer IMMEDIATELY. Keep the baby warm (skin-to-skin), continue breastfeeding on the way.',
      urgent: 'Refer to a health facility today.',
      routine: 'Treat locally if trained and follow up in 2 days.',
      self_care: 'No danger signs. Counsel on breastfeeding, warmth, cord care and danger signs.',
    },
  },
  {
    id: 'pregnancy',
    title: { en: 'Pregnancy check', es: 'Control de embarazo', fr: 'Suivi de grossesse', sw: 'Ukaguzi wa ujauzito' },
    pregnant: true,
    vitals: ['systolic', 'diastolic', 'tempC', 'heartRate'],
    questions: [
      q('vaginal_bleeding', 'emergency', 'Any vaginal bleeding?', '¿Sangrado vaginal?', 'Saignement vaginal ?', 'Je, kuna damu ukeni?'),
      q('convulsions', 'emergency', 'Any convulsions or fits?', '¿Convulsiones?', 'Convulsions ?', 'Je, kuna degedege?'),
      q('severe_headache_vision', 'emergency', 'Severe headache or blurred vision?', '¿Dolor de cabeza fuerte o visión borrosa?', 'Maux de tête sévères ou vision floue ?', 'Kichwa kuuma sana au kuona ukungu?'),
      q('severe_abdominal_pain', 'emergency', 'Severe abdominal pain?', '¿Dolor abdominal intenso?', 'Douleur abdominale intense ?', 'Maumivu makali ya tumbo?'),
      q('reduced_movement', 'emergency', 'Baby moving less than usual or not at all (after 20 weeks)?', '¿El bebé se mueve menos o nada?', 'Le bébé bouge-t-il moins ou plus du tout ?', 'Mtoto anacheza kidogo au hachezi kabisa?'),
      q('waters_broken', 'emergency', 'Waters broken before labour?', '¿Rompió fuente antes del parto?', 'Perte des eaux avant le travail ?', 'Maji yamevunjika kabla ya uchungu?'),
      q('breathing_difficulty', 'emergency', 'Difficulty breathing?', '¿Dificultad para respirar?', 'Difficulté à respirer ?', 'Shida ya kupumua?'),
      q('fever', 'urgent', 'Fever?', '¿Fiebre?', 'Fièvre ?', 'Homa?'),
      q('swelling_face_hands', 'urgent', 'Swelling of face or hands?', '¿Hinchazón de cara o manos?', 'Gonflement du visage ou des mains ?', 'Uso au mikono kuvimba?'),
      q('painful_urination', 'routine', 'Pain or burning when passing urine?', '¿Dolor al orinar?', 'Brûlure en urinant ?', 'Maumivu wakati wa kukojoa?'),
    ],
    guidance: {
      emergency: 'MATERNAL DANGER SIGN: arrange transport to a facility with emergency obstetric care NOW. Accompany if possible. Keep her lying on her left side if bleeding or convulsing.',
      urgent: 'Refer to antenatal clinic/facility today.',
      routine: 'Refer for routine antenatal assessment. Confirm next ANC visit date.',
      self_care: 'No danger signs. Counsel on danger signs, birth preparedness, nutrition and ANC attendance.',
    },
  },
  {
    id: 'adult_general',
    title: { en: 'Adult general assessment', es: 'Evaluación general de adulto', fr: 'Évaluation générale adulte', sw: 'Tathmini ya jumla ya mtu mzima' },
    ageRange: [12, 130],
    vitals: ['tempC', 'heartRate', 'respRate', 'spo2', 'systolic', 'diastolic', 'glucoseMgDl'],
    questions: [
      q('chest_pain', 'emergency', 'Chest pain or pressure?', '¿Dolor o presión en el pecho?', 'Douleur ou pression thoracique ?', 'Maumivu au kubanwa kifua?'),
      q('severe_breathing', 'emergency', 'Severe difficulty breathing?', '¿Dificultad grave para respirar?', 'Difficulté respiratoire sévère ?', 'Shida kubwa ya kupumua?'),
      q('stroke_signs', 'emergency', 'Face drooping, arm weakness or slurred speech?', '¿Cara caída, debilidad en brazo o habla arrastrada?', 'Visage affaissé, faiblesse du bras ou trouble de la parole ?', 'Uso kupinda, mkono kulegea au kuongea kwa shida?'),
      q('confused_unconscious', 'emergency', 'Confused, very drowsy or unconscious?', '¿Confundido, muy somnoliento o inconsciente?', 'Confus, très somnolent ou inconscient ?', 'Amechanganyikiwa, amelegea au hajitambui?'),
      q('severe_bleeding', 'emergency', 'Heavy bleeding that will not stop?', '¿Sangrado abundante que no para?', 'Saignement abondant qui ne s’arrête pas ?', 'Damu nyingi isiyokoma?'),
      q('self_harm', 'emergency', 'Thoughts of suicide or self-harm?', '¿Pensamientos de suicidio o autolesión?', 'Pensées suicidaires ou d’automutilation ?', 'Mawazo ya kujiua au kujidhuru?'),
      q('stiff_neck_fever', 'emergency', 'Fever with stiff neck?', '¿Fiebre con cuello rígido?', 'Fièvre avec nuque raide ?', 'Homa na shingo ngumu?'),
      q('cough_2w', 'urgent', 'Cough for 2 weeks or more, night sweats or weight loss?', '¿Tos por 2 semanas o más, sudores nocturnos o pérdida de peso?', 'Toux depuis 2 semaines, sueurs nocturnes ou perte de poids ?', 'Kikohozi wiki 2 au zaidi, jasho usiku au kupungua uzito?'),
      q('fever', 'routine', 'Fever?', '¿Fiebre?', 'Fièvre ?', 'Homa?'),
      q('diarrhoea_vomiting', 'routine', 'Diarrhoea or vomiting?', '¿Diarrea o vómitos?', 'Diarrhée ou vomissements ?', 'Kuhara au kutapika?'),
    ],
    guidance: {
      emergency: 'EMERGENCY: arrange immediate transport to a hospital. Do not leave the person alone. Call emergency services if available.',
      urgent: 'Refer to a health facility today (e.g. TB testing for chronic cough).',
      routine: 'Manage per community protocol (e.g. RDT for fever) and follow up.',
      self_care: 'No danger signs. Give home-care advice and return precautions.',
    },
  },
];

export function getProtocol(id) {
  return PROTOCOLS.find((p) => p.id === id) ?? null;
}

/** Suggest the best protocol for a patient. */
export function suggestProtocol({ ageYears, pregnant } = {}) {
  if (pregnant) return 'pregnancy';
  if (typeof ageYears !== 'number') return 'adult_general';
  if (ageYears < 2 / 12) return 'newborn_0_2m';
  if (ageYears < 5) return 'child_2m_5y';
  return 'adult_general';
}

/**
 * Evaluate protocol answers. `answers` maps question id -> true/false.
 * Children aged 5–12 have no dedicated protocol; adult_general is used as the closest fit.
 */
export function evaluateProtocol(protocolId, answers = {}) {
  const protocol = getProtocol(protocolId);
  if (!protocol) return { level: null, positives: [], guidance: null };
  const positives = protocol.questions
    .filter((qq) => answers[qq.id] === true)
    .map((qq) => ({ id: qq.id, level: qq.level, text: qq.text.en }));
  const answered = protocol.questions.filter((qq) => typeof answers[qq.id] === 'boolean').length;
  // "No danger signs" is only concluded once every question has been answered.
  const level = maxLevel(positives.map((p) => p.level)) ?? (answered === protocol.questions.length ? 'self_care' : null);
  return {
    level,
    positives,
    answered,
    total: protocol.questions.length,
    guidance: level ? protocol.guidance[level] : null,
  };
}
