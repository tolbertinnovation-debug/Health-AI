// Triage levels, ordered from least to most severe. Shared by server and browser.

export const LEVELS = ['self_care', 'routine', 'urgent', 'emergency'];

export const LEVEL_INFO = {
  emergency: {
    rank: 3,
    color: '#b00020',
    label: {
      en: 'Emergency — get help now',
      es: 'Emergencia — busque ayuda ahora',
      fr: 'Urgence — obtenez de l’aide maintenant',
      sw: 'Dharura — tafuta msaada sasa',
      pt: 'Emergência — procure ajuda agora',
      ar: 'طوارئ — اطلب المساعدة الآن',
    },
    action: {
      en: 'Call emergency services or go to the nearest hospital immediately.',
      es: 'Llame a emergencias o vaya al hospital más cercano de inmediato.',
      fr: 'Appelez les urgences ou allez immédiatement à l’hôpital le plus proche.',
      sw: 'Piga simu ya dharura au nenda hospitali iliyo karibu mara moja.',
      pt: 'Ligue para a emergência ou vá imediatamente ao hospital mais próximo.',
      ar: 'اتصل بالإسعاف أو اذهب إلى أقرب مستشفى فورًا.',
    },
  },
  urgent: {
    rank: 2,
    color: '#c75c00',
    label: {
      en: 'Urgent — be seen today',
      es: 'Urgente — consulte hoy',
      fr: 'Urgent — consultez aujourd’hui',
      sw: 'Haraka — muone mhudumu wa afya leo',
      pt: 'Urgente — seja atendido hoje',
      ar: 'عاجل — راجع الطبيب اليوم',
    },
    action: {
      en: 'See a health worker or clinic within the next few hours (today).',
      es: 'Consulte a un trabajador de salud o clínica en las próximas horas (hoy).',
      fr: 'Consultez un agent de santé ou une clinique dans les prochaines heures (aujourd’hui).',
      sw: 'Muone mhudumu wa afya au kliniki ndani ya saa chache (leo).',
      pt: 'Procure um profissional de saúde ou posto de saúde nas próximas horas (hoje).',
      ar: 'راجع عاملًا صحيًا أو عيادة خلال الساعات القليلة القادمة (اليوم).',
    },
  },
  routine: {
    rank: 1,
    color: '#1d5fa8',
    label: {
      en: 'See a health worker soon',
      es: 'Consulte pronto',
      fr: 'Consultez bientôt',
      sw: 'Muone mhudumu wa afya hivi karibuni',
      pt: 'Procure um profissional de saúde em breve',
      ar: 'راجع عاملًا صحيًا قريبًا',
    },
    action: {
      en: 'Arrange a visit with a health worker or clinic in the next few days.',
      es: 'Programe una visita con un trabajador de salud en los próximos días.',
      fr: 'Prévoyez une visite chez un agent de santé dans les prochains jours.',
      sw: 'Panga kumuona mhudumu wa afya ndani ya siku chache.',
      pt: 'Marque uma consulta com um profissional de saúde nos próximos dias.',
      ar: 'رتّب زيارة لعامل صحي أو عيادة خلال الأيام القليلة القادمة.',
    },
  },
  self_care: {
    rank: 0,
    color: '#1b7a3d',
    label: {
      en: 'Self-care at home',
      es: 'Cuidado en casa',
      fr: 'Soins à domicile',
      sw: 'Kujihudumia nyumbani',
      pt: 'Cuidados em casa',
      ar: 'رعاية ذاتية في المنزل',
    },
    action: {
      en: 'This can usually be managed at home. Seek care if it gets worse or does not improve.',
      es: 'Normalmente se puede manejar en casa. Busque atención si empeora o no mejora.',
      fr: 'Cela peut généralement être géré à domicile. Consultez si cela s’aggrave ou ne s’améliore pas.',
      sw: 'Kwa kawaida hili linaweza kushughulikiwa nyumbani. Tafuta huduma likizidi au lisipopona.',
      pt: 'Normalmente pode ser tratado em casa. Procure atendimento se piorar ou não melhorar.',
      ar: 'يمكن عادةً التعامل مع هذا في المنزل. اطلب الرعاية إذا ساءت الحالة أو لم تتحسن.',
    },
  },
};

export function rank(level) {
  return LEVEL_INFO[level]?.rank ?? -1;
}

/** Return the most severe of the given levels (ignores unknown/empty values). */
export function maxLevel(...levels) {
  let best = null;
  for (const l of levels.flat()) {
    if (rank(l) > rank(best)) best = l;
  }
  return best;
}

export function isValidLevel(level) {
  return LEVELS.includes(level);
}
