// Deterministic red-flag detection. This runs BEFORE and INDEPENDENTLY of the AI model,
// on the server and offline in the browser. The AI can raise a triage level but can
// never lower one set here.
//
// CLINICAL CONTENT NOTICE: these rules are a starting point modelled on WHO IMCI general
// danger signs, WHO maternal danger signs and common emergency-medicine red flags. They
// MUST be reviewed and localised by qualified clinicians before any real-world use.

/** Lowercase, strip accents, normalise apostrophes and whitespace. */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Words that negate a finding when they appear shortly before it in the same clause.
const NEGATORS = new Set([
  'no', 'not', 'never', 'denies', 'denied', 'without', "don't", 'dont', "doesn't", 'doesnt',
  "didn't", 'didnt', 'none', 'nor', 'sin', 'nunca', 'tampoco', 'pas', 'sans', 'jamais',
  'aucun', 'aucune', 'hakuna', 'sina', 'bila', 'hana', 'hajawahi',
]);
const CLAUSE_BREAK = /[.;!?\n]|,|\b(but|however|pero|mais|lakini|though|although)\b/g;

function isNegated(text, index) {
  const before = text.slice(Math.max(0, index - 60), index);
  const parts = before.split(CLAUSE_BREAK).filter((p) => p !== undefined);
  const clause = parts[parts.length - 1] ?? '';
  const words = clause.trim().split(' ').filter(Boolean).slice(-4);
  return words.some((w) => NEGATORS.has(w));
}

const re = (s) => new RegExp(s, 'g');

/**
 * Each rule: id, level, message, any-of `patterns` (or `all`: list of pattern groups that
 * must all match), optional `when(context)` guard and `negatable` (default true).
 */
