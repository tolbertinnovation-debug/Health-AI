// Age-aware vital sign interpretation. Deterministic; shared by server and browser.
// Thresholds follow WHO IMCI (respiratory rate, MUAC) and common adult early-warning
// criteria. CLINICAL CONTENT NOTICE: validate and localise before real-world use.

const num = (v) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function ageBand(ageYears) {
  if (ageYears === null) return 'adult';
  if (ageYears < 2 / 12) return 'young_infant';
  if (ageYears < 1) return 'infant';
  if (ageYears < 5) return 'child';
  if (ageYears < 12) return 'older_child';
  return 'adult';
}

/**
 * @param {object} v vitals: tempC, heartRate, respRate, spo2, systolic, diastolic, glucoseMgDl, muacMm
 * @param {{ageYears?: number, pregnant?: boolean}} context
 */
export function assessVitals(v = {}, context = {}) {
  const findings = [];
  const add = (id, level, message) => findings.push({ id, level, message });
  const age = num(context.ageYears);
  const band = ageBand(age);

  const temp = num(v.tempC);
  const hr = num(v.heartRate);
  const rr = num(v.respRate);
  const spo2 = num(v.spo2);
  const sys = num(v.systolic);
  const dia = num(v.diastolic);
  const glu = num(v.glucoseMgDl);
  const muac = num(v.muacMm);

  // Oxygen saturation
  if (spo2 !== null) {
    if (spo2 < 90) add('spo2_low', 'emergency', `Oxygen saturation ${spo2}% is dangerously low (<90%).`);
    else if (spo2 < 94) add('spo2_borderline', 'urgent', `Oxygen saturation ${spo2}% is low (90–93%).`);
  }

  // Temperature
  if (temp !== null) {
    if (age !== null && age < 0.25 && (temp >= 38 || temp < 35.5)) {
      add('infant_temp', 'emergency', `Temperature ${temp}°C in a baby under 3 months needs immediate assessment.`);
    } else if (temp >= 41) add('hyperpyrexia', 'emergency', `Temperature ${temp}°C is extremely high.`);
    else if (temp < 32) add('severe_hypothermia', 'emergency', `Temperature ${temp}°C indicates severe hypothermia.`);
    else if (temp >= 39.5) add('high_fever', 'urgent', `High fever (${temp}°C).`);
    else if (temp < 35) add('hypothermia', 'urgent', `Low body temperature (${temp}°C).`);
    else if (temp >= 38) add('fever', 'routine', `Fever (${temp}°C). Test for malaria where it is common.`);
  }

  // Respiratory rate (WHO IMCI fast-breathing thresholds for children)
  if (rr !== null) {
    const t = {
      young_infant: { urgent: 60, emergency: 60 },
      infant: { urgent: 50, emergency: 70 },
      child: { urgent: 40, emergency: 60 },
      older_child: { urgent: 30, emergency: 40 },
      adult: { urgent: 22, emergency: 30 },
    }[band];
    if (rr >= t.emergency) add('rr_very_high', 'emergency', `Breathing rate ${rr}/min is dangerously fast for this age.`);
    else if (rr >= t.urgent) add('rr_high', 'urgent', `Fast breathing (${rr}/min) for this age — possible pneumonia.`);
    if (band === 'adult' && rr < 8) add('rr_very_low', 'emergency', `Breathing rate ${rr}/min is dangerously slow.`);
  }

  // Heart rate
  if (hr !== null) {
    const t = {
      young_infant: { low: 90, high: 180, urgentHigh: 160 },
      infant: { low: 90, high: 180, urgentHigh: 160 },
      child: { low: 70, high: 160, urgentHigh: 140 },
      older_child: { low: 60, high: 140, urgentHigh: 120 },
      adult: { low: 40, high: 130, urgentHigh: 110, urgentLow: 50 },
    }[band];
    if (hr > t.high || hr < t.low) add('hr_critical', 'emergency', `Heart rate ${hr}/min is outside the safe range for this age.`);
    else if (hr > t.urgentHigh || (t.urgentLow && hr < t.urgentLow)) add('hr_abnormal', 'urgent', `Heart rate ${hr}/min is abnormal.`);
  }

  // Blood pressure
  if (sys !== null || dia !== null) {
    if (context.pregnant) {
      if ((sys ?? 0) >= 160 || (dia ?? 0) >= 110) add('bp_severe_pregnancy', 'emergency', `BP ${sys ?? '?'}/${dia ?? '?'} in pregnancy — possible severe pre-eclampsia.`);
      else if ((sys ?? 0) >= 140 || (dia ?? 0) >= 90) add('bp_high_pregnancy', 'urgent', `BP ${sys ?? '?'}/${dia ?? '?'} in pregnancy is high — check for pre-eclampsia today.`);
    } else if ((sys ?? 0) >= 180 || (dia ?? 0) >= 120) {
      add('bp_crisis', 'urgent', `BP ${sys ?? '?'}/${dia ?? '?'} is very high (hypertensive crisis range).`);
    } else if ((sys ?? 0) >= 140 || (dia ?? 0) >= 90) {
      add('bp_high', 'routine', `BP ${sys ?? '?'}/${dia ?? '?'} is raised — needs follow-up.`);
    }
    if (band === 'adult' && sys !== null && sys < 90) add('bp_low', 'emergency', `Systolic BP ${sys} is low — possible shock.`);
  }

  // Blood glucose (mg/dL)
  if (glu !== null) {
    if (glu < 54) add('glucose_very_low', 'emergency', `Blood sugar ${glu} mg/dL is dangerously low — give sugar if able to swallow.`);
    else if (glu < 70) add('glucose_low', 'urgent', `Blood sugar ${glu} mg/dL is low.`);
    else if (glu > 400) add('glucose_very_high', 'emergency', `Blood sugar ${glu} mg/dL is extremely high.`);
    else if (glu > 250) add('glucose_high', 'urgent', `Blood sugar ${glu} mg/dL is very high.`);
    else if (glu > 180) add('glucose_raised', 'routine', `Blood sugar ${glu} mg/dL is raised.`);
  }

  // Mid-upper arm circumference (children 6–59 months)
  if (muac !== null && age !== null && age >= 0.5 && age < 5) {
    if (muac < 115) add('sam', 'urgent', `MUAC ${muac} mm — severe acute malnutrition. Refer to a nutrition programme.`);
    else if (muac < 125) add('mam', 'routine', `MUAC ${muac} mm — moderate acute malnutrition.`);
  }

  const order = { emergency: 3, urgent: 2, routine: 1, self_care: 0 };
  findings.sort((a, b) => order[b.level] - order[a.level]);
  return { level: findings[0]?.level ?? null, findings };
}
