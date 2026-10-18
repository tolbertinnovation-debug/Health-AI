// Fixed phrases for SMS, USSD and phone-call channels. {num} = emergency number.
// TRANSLATION NOTICE: have native speakers review these before deployment.

export const CHANNEL_LANGUAGES = ['en', 'sw', 'fr', 'es', 'pt', 'ar'];

// Twilio <Gather>/<Say> language codes.
export const TWILIO_LANG = { en: 'en-US', sw: 'sw-KE', fr: 'fr-FR', es: 'es-ES', pt: 'pt-BR', ar: 'ar-EG' };

const S = {
  en: {
    sms_welcome: 'Health AI gives guidance, not a diagnosis. Emergency: call {num}.',
    sms_footer: 'Reply with more details. RESET = new chat.',
    sms_reset: 'New conversation started. Describe the symptoms: who is sick, their age and for how long.',
    sms_help: 'Text the symptoms (who is sick, age, how long). RESET = new chat. Emergency: call {num}.',
    sms_limit: 'Too many messages. Please try again later. Emergency: call {num}.',
    sms_error: 'Sorry, something went wrong. If you are worried, go to a health facility or call {num}.',
    call_now: 'Call {num} now.',
    voice_greeting: 'Welcome to Health AI. I give guidance, not a diagnosis. In an emergency, hang up and call {num}. Please describe the symptoms: who is sick, their age, and for how long.',
    voice_wait: 'Thank you. One moment please.',
    voice_no_input: 'Sorry, I did not hear anything. Please describe the symptoms.',
    voice_goodbye: 'If things get worse, call back or go to a health facility. Goodbye.',
    voice_hangup_call: 'Please hang up now and call {num}.',
    voice_connect: 'I am connecting you to a health worker now.',
    ussd_who: 'Who is unwell?\n1 Baby under 2 months\n2 Child 2 months to 5 years\n3 Pregnant woman\n4 Adult or older child',
    ussd_yes_no: '1 Yes\n2 No',
    ussd_invalid: 'Invalid choice.',
  },
  sw: {
    sms_welcome: 'Health AI inatoa ushauri, si utambuzi. Dharura: piga {num}.',
    sms_footer: 'Jibu kwa maelezo zaidi. ANZA = mazungumzo mapya.',
    sms_reset: 'Mazungumzo mapya yameanza. Eleza dalili: nani mgonjwa, umri wake na kwa muda gani.',
    sms_help: 'Tuma dalili (nani mgonjwa, umri, muda gani). ANZA = mazungumzo mapya. Dharura: piga {num}.',
    sms_limit: 'Ujumbe mwingi mno. Tafadhali jaribu baadaye. Dharura: piga {num}.',
    sms_error: 'Samahani, kuna tatizo. Ukiwa na wasiwasi, nenda kituo cha afya au piga {num}.',
    call_now: 'Piga {num} sasa.',
    voice_greeting: 'Karibu Health AI. Ninatoa ushauri, si utambuzi. Katika dharura, kata simu na upige {num}. Tafadhali eleza dalili: nani mgonjwa, umri wake, na kwa muda gani.',
    voice_wait: 'Asante. Tafadhali subiri kidogo.',
    voice_no_input: 'Samahani, sikusikia chochote. Tafadhali eleza dalili.',
    voice_goodbye: 'Hali ikizidi, piga tena au nenda kituo cha afya. Kwaheri.',
    voice_hangup_call: 'Tafadhali kata simu sasa na upige {num}.',
    voice_connect: 'Ninakuunganisha na mhudumu wa afya sasa.',
    ussd_who: 'Nani mgonjwa?\n1 Mtoto chini ya miezi 2\n2 Mtoto miezi 2 hadi miaka 5\n3 Mama mjamzito\n4 Mtu mzima au mtoto mkubwa',
    ussd_yes_no: '1 Ndiyo\n2 Hapana',
    ussd_invalid: 'Chaguo si sahihi.',
  },
  fr: {
    sms_welcome: 'Health AI donne des conseils, pas un diagnostic. Urgence : appelez le {num}.',
    sms_footer: 'Répondez avec plus de détails. RESET = nouvelle conversation.',
    sms_reset: 'Nouvelle conversation. Décrivez les symptômes : qui est malade, son âge et depuis quand.',
    sms_help: 'Envoyez les symptômes (qui, âge, depuis quand). RESET = nouvelle conversation. Urgence : appelez le {num}.',
    sms_limit: 'Trop de messages. Réessayez plus tard. Urgence : appelez le {num}.',
    sms_error: 'Désolé, une erreur est survenue. Si vous êtes inquiet, allez au centre de santé ou appelez le {num}.',
    call_now: 'Appelez le {num} maintenant.',
    voice_greeting: 'Bienvenue sur Health AI. Je donne des conseils, pas un diagnostic. En cas d’urgence, raccrochez et appelez le {num}. Décrivez les symptômes : qui est malade, son âge, et depuis quand.',
    voice_wait: 'Merci. Un instant s’il vous plaît.',
    voice_no_input: 'Désolé, je n’ai rien entendu. Décrivez les symptômes.',
    voice_goodbye: 'Si cela s’aggrave, rappelez ou allez au centre de santé. Au revoir.',
    voice_hangup_call: 'Raccrochez maintenant et appelez le {num}.',
    voice_connect: 'Je vous mets en relation avec un agent de santé.',
    ussd_who: 'Qui est malade ?\n1 Bébé de moins de 2 mois\n2 Enfant de 2 mois à 5 ans\n3 Femme enceinte\n4 Adulte ou grand enfant',
    ussd_yes_no: '1 Oui\n2 Non',
    ussd_invalid: 'Choix invalide.',
  },
  es: {
    sms_welcome: 'Health AI orienta, no diagnostica. Emergencia: llame al {num}.',
    sms_footer: 'Responda con más detalles. RESET = nueva conversación.',
    sms_reset: 'Nueva conversación. Describa los síntomas: quién está enfermo, su edad y desde cuándo.',
    sms_help: 'Envíe los síntomas (quién, edad, desde cuándo). RESET = nueva conversación. Emergencia: llame al {num}.',
    sms_limit: 'Demasiados mensajes. Inténtelo más tarde. Emergencia: llame al {num}.',
    sms_error: 'Lo sentimos, hubo un error. Si está preocupado, vaya a un centro de salud o llame al {num}.',
    call_now: 'Llame al {num} ahora.',
    voice_greeting: 'Bienvenido a Health AI. Doy orientación, no un diagnóstico. En una emergencia, cuelgue y llame al {num}. Describa los síntomas: quién está enfermo, su edad y desde cuándo.',
    voice_wait: 'Gracias. Un momento por favor.',
    voice_no_input: 'Lo siento, no escuché nada. Describa los síntomas.',
    voice_goodbye: 'Si empeora, vuelva a llamar o vaya a un centro de salud. Adiós.',
    voice_hangup_call: 'Por favor cuelgue ahora y llame al {num}.',
    voice_connect: 'Le comunico con un trabajador de salud.',
    ussd_who: '¿Quién está enfermo?\n1 Bebé menor de 2 meses\n2 Niño de 2 meses a 5 años\n3 Mujer embarazada\n4 Adulto o niño mayor',
    ussd_yes_no: '1 Sí\n2 No',
    ussd_invalid: 'Opción no válida.',
  },
  pt: {
    sms_welcome: 'Health AI orienta, não faz diagnóstico. Emergência: ligue {num}.',
    sms_footer: 'Responda com mais detalhes. RESET = nova conversa.',
    sms_reset: 'Nova conversa. Descreva os sintomas: quem está doente, a idade e há quanto tempo.',
    sms_help: 'Envie os sintomas (quem, idade, há quanto tempo). RESET = nova conversa. Emergência: ligue {num}.',
    sms_limit: 'Mensagens demais. Tente mais tarde. Emergência: ligue {num}.',
    sms_error: 'Desculpe, ocorreu um erro. Se estiver preocupado, vá a um posto de saúde ou ligue {num}.',
    call_now: 'Ligue {num} agora.',
    voice_greeting: 'Bem-vindo ao Health AI. Dou orientação, não diagnóstico. Em uma emergência, desligue e ligue {num}. Descreva os sintomas: quem está doente, a idade e há quanto tempo.',
    voice_wait: 'Obrigado. Um momento, por favor.',
    voice_no_input: 'Desculpe, não ouvi nada. Descreva os sintomas.',
    voice_goodbye: 'Se piorar, ligue de novo ou vá a um posto de saúde. Até logo.',
    voice_hangup_call: 'Desligue agora e ligue {num}.',
    voice_connect: 'Vou ligar você a um profissional de saúde.',
    ussd_who: 'Quem está doente?\n1 Bebê com menos de 2 meses\n2 Criança de 2 meses a 5 anos\n3 Gestante\n4 Adulto ou criança maior',
    ussd_yes_no: '1 Sim\n2 Não',
    ussd_invalid: 'Opção inválida.',
  },
  ar: {
    sms_welcome: 'Health AI يقدم إرشادات وليس تشخيصًا. في الطوارئ اتصل بالرقم {num}.',
    sms_footer: 'أرسل مزيدًا من التفاصيل. RESET = محادثة جديدة.',
    sms_reset: 'بدأت محادثة جديدة. صف الأعراض: من المريض، وكم عمره، ومنذ متى.',
    sms_help: 'أرسل الأعراض (من المريض، العمر، منذ متى). RESET = محادثة جديدة. الطوارئ: اتصل بالرقم {num}.',
    sms_limit: 'رسائل كثيرة جدًا. حاول لاحقًا. الطوارئ: اتصل بالرقم {num}.',
    sms_error: 'عذرًا، حدث خطأ. إذا كنت قلقًا، اذهب إلى مركز صحي أو اتصل بالرقم {num}.',
    call_now: 'اتصل بالرقم {num} الآن.',
    voice_greeting: 'مرحبًا بك في Health AI. أقدم إرشادات وليس تشخيصًا. في حالة الطوارئ، أغلق الخط واتصل بالرقم {num}. صف الأعراض: من المريض، وكم عمره، ومنذ متى.',
    voice_wait: 'شكرًا. لحظة من فضلك.',
    voice_no_input: 'عذرًا، لم أسمع شيئًا. صف الأعراض من فضلك.',
    voice_goodbye: 'إذا ساءت الحالة، اتصل مرة أخرى أو اذهب إلى مركز صحي. مع السلامة.',
    voice_hangup_call: 'أغلق الخط الآن واتصل بالرقم {num}.',
    voice_connect: 'سأوصلك الآن بعامل صحي.',
    ussd_who: 'من المريض؟\n1 رضيع أقل من شهرين\n2 طفل من شهرين إلى 5 سنوات\n3 امرأة حامل\n4 بالغ أو طفل أكبر',
    ussd_yes_no: '1 نعم\n2 لا',
    ussd_invalid: 'اختيار غير صحيح.',
  },
};

export function say(lang, key, vars = {}) {
  const text = S[lang]?.[key] ?? S.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Multilingual menus shown before a language is known.
export const LANGUAGE_MENU = [
  ['en', 'For English press 1.'],
  ['sw', 'Kwa Kiswahili bonyeza 2.'],
  ['fr', 'Pour le français, tapez 3.'],
  ['es', 'Para español, marque 4.'],
  ['pt', 'Para português, digite 5.'],
  ['ar', 'للعربية اضغط 6.'],
];
export const USSD_LANGUAGE_MENU = 'Health AI\n1 English\n2 Kiswahili\n3 Francais\n4 Espanol\n5 Portugues';
export const USSD_LANGUAGES = ['en', 'sw', 'fr', 'es', 'pt'];

// Keywords that reset a conversation or ask for help, in all channel languages.
export const RESET_WORDS = new Set(['reset', 'restart', 'new', 'anza', 'upya', 'nouveau', 'nuevo', 'novo', 'جديد']);
export const HELP_WORDS = new Set(['help', 'msaada', 'aide', 'ayuda', 'ajuda', 'مساعدة']);