export const RED_FLAG_RULES = [
  // ---------- Emergencies ----------
  {
    id: 'chest_pain',
    level: 'emergency',
    message: 'Chest pain or pressure can be a heart attack.',
    patterns: [
      re("chest (pain|pressure|tightness|is tight|hurts|discomfort)"),
      re('pain (in|on) (my |his |her |the )?chest'),
      re('(dolor|opresion|presion) (de|en el|en) pecho'),
      re('me duele el pecho'),
      re('douleur (thoracique|a la poitrine|dans la poitrine)'),
      re('mal (a la|dans la) poitrine'),
      re('maumivu ya kifua'),
      re('kifua (kinauma|kinabana)'),
    ],
  },
  {
    id: 'cannot_breathe',
    level: 'emergency',
    message: 'Severe breathing difficulty is life-threatening.',
    negatable: false,
    patterns: [
      re("(can't|cant|cannot|can not|unable to|struggling to|not able to) breathe"),
      re('(stopped|not) breathing'),
      re('gasping'),
      re('(blue|grey|gray) (lips|face|tongue)'),
      re('(lips|face) (are |is |turning |look )?(blue|grey|gray)'),
      re('chest (indrawing|in-drawing|sucking in)'),
      re('no (puede|puedo) respirar'),
      re('(labios|cara) (morados|azules|morada|azul)'),
      re("(je n'arrive pas a|ne peut pas|ne peux pas|n'arrive pas a) respirer"),
      re('levres bleues'),
      re('(siwezi|hawezi|hashindwi|anashindwa|ninashindwa) kupumua'),
      re('midomo (ya )?bluu'),
    ],
  },
  {
    id: 'unconscious',
    level: 'emergency',
    message: 'Unconsciousness or being very hard to wake is an emergency.',
    negatable: false,
    patterns: [
      re('unconscious'),
      re('unresponsive'),
      re("(won't|wont|will not|doesn't|does not|cannot|can't) wake( up)?"),
      re('(hard|difficult) to wake'),
      re('(very )?(lethargic|floppy)'),
      re('inconsciente'),
      re('no (responde|despierta)'),
      re('inconscient'),
      re('ne (se )?reveille pas'),
      re('ne repond (pas|plus)'),
      re('(amezimia|hajitambui|kupoteza fahamu|hazinduki)'),
    ],
  },
  {
    id: 'seizure',
    level: 'emergency',
    message: 'Seizures (convulsions) need emergency care.',
    patterns: [
      re('seizure'),
      re('convuls'),
      re('\\b(fits|fitting|having a fit)\\b'),
      re('ataque epileptico'),
      re("crise d'epilepsie"),
      re('(degedege|kifafa|anatetemeka mwili mzima)'),
    ],
  },
  {
    id: 'stroke_signs',
    level: 'emergency',
    message: 'Possible stroke — every minute matters.',
    patterns: [
      re('(face|mouth) (is )?(droop|drooping|twisted|fallen)'),
      re('(drooping|droopy) (face|mouth)'),
      re('slurr(ed|ing) speech'),
      re('(sudden|suddenly) (weak|weakness|numb|numbness|confus|can.?t speak|cannot speak)'),
      re('(weak|weakness|numb|numbness|paraly[sz]ed) (on|in) one side'),
      re('one side of (my|his|her|the) (body|face)'),
      re('\\bstroke\\b'),
      re('(cara|boca) (caida|torcida)'),
      re('derrame cerebral'),
      re('(visage|bouche) (affaisse|tordu|de travers)'),
      re('\\bavc\\b'),
      re('(kiharusi|kupooza upande|uso umepinda)'),
    ],
  },
  {
    id: 'severe_bleeding',
    level: 'emergency',
    message: 'Heavy or uncontrolled bleeding is an emergency.',
    patterns: [
      re('(heavy|heavily|severe|a lot of|lots of|uncontrolled) bleed'),
      re('bleeding (heavily|a lot|badly)'),
      re("(won't|wont|will not|doesn't|does not) stop bleeding"),
      re("bleeding (that |which )?(won't|wont|will not|doesn't|does not) stop"),
      re('(vomit|vomiting|throwing up) blood'),
      re('blood in (my |his |her )?vomit'),
      re('(sangrado|sangra) (abundante|mucho)'),
      re('hemorragia'),
      re('vomit(o|a|ando) sangre'),
      re('saignement (abondant|important)'),
      re('hemorragie'),
      re('vomit (du )?sang'),
      re('(damu nyingi|kutapika damu|anatapika damu|anavuja damu)'),
    ],
  },
  {
    id: 'anaphylaxis',
    level: 'emergency',
    message: 'Swelling of the throat, tongue or lips may be a severe allergic reaction.',
    patterns: [
      re('swell(ing|ed|en)? (of |in )?(the |my |his |her )?(throat|tongue|lips)'),
      re('(throat|tongue|lips) (is |are )?(swelling|swollen|closing)'),
      re('anaphyla'),
      re('(garganta|lengua|labios) hinchad'),
      re('hinchazon de (la )?(garganta|lengua|labios)'),
      re('gonflement (de la |des )?(gorge|langue|levres)'),
      re('(koo|ulimi|midomo) (umevimba|imevimba|kuvimba)'),
      re('kuvimba (koo|ulimi|midomo)'),
    ],
  },
  {
    id: 'self_harm',
    level: 'emergency',
    message: 'Thoughts of suicide or self-harm — you deserve immediate support.',
    negatable: false,
    patterns: [
      re('suicid'),
      re('kill (myself|himself|herself)'),
      re('end (my|his|her) life'),
      re('(want|wants|going) to die'),
      re("(don't|dont|do not) want to (live|be alive)"),
      re('(hurt|harm|cut|cutting) (myself|himself|herself)'),
      re('self[- ]?harm'),
      re('(matarme|quitarme la vida|quiero morir)'),
      re('(me tuer|envie de mourir|en finir)'),
      re('(kujiua|nataka kufa|kujidhuru)'),
    ],
  },
  {
    id: 'poisoning',
    level: 'emergency',
    message: 'Poisoning, overdose or venomous bites need emergency care.',
    patterns: [
      re('overdose'),
      re('(?<!food )poison'),
      re('(swallowed|drank|ate) (some |a |the )?(bleach|pills|tablets|chemical|paraffin|kerosene|pesticide|battery)'),
      re('snake ?bite|bitten by a snake'),
      re('envenen'),
      re('sobredosis'),
      re('(mordedura|mordio) (de )?(una )?serpiente'),
      re('empoisonn'),
      re('surdose'),
      re('morsure de serpent'),
      re('\\bsumu\\b'),
      re("(ameng'atwa|kung'atwa|kuumwa) na nyoka"),
    ],
  },
  {
    id: 'thunderclap_headache',
    level: 'emergency',
    message: 'A sudden, worst-ever headache can signal bleeding in the brain.',
    patterns: [
      re('worst headache'),
      re('thunderclap'),
      re('(peor|mas fuerte) dolor de cabeza'),
      re('pire mal de tete'),
    ],
  },
  {
    id: 'meningitis_signs',
    level: 'emergency',
    message: 'Fever with a stiff neck can be meningitis.',
    all: [
      [re('stiff neck'), re('neck (is )?stiff'), re('cuello rigido'), re('rigidite de la nuque'), re('nuque raide'), re('shingo (ngumu|imekaza)')],
      [re('fever'), re('\\bhot\\b'), re('fiebre'), re('fievre'), re('homa'), re('joto')],
    ],
  },
  {
    id: 'child_danger_signs',
    level: 'emergency',
    message: 'WHO general danger sign in a child — refer urgently.',
    patterns: [
      re('(not able|unable|cannot|can.?t|refuses|refusing) to (drink|breastfeed|breast feed|feed|suck)'),
      re('(not|stopped) (drinking|breastfeeding|feeding|sucking)'),
      re('vomit(s|ing)? everything'),
      re('no (puede|quiere) (beber|tomar|mamar)'),
      re('vomita todo'),
      re('ne (peut|veut) (pas|plus) (boire|teter)'),
      re('vomit tout'),
      re('(hawezi|hataki) (kunywa|kunyonya)'),
      re('anatapika kila kitu'),
    ],
  },
  {
    id: 'head_injury_serious',
    level: 'emergency',
    message: 'Head injury with vomiting, confusion or loss of consciousness.',
    all: [
      [re('head (injury|trauma|wound)'), re('hit (my|his|her) head'), re('fell on (my|his|her) head'), re('golpe en la cabeza'), re('coup (a|sur) la tete'), re('jeraha (la|kichwani)')],
      [re('vomit'), re('confus'), re('passed out'), re('blacked out'), re('vomit'), re('perdio el conocimiento'), re('perdu connaissance'), re('kutapika'), re('kuchanganyikiwa')],
    ],
  },

  // ---------- Pregnancy-specific (WHO maternal danger signs) ----------
  {
    id: 'pregnancy_bleeding',
    level: 'emergency',
    message: 'Bleeding during pregnancy is a danger sign.',
    when: (c) => c.pregnant,
    patterns: [re('bleed'), re('sangr'), re('saign'), re('damu')],
  },
  {
    id: 'pregnancy_preeclampsia',
    level: 'emergency',
    message: 'Severe headache, blurred vision or swelling in pregnancy can be pre-eclampsia.',
    when: (c) => c.pregnant,
    patterns: [
      re('(severe|bad|strong|terrible) headache'),
      re('blur(red|ry)? vision'),
      re('(seeing|see) (spots|stars|flashing)'),
      re('swell(ing|en)? (of |in )?(the |my )?(face|hands)'),
      re('(dolor de cabeza (fuerte|intenso)|vision borrosa)'),
      re('(mal de tete (severe|intense)|vision (floue|trouble))'),
      re('(kichwa kinauma sana|kuona ukungu|uso umevimba)'),
    ],
  },
  {
    id: 'pregnancy_other',
    level: 'emergency',
    message: 'Pregnancy danger sign — go to a facility now.',
    when: (c) => c.pregnant,
    patterns: [
      re('(baby|fetus) (is )?(not|stopped|isn.?t) moving'),
      re('(reduced|less|no|fewer) (fetal |baby )?movement'),
      re('water (broke|has broken|breaking)'),
      re('(severe|bad) (abdominal|stomach|belly) pain'),
      re('(bebe|bebé) no se mueve'),
      re('(rompio|rompió) (la )?fuente'),
      re('(bebe|bebé) ne bouge (pas|plus)'),
      re('perte des eaux'),
      re('mtoto (hachezi|hacheza)'),
      re('maji yamevunjika'),
    ],
  },
  {
    id: 'pregnancy_fever',
    level: 'urgent',
    message: 'Fever during pregnancy needs assessment today.',
    when: (c) => c.pregnant,
    patterns: [re('fever'), re('fiebre'), re('fievre'), re('homa')],
  },

  // ---------- Age-specific ----------
  {
    id: 'young_infant_fever',
    level: 'emergency',
    message: 'Fever in a baby under 3 months always needs immediate assessment.',
    when: (c) => typeof c.ageYears === 'number' && c.ageYears < 0.25,
    patterns: [re('fever'), re('\\b(feels |is |very )?hot\\b'), re('fiebre'), re('fievre'), re('homa'), re('joto')],
  },

  // ---------- Urgent ----------
  {
    id: 'shortness_of_breath',
    level: 'urgent',
    message: 'Shortness of breath needs assessment today.',
    patterns: [
      re('short(ness)? of breath'),
      re('(difficulty|trouble|hard|problems?) breathing'),
      re('breathing (fast|quickly|rapidly|hard)'),
      re('fast breathing'),
      re('wheez'),
      re('(dificultad|problemas?) (para|al) respirar'),
      re('falta de (aire|aliento)'),
      re('(difficulte|mal) a respirer'),
      re('essouffl'),
      re('(shida ya kupumua|anapumua haraka|kubanwa na pumzi)'),
    ],
  },
  {
    id: 'fainting',
    level: 'urgent',
    message: 'Fainting should be checked today.',
    patterns: [re('faint(ed|ing)?'), re('passed out'), re('blacked out'), re('desmay'), re('evanoui'), re('alizimia')],
  },
  {
    id: 'coughing_blood',
    level: 'urgent',
    message: 'Coughing up blood needs assessment today.',
    patterns: [re('cough(ing)? (up )?blood'), re('blood (when|while) (i |he |she )?cough'), re('tos con sangre'), re('tousse du sang'), re('kukohoa damu')],
  },
  {
    id: 'blood_in_stool_urine',
    level: 'urgent',
    message: 'Blood in stool or urine should be checked today.',
    patterns: [
      re('blood(y)? (in (my |the |his |her )?)?(stool|poo|poop|urine|pee|diarr)'),
      re('(stool|poo|poop|urine|pee|diarrh?o?ea) (with|has) blood'),
      re('sangre en (las heces|la orina|el popo)'),
      re('diarrea con sangre'),
      re('sang dans (les selles|les urines)'),
      re('(damu kwenye (choo|mkojo)|kuhara damu)'),
    ],
  },
  {
    id: 'dehydration',
    level: 'urgent',
    message: 'Signs of dehydration — fluids and assessment needed today.',
    patterns: [
      re('(no|not|hasn.?t|haven.?t) (urine|peed|passed urine|urinated)'),
      re('sunken (eyes|fontanel)'),
      re("(can't|cannot|can not|unable to) keep (any )?(fluids|water|anything) down"),
      re('ojos hundidos'),
      re('yeux (creux|enfonces)'),
      re('macho yamezama'),
    ],
  },
  {
    id: 'jaundice',
    level: 'urgent',
    message: 'Yellow eyes or skin (jaundice) needs assessment.',
    patterns: [re('yellow (eyes|skin|palms|soles)'), re('(eyes|skin) (are |is |look |turned )?yellow'), re('jaundice'), re('ojos amarillos'), re('ictericia'), re('yeux jaunes'), re('jaunisse'), re('macho (ya )?njano'), re('manjano')],
  },
  {
    id: 'high_fever',
    level: 'urgent',
    message: 'High or prolonged fever should be assessed (test for malaria where relevant).',
    patterns: [
      re('(high|very high|severe) (fever|temperature)'),
      re('fever (for|since) (\\d+|two|three|four|five|several|many) days'),
      re('(fiebre alta|fiebre muy alta)'),
      re('(forte fievre|fievre (elevee|forte))'),
      re('homa kali'),
    ],
  },
  {
    id: 'severe_pain',
    level: 'urgent',
    message: 'Severe pain should be assessed today.',
    patterns: [
      re('(severe|unbearable|excruciating|terrible|extreme|worst) (pain|abdominal|stomach|belly)'),
      re('dolor (muy )?(fuerte|intenso|insoportable)'),
      re('douleur (intense|insupportable|severe)'),
      re('maumivu makali'),
    ],
  },
  {
    id: 'confusion',
    level: 'urgent',
    message: 'New confusion needs assessment today.',
    patterns: [re('confus(ed|ion)'), re('disoriented'), re('confundid'), re('desorientad'), re('confus'), re('kuchanganyikiwa')],
  },
  {
    id: 'stiff_neck',
    level: 'urgent',
    message: 'A stiff neck should be checked, especially with fever.',
    patterns: [re('stiff neck'), re('neck (is )?stiff'), re('cuello rigido'), re('nuque raide'), re('shingo ngumu')],
  },
  {
    id: 'possible_tb',
    level: 'urgent',
    message: 'A cough lasting 2+ weeks should be tested for tuberculosis.',
    patterns: [
      re('cough(ing)? (for|since) (\\d+|two|three|four|several|many) (weeks|months)'),
      re('cough(ing)? for (more than|over) (a|\\d+|two|three) (week|weeks|month|months)'),
      re('night sweats'),
      re('tos (desde hace|por) (\\d+|dos|tres|varias) semanas'),
      re('toux depuis (\\d+|deux|trois|plusieurs) semaines'),
      re('kikohozi (kwa|cha) wiki'),
    ],
  },
];

