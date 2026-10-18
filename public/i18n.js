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
  pt: {
    tab_talk: 'Falar', tab_chw: 'Agente de saúde', tab_scan: 'Foto', tab_review: 'Revisão', tab_settings: 'Ajustes',
    talk_title: 'Como posso ajudar?', talk_intro: 'Toque no microfone e descreva como você ou a pessoa de quem cuida está se sentindo. Também pode escrever.',
    tap_to_speak: 'Toque para falar', listening: 'Ouvindo… toque para parar', transcribing: 'Entendendo…', thinking: 'Avaliando…',
    type_placeholder: 'Descreva os sintomas…', send: 'Enviar', new_conversation: 'Recomeçar',
    about_person: 'Sobre a pessoa', age: 'Idade (anos)', age_months: 'ou meses', sex: 'Sexo', female: 'Feminino', male: 'Masculino', other: 'Outro',
    pregnant: 'Grávida', call_emergency: 'Ligar para emergência', why: 'Por que este conselho?', what_to_do: 'O que fazer agora',
    seek_care_if: 'Procure ajuda antes se', possible_causes: 'Causas possíveis', safety_found: 'A verificação de segurança encontrou',
    offline_badge: 'Verificação offline — conecte-se para a avaliação completa', demo_badge: 'Modo demonstração',
    raised_by_rules: 'Elevado pelas regras de segurança', disclaimer: 'O Health AI orienta, não faz diagnóstico, e não substitui um profissional de saúde.',
    consent_title: 'Antes de começar', consent_body: 'O Health AI é um assistente, não um médico. Ele pode errar. Em uma emergência, ligue para o número de emergência local ou vá ao serviço de saúde mais próximo. O que você compartilha é processado por um serviço de IA; evite compartilhar nomes ou números de documentos.',
    consent_accept: 'Entendi', patients: 'Pacientes', new_patient: 'Novo paciente', search: 'Buscar', name: 'Nome ou ID', village: 'Comunidade / área',
    save: 'Salvar', cancel: 'Cancelar', start_assessment: 'Iniciar avaliação', history: 'Histórico', protocol: 'Protocolo', vitals: 'Sinais vitais',
    yes: 'Sim', no: 'Não', notes: 'Notas / sintomas', assess: 'Avaliar', save_encounter: 'Salvar no registro', saved: 'Salvo',
    queued: 'Salvo offline — será sincronizado', referral_note: 'Nota de encaminhamento', copy: 'Copiar', copied: 'Copiado', chw_guidance: 'Orientação para o agente de saúde',
    scan_title: 'Verificação por imagem', scan_intro: 'Tire uma foto nítida com boa luz. Os resultados devem ser confirmados por um profissional treinado.',
    kind_rdt: 'Teste rápido (TDR)', kind_skin: 'Pele / erupção', kind_wound: 'Ferida / queimadura', kind_eye: 'Olho', kind_other: 'Outro',
    take_photo: 'Tirar ou escolher foto', analyze: 'Analisar', rdt_result: 'Leitura do teste', image_quality: 'Qualidade da imagem', findings: 'Achados', recommendations: 'Recomendações',
    attach_patient: 'Vincular a paciente (opcional)', none: 'Nenhum', review_title: 'Revisão clínica', pending: 'Pendentes', all: 'Todos',
    agree: 'Concordo', modify: 'Mudar nível', outcome: 'Desfecho (opcional)', review_note: 'Nota', submit: 'Enviar',
    language: 'Idioma', voice_output: 'Ler respostas em voz alta', access_token: 'Código de acesso', apply: 'Aplicar', role: 'Nível de acesso',
    emergency_number: 'Número de emergência', pending_sync: 'aguardando sincronização', sync_now: 'Sincronizar agora', back: 'Voltar', ai_error: 'IA indisponível — mostrando resultado das regras de segurança.',
    temp: 'Temperatura °C', hr: 'Frequência cardíaca /min', rr: 'Respirações /min', spo2: 'Oxigênio SpO₂ %', sys: 'PA sistólica', dia: 'PA diastólica', glu: 'Glicemia mg/dL', muac: 'PB (MUAC) mm',
    metrics: 'Indicadores de qualidade', no_items: 'Nada aqui ainda.', mic_denied: 'Microfone indisponível. Por favor, escreva.',
    follow_up: 'Por favor responda', ai_label: 'Nível da IA', confidence: 'Confiança',
  },
  ar: {
    tab_talk: 'تحدّث', tab_chw: 'العامل الصحي', tab_scan: 'صورة', tab_review: 'مراجعة', tab_settings: 'الإعدادات',
    talk_title: 'كيف يمكنني المساعدة؟', talk_intro: 'اضغط على الميكروفون وصف ما تشعر به أنت أو الشخص الذي تعتني به. يمكنك أيضًا الكتابة.',
    tap_to_speak: 'اضغط للتحدث', listening: 'أستمع… اضغط للإيقاف', transcribing: 'أفهم…', thinking: 'أقيّم…',
    type_placeholder: 'صف الأعراض…', send: 'إرسال', new_conversation: 'ابدأ من جديد',
    about_person: 'عن الشخص', age: 'العمر (سنوات)', age_months: 'أو أشهر', sex: 'الجنس', female: 'أنثى', male: 'ذكر', other: 'آخر',
    pregnant: 'حامل', call_emergency: 'اتصل بالطوارئ', why: 'لماذا هذه النصيحة؟', what_to_do: 'ماذا تفعل الآن',
    seek_care_if: 'اطلب المساعدة مبكرًا إذا', possible_causes: 'أسباب محتملة', safety_found: 'وجد فحص السلامة',
    offline_badge: 'فحص دون اتصال — اتصل بالإنترنت للتقييم الكامل', demo_badge: 'وضع تجريبي',
    raised_by_rules: 'رُفع بواسطة قواعد السلامة', disclaimer: 'يقدم Health AI إرشادات وليس تشخيصًا، ولا يحل محل العامل الصحي.',
    consent_title: 'قبل أن تبدأ', consent_body: 'Health AI مساعد وليس طبيبًا، وقد يخطئ. في حالة الطوارئ اتصل برقم الطوارئ المحلي أو اذهب إلى أقرب مرفق صحي. تتم معالجة ما تشاركه بواسطة خدمة ذكاء اصطناعي؛ تجنب مشاركة الأسماء أو أرقام الهوية.',
    consent_accept: 'فهمت', patients: 'المرضى', new_patient: 'مريض جديد', search: 'بحث', name: 'الاسم أو الرقم', village: 'القرية / المنطقة',
    save: 'حفظ', cancel: 'إلغاء', start_assessment: 'بدء التقييم', history: 'السجل', protocol: 'البروتوكول', vitals: 'العلامات الحيوية',
    yes: 'نعم', no: 'لا', notes: 'ملاحظات / أعراض', assess: 'تقييم', save_encounter: 'حفظ في السجل', saved: 'تم الحفظ',
    queued: 'حُفظ دون اتصال — ستتم المزامنة', referral_note: 'مذكرة الإحالة', copy: 'نسخ', copied: 'تم النسخ', chw_guidance: 'إرشادات للعامل الصحي',
    scan_title: 'فحص بالصورة', scan_intro: 'التقط صورة واضحة في إضاءة جيدة. يجب أن يؤكد النتائج عامل صحي مدرَّب.',
    kind_rdt: 'اختبار سريع', kind_skin: 'جلد / طفح', kind_wound: 'جرح / حرق', kind_eye: 'عين', kind_other: 'أخرى',
    take_photo: 'التقط أو اختر صورة', analyze: 'تحليل', rdt_result: 'قراءة الاختبار', image_quality: 'جودة الصورة', findings: 'النتائج', recommendations: 'التوصيات',
    attach_patient: 'ربط بمريض (اختياري)', none: 'لا شيء', review_title: 'مراجعة الطبيب', pending: 'قيد الانتظار', all: 'الكل',
    agree: 'موافق', modify: 'تغيير المستوى', outcome: 'النتيجة (اختياري)', review_note: 'ملاحظة', submit: 'إرسال',
    language: 'اللغة', voice_output: 'قراءة الإجابات بصوت عالٍ', access_token: 'رمز الدخول', apply: 'تطبيق', role: 'مستوى الوصول',
    emergency_number: 'رقم الطوارئ', pending_sync: 'بانتظار المزامنة', sync_now: 'زامن الآن', back: 'رجوع', ai_error: 'الذكاء الاصطناعي غير متاح — عرض نتيجة قواعد السلامة.',
    temp: 'الحرارة °م', hr: 'النبض /دقيقة', rr: 'التنفس /دقيقة', spo2: 'الأكسجين SpO₂ %', sys: 'الضغط الانقباضي', dia: 'الضغط الانبساطي', glu: 'السكر mg/dL', muac: 'محيط الذراع مم',
    metrics: 'مؤشرات الجودة', no_items: 'لا شيء هنا بعد.', mic_denied: 'الميكروفون غير متاح. يرجى الكتابة.',
    follow_up: 'يرجى الإجابة', ai_label: 'مستوى الذكاء الاصطناعي', confidence: 'الثقة',
  },
};

const RTL = new Set(['ar']);

// `current` is the language the AI answers in; the interface falls back to English for any
// string not translated yet (e.g. Hausa, Amharic).
let current = 'en';
export function setLanguage(lang) {
  current = UI_LANGUAGES[lang] ? lang : 'en';
  document.documentElement.lang = current;
  document.documentElement.dir = RTL.has(current) ? 'rtl' : 'ltr';
}
export const getLanguage = () => current;
export const t = (key) => STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
export const UI_LANGUAGES = {
  en: 'English', es: 'Español', fr: 'Français', sw: 'Kiswahili', pt: 'Português', ar: 'العربية',
  ha: 'Hausa (AI)', am: 'አማርኛ (AI)', yo: 'Yorùbá (AI)', hi: 'हिन्दी (AI)',
};

// BCP-47 tags for on-device speech recognition / synthesis.
export const SPEECH_LANG = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', sw: 'sw-KE', pt: 'pt-BR', ar: 'ar', hi: 'hi-IN', ha: 'ha-NG', am: 'am-ET', yo: 'yo-NG' };
