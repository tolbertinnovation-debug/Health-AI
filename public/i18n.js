// UI strings. AI-generated content is produced directly in the selected language.

const STRINGS = {
  en: {
    tab_talk: 'Talk', tab_chw: 'Health worker', tab_scan: 'Scan', tab_review: 'Review', tab_settings: 'Settings',
    talk_title: 'How can I help?', talk_intro: 'Tap the microphone and describe how you or the person you care for feels. You can also type.',
    tap_to_speak: 'Tap to speak', listening: 'Listening… tap to stop', transcribing: 'Understanding…', thinking: 'Assessing…',
    type_placeholder: 'Describe the symptoms…', send: 'Send', new_conversation: 'Start over',
    about_person: 'About the person', age: 'Age (years)', age_months: 'or months', sex: 'Sex', female: 'Female', male: 'Male', other: 'Other',
    pregnant: 'Pregnant', call_emergency: 'Call emergency', why: 'Why this advice?', what_to_do: 'What to do now',
    seek_care_if: 'Get help sooner if', possible_causes: 'Possible causes', safety_found: 'Safety check found',
    offline_badge: 'Offline safety check — connect for full AI assessment', demo_badge: 'Demo mode',
    raised_by_rules: 'Raised by safety rules', disclaimer: 'Health AI gives guidance, not a diagnosis, and does not replace a health worker.',
    consent_title: 'Before you start', consent_body: 'Health AI is an assistant, not a doctor. It can make mistakes. In an emergency call your local emergency number or go to the nearest health facility. What you share is processed by an AI service to give guidance; avoid sharing names or ID numbers.',
    consent_accept: 'I understand', patients: 'Patients', new_patient: 'New patient', search: 'Search', name: 'Name or ID', village: 'Village / area',
    save: 'Save', cancel: 'Cancel', start_assessment: 'Start assessment', history: 'History', protocol: 'Protocol', vitals: 'Vitals',
    yes: 'Yes', no: 'No', notes: 'Notes / symptoms', assess: 'Assess', save_encounter: 'Save to record', saved: 'Saved',
    queued: 'Saved offline — will sync', referral_note: 'Referral note', copy: 'Copy', copied: 'Copied', chw_guidance: 'Guidance for the health worker',
    scan_title: 'Image check', scan_intro: 'Take a clear photo in good light. Results must be confirmed by a trained health worker.',
    kind_rdt: 'Rapid test (RDT)', kind_skin: 'Skin / rash', kind_wound: 'Wound / burn', kind_eye: 'Eye', kind_other: 'Other',
    take_photo: 'Take or choose photo', analyze: 'Analyse', rdt_result: 'Test reading', image_quality: 'Image quality', findings: 'Findings', recommendations: 'Recommendations',
    attach_patient: 'Attach to patient (optional)', none: 'None', review_title: 'Clinician review', pending: 'Pending', all: 'All',
    agree: 'Agree', modify: 'Change level', outcome: 'Outcome (optional)', review_note: 'Note', submit: 'Submit',
    language: 'Language', voice_output: 'Read answers aloud', access_token: 'Access code', apply: 'Apply', role: 'Access level',
    emergency_number: 'Emergency number', pending_sync: 'waiting to sync', sync_now: 'Sync now', back: 'Back', ai_error: 'AI unavailable — showing safety rules result.',
    temp: 'Temperature °C', hr: 'Heart rate /min', rr: 'Breaths /min', spo2: 'Oxygen SpO₂ %', sys: 'BP systolic', dia: 'BP diastolic', glu: 'Blood sugar mg/dL', muac: 'MUAC mm',
    metrics: 'Quality metrics', no_items: 'Nothing here yet.', mic_denied: 'Microphone not available. Please type instead.',
    follow_up: 'Please answer', ai_label: 'AI level', confidence: 'Confidence',
  },
  es: {
    tab_talk: 'Hablar', tab_chw: 'Promotor', tab_scan: 'Foto', tab_review: 'Revisión', tab_settings: 'Ajustes',
    talk_title: '¿Cómo puedo ayudar?', talk_intro: 'Toque el micrófono y describa cómo se siente usted o la persona que cuida. También puede escribir.',
    tap_to_speak: 'Toque para hablar', listening: 'Escuchando… toque para parar', transcribing: 'Entendiendo…', thinking: 'Evaluando…',
    type_placeholder: 'Describa los síntomas…', send: 'Enviar', new_conversation: 'Empezar de nuevo',
    about_person: 'Sobre la persona', age: 'Edad (años)', age_months: 'o meses', sex: 'Sexo', female: 'Mujer', male: 'Hombre', other: 'Otro',
    pregnant: 'Embarazada', call_emergency: 'Llamar a emergencias', why: '¿Por qué este consejo?', what_to_do: 'Qué hacer ahora',
    seek_care_if: 'Busque ayuda antes si', possible_causes: 'Posibles causas', safety_found: 'El control de seguridad encontró',
    offline_badge: 'Control sin conexión — conéctese para la evaluación completa', demo_badge: 'Modo demo',
    raised_by_rules: 'Elevado por reglas de seguridad', disclaimer: 'Health AI orienta, no diagnostica, y no reemplaza a un trabajador de salud.',
    consent_title: 'Antes de empezar', consent_body: 'Health AI es un asistente, no un médico. Puede equivocarse. En una emergencia llame al número local de emergencias o vaya al centro de salud más cercano. Lo que comparte lo procesa un servicio de IA; evite compartir nombres o números de identificación.',
    consent_accept: 'Entiendo', save: 'Guardar', cancel: 'Cancelar', yes: 'Sí', no: 'No', assess: 'Evaluar', back: 'Atrás',
    language: 'Idioma', voice_output: 'Leer respuestas en voz alta', follow_up: 'Por favor responda',
  },
  fr: {
    tab_talk: 'Parler', tab_chw: 'Agent de santé', tab_scan: 'Photo', tab_review: 'Revue', tab_settings: 'Réglages',
    talk_title: 'Comment puis-je aider ?', talk_intro: 'Touchez le micro et décrivez ce que vous ou la personne dont vous vous occupez ressentez. Vous pouvez aussi écrire.',
    tap_to_speak: 'Touchez pour parler', listening: 'J’écoute… touchez pour arrêter', transcribing: 'Compréhension…', thinking: 'Évaluation…',
    type_placeholder: 'Décrivez les symptômes…', send: 'Envoyer', new_conversation: 'Recommencer',
    about_person: 'À propos de la personne', age: 'Âge (ans)', age_months: 'ou mois', sex: 'Sexe', female: 'Femme', male: 'Homme', other: 'Autre',
    pregnant: 'Enceinte', call_emergency: 'Appeler les urgences', why: 'Pourquoi ce conseil ?', what_to_do: 'Que faire maintenant',
    seek_care_if: 'Consultez plus tôt si', possible_causes: 'Causes possibles', safety_found: 'Le contrôle de sécurité a trouvé',
    offline_badge: 'Contrôle hors ligne — connectez-vous pour l’évaluation complète', demo_badge: 'Mode démo',
    raised_by_rules: 'Relevé par les règles de sécurité', disclaimer: 'Health AI oriente, ne diagnostique pas et ne remplace pas un agent de santé.',
    consent_title: 'Avant de commencer', consent_body: 'Health AI est un assistant, pas un médecin. Il peut se tromper. En cas d’urgence, appelez le numéro d’urgence local ou allez au centre de santé le plus proche. Ce que vous partagez est traité par un service d’IA ; évitez de partager des noms ou numéros d’identité.',
    consent_accept: 'Je comprends', save: 'Enregistrer', cancel: 'Annuler', yes: 'Oui', no: 'Non', assess: 'Évaluer', back: 'Retour',
    language: 'Langue', voice_output: 'Lire les réponses à voix haute', follow_up: 'Merci de répondre',
  },
  sw: {
    tab_talk: 'Ongea', tab_chw: 'Mhudumu wa afya', tab_scan: 'Picha', tab_review: 'Mapitio', tab_settings: 'Mipangilio',
    talk_title: 'Nikusaidie vipi?', talk_intro: 'Gusa kipaza sauti na ueleze unavyojisikia wewe au mgonjwa unayemhudumia. Unaweza pia kuandika.',
    tap_to_speak: 'Gusa kuongea', listening: 'Ninasikiliza… gusa kusimamisha', transcribing: 'Ninaelewa…', thinking: 'Ninatathmini…',
    type_placeholder: 'Eleza dalili…', send: 'Tuma', new_conversation: 'Anza upya',
    about_person: 'Kuhusu mgonjwa', age: 'Umri (miaka)', age_months: 'au miezi', sex: 'Jinsia', female: 'Mwanamke', male: 'Mwanaume', other: 'Nyingine',
    pregnant: 'Mjamzito', call_emergency: 'Piga simu ya dharura', why: 'Kwa nini ushauri huu?', what_to_do: 'Fanya nini sasa',
    seek_care_if: 'Tafuta msaada mapema ikiwa', possible_causes: 'Visababishi vinavyowezekana', safety_found: 'Ukaguzi wa usalama umegundua',
    offline_badge: 'Ukaguzi bila mtandao — unganisha kwa tathmini kamili', demo_badge: 'Hali ya majaribio',
    raised_by_rules: 'Imepandishwa na kanuni za usalama', disclaimer: 'Health AI inatoa ushauri, si utambuzi, na haichukui nafasi ya mhudumu wa afya.',
    consent_title: 'Kabla ya kuanza', consent_body: 'Health AI ni msaidizi, si daktari. Inaweza kukosea. Katika dharura piga namba ya dharura au nenda kituo cha afya kilicho karibu. Unachoshiriki kinachakatwa na huduma ya AI; epuka kushiriki majina au namba za vitambulisho.',
    consent_accept: 'Nimeelewa', save: 'Hifadhi', cancel: 'Ghairi', yes: 'Ndiyo', no: 'Hapana', assess: 'Tathmini', back: 'Rudi',
    language: 'Lugha', voice_output: 'Soma majibu kwa sauti', follow_up: 'Tafadhali jibu',
  },
};

let current = 'en';
export function setLanguage(lang) {
  current = STRINGS[lang] ? lang : 'en';
  document.documentElement.lang = current;
}
export const getLanguage = () => current;
export const t = (key) => STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
export const UI_LANGUAGES = { en: 'English', es: 'Español', fr: 'Français', sw: 'Kiswahili' };

// BCP-47 tags for on-device speech recognition / synthesis.
export const SPEECH_LANG = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', sw: 'sw-KE', pt: 'pt-BR', ar: 'ar', hi: 'hi-IN', ha: 'ha-NG', am: 'am-ET', yo: 'yo-NG' };