/**
 * Scan free text for red flags.
 * @param {string} text
 * @param {{ageYears?: number, sex?: string, pregnant?: boolean}} [context]
 * @returns {{level: string|null, hits: Array<{id:string, level:string, message:string, matched:string}>}}
 */
export function checkRedFlags(text, context = {}) {
  const norm = normalize(text);
  const hits = [];
  if (!norm) return { level: null, hits };

  const findMatch = (patterns, negatable) => {
    for (const p of patterns) {
      p.lastIndex = 0;
      let m;
      while ((m = p.exec(norm)) !== null) {
        if (!negatable || !isNegated(norm, m.index)) return m[0];
        if (m[0].length === 0) p.lastIndex++;
      }
    }
    return null;
  };

  for (const rule of RED_FLAG_RULES) {
    if (rule.when && !rule.when(context)) continue;
    const negatable = rule.negatable !== false;
    let matched = null;
    if (rule.all) {
      const parts = rule.all.map((group) => findMatch(group, negatable));
      if (parts.every(Boolean)) matched = parts.join(' + ');
    } else {
      matched = findMatch(rule.patterns, negatable);
    }
    if (matched) hits.push({ id: rule.id, level: rule.level, message: rule.message, matched });
  }

  const order = { emergency: 3, urgent: 2, routine: 1, self_care: 0 };
  hits.sort((a, b) => order[b.level] - order[a.level]);
  return { level: hits[0]?.level ?? null, hits };
}
