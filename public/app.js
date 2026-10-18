import { t, setLanguage, getLanguage, UI_LANGUAGES, SPEECH_LANG } from './i18n.js';
import { offlineTriage, safetyAssessment } from '/shared/safety.js';
import { LEVEL_INFO, LEVELS } from '/shared/levels.js';
import { PROTOCOLS, getProtocol, suggestProtocol } from '/shared/protocols.js';

// ---------------------------------------------------------------- utilities

const $ = (sel) => document.querySelector(sel);
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`hai.${key}`);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`hai.${key}`, JSON.stringify(value));
    } catch {
      /* storage unavailable: settings last for this session only */
    }
  },
};

/** Build DOM safely (AI output is always inserted as text, never as HTML). */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style') node.setAttribute('style', v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

function toast(msg) {
  const n = el('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(n);
  setTimeout(() => n.remove(), 2600);
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const ROLE_RANK = { public: 0, chw: 1, clinician: 2, admin: 3 };

const state = {
  config: null,
  role: 'public',
  token: store.get('token', ''),
  voiceOut: store.get('voiceOut', true),
  messages: [],
  chw: { screen: 'list', patients: store.get('patients', []), patient: null, answers: {}, vitals: {}, protocolId: null, notes: '', result: null },
  scan: { kind: 'rdt', blob: null, result: null },
  reviewFilter: 'pending',
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function api(path, { method = 'GET', body, form, raw } = {}) {
  const headers = {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(msg, res.status);
  }
  return raw ? res : res.json();
}

const isNetworkError = (err) => !(err instanceof ApiError);
const levelLabel = (level) => LEVEL_INFO[level]?.label[getLanguage()] ?? LEVEL_INFO[level]?.label.en ?? level;
const levelAction = (level) => LEVEL_INFO[level]?.action[getLanguage()] ?? LEVEL_INFO[level]?.action.en ?? '';

// ---------------------------------------------------------------- i18n & navigation

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((n) => (n.textContent = t(n.dataset.i18n)));
  document.querySelectorAll('[data-i18n-placeholder]').forEach((n) => (n.placeholder = t(n.dataset.i18nPlaceholder)));
  $('#mic').setAttribute('aria-label', t('tap_to_speak'));
}

function showTab(name) {
  const btn = document.querySelector(`.tabs button[data-tab="${name}"]`);
  if (!btn || btn.hidden) name = 'talk';
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.dataset.view !== name));
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === name ? 'page' : 'false'));
  store.set('tab', name);
  if (name === 'chw') renderChw();
  if (name === 'review') loadReview();
  if (name === 'scan') renderScanPatients();
}

function applyRole() {
  document.querySelectorAll('.tabs button[data-role]').forEach((b) => (b.hidden = ROLE_RANK[state.role] < ROLE_RANK[b.dataset.role]));
  $('#set-role').textContent = state.role === 'admin' && !state.config?.authEnabled ? 'development (full access)' : state.role;
}

async function loadConfig() {
  try {
    state.config = await api('/api/config');
    store.set('config', state.config);
  } catch {
    state.config = store.get('config', { mockAi: true, emergencyNumber: '112', authEnabled: false, role: 'public' });
  }
  state.role = state.config.role ?? 'public';
  $('#set-emergency').textContent = state.config.emergencyNumber;
  const demo = $('#badge-demo');
  demo.hidden = !state.config.mockAi;
  demo.textContent = t('demo_badge');
  applyRole();
}

function updateOnline() {
  $('#badge-offline').hidden = navigator.onLine;
}

// ---------------------------------------------------------------- voice

const voice = {
  recorder: null,
  recognition: null,
  active: false,
  audio: null,

  serverAvailable() {
    return !state.config?.mockAi && navigator.onLine && window.MediaRecorder && navigator.mediaDevices?.getUserMedia;
  },
  localAvailable() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  /** Start capturing speech. onText(text) receives the transcript; onState(s) gets 'listening'|'busy'|'idle'. */
  async start(onText, onState) {
    this.stopSpeaking();
    if (this.serverAvailable()) {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        if (!this.localAvailable()) return toast(t('mic_denied'));
        return this.startLocal(onText, onState);
      }
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m));
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        this.active = false;
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 1200) return onState('idle');
        onState('busy');
        try {
          const form = new FormData();
          const ext = (rec.mimeType || '').includes('mp4') ? 'm4a' : (rec.mimeType || '').includes('ogg') ? 'ogg' : 'webm';
          form.append('audio', blob, `speech.${ext}`);
          form.append('language', getLanguage());
          const { text } = await api('/api/voice/transcribe', { method: 'POST', form });
          onState('idle');
          if (text) onText(text);
        } catch (err) {
          onState('idle');
          toast(err.message);
        }
      };
      rec.start();
      this.recorder = rec;
      this.active = true;
      onState('listening');
      this.timer = setTimeout(() => this.stop(), 60_000);
      return;
    }
    if (this.localAvailable()) return this.startLocal(onText, onState);
    toast(t('mic_denied'));
  },

  startLocal(onText, onState) {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new Ctor();
    r.lang = SPEECH_LANG[getLanguage()] ?? 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim();
      if (text) onText(text);
    };
    r.onerror = (e) => e.error === 'not-allowed' && toast(t('mic_denied'));
    r.onend = () => {
      this.active = false;
      onState('idle');
    };
    r.start();
    this.recognition = r;
    this.active = true;
    onState('listening');
  },

  stop() {
    clearTimeout(this.timer);
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.recognition?.stop();
    this.recorder = null;
    this.recognition = null;
  },

  async speak(text) {
    if (!state.voiceOut || !text) return;
    this.stopSpeaking();
    if (!state.config?.mockAi && navigator.onLine) {
      try {
        const res = await api('/api/voice/speak', { method: 'POST', body: { text, language: getLanguage() }, raw: true });
        const url = URL.createObjectURL(await res.blob());
        this.audio = new Audio(url);
        this.audio.onended = () => URL.revokeObjectURL(url);
        await this.audio.play();
        return;
      } catch {
        /* fall back to on-device speech */
      }
    }
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = SPEECH_LANG[getLanguage()] ?? 'en-US';
      u.rate = 0.95;
      speechSynthesis.speak(u);
    }
  },

  stopSpeaking() {
    this.audio?.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  },
};

// ---------------------------------------------------------------- triage (shared by Talk and CHW)

/** Turn a local rules-only result into the same shape the server returns. */
function localResult(input, aiError) {
  const text = input.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
  const off = offlineTriage({ text, patient: input.patient, vitals: input.vitals, protocol: input.protocol });
  const msgs = [...off.redFlags, ...off.vitals].map((f) => f.message);
  return {
    level: off.level,
    levelLabel: levelLabel(off.level),
    action: levelAction(off.level),
    overridden: false,
    overrideReasons: [],
    source: 'rules',
    offline: !aiError,
    aiError,
    assessment: {
      summary: msgs.join(' '),
      likely_conditions: [],
      advice: [],
      follow_up_questions: [],
      when_to_seek_care: '',
      referral_note: `Offline rules-only triage. Level: ${off.level}. Findings: ${msgs.join('; ') || 'none'}. ${off.protocol?.positives?.length ? `Protocol positives: ${off.protocol.positives.map((p) => p.text).join('; ')}` : ''}`.trim(),
      confidence: 'low',
      spoken_response: levelAction(off.level),
    },
    safety: off,
    emergencyNumber: state.config?.emergencyNumber ?? '112',
  };
}

async function triage(input) {
  if (!navigator.onLine) return localResult(input);
  try {
    return await api('/api/triage', { method: 'POST', body: input });
  } catch (err) {
    if (isNetworkError(err)) return localResult(input);
    if (err.status >= 500 || err.status === 429) return localResult(input, err.message);
    throw err;
  }
}

function renderResult(r, { chw = false, onSave } = {}) {
  const a = r.assessment ?? {};
  const findings = [...(r.safety?.redFlags ?? []), ...(r.safety?.vitals ?? [])];
  const card = el('div', { class: `card result lvl-${r.level}` },
    el('div', { class: 'level' }, el('span', { class: 'dot' }), r.levelLabel ?? levelLabel(r.level)),
    (r.source === 'rules') && el('div', { class: 'chips' }, el('span', { class: 'chip' }, r.offline ? t('offline_badge') : t('ai_error'))),
    r.overridden && el('div', { class: 'chips' }, el('span', { class: 'chip alert', title: (r.overrideReasons ?? []).join(' ') }, t('raised_by_rules'))),
    el('p', { class: 'action' }, r.action ?? levelAction(r.level)),
    r.level === 'emergency' && el('a', { class: 'btn danger block emergency-call', href: `tel:${r.emergencyNumber ?? state.config?.emergencyNumber ?? '112'}` }, `📞 ${t('call_emergency')} (${r.emergencyNumber ?? state.config?.emergencyNumber ?? '112'})`),
    a.summary && el('p', {}, a.summary),
    a.advice?.length > 0 && [el('h3', {}, t('what_to_do')), el('ul', {}, a.advice.map((x) => el('li', {}, x)))],
    a.when_to_seek_care && [el('h3', {}, t('seek_care_if')), el('p', {}, a.when_to_seek_care)],
    findings.length > 0 && [el('h3', {}, t('safety_found')), el('ul', {}, findings.map((f) => el('li', {}, f.message)))],
  );
  if (a.likely_conditions?.length) {
    card.append(el('details', {},
      el('summary', {}, t('why')),
      el('h3', {}, t('possible_causes')),
      el('ul', {}, a.likely_conditions.map((c) => el('li', {}, el('strong', {}, c.name), ` (${c.likelihood}) — ${c.rationale}`))),
      el('p', { class: 'muted small' }, `${t('confidence')}: ${a.confidence}${r.aiLevel ? ` · ${t('ai_label')}: ${levelLabel(r.aiLevel)}` : ''}`),
    ));
  }
  if (chw) {
    const guidance = r.safety?.protocol?.guidance;
    if (guidance) card.append(el('h3', {}, t('chw_guidance')), el('p', {}, guidance));
    if (a.referral_note) {
      card.append(
        el('h3', {}, t('referral_note')),
        el('div', { class: 'note' }, a.referral_note),
        el('div', { class: 'row', style: 'margin-top:.5rem' },
          el('button', { class: 'btn small', type: 'button', onclick: () => navigator.clipboard?.writeText(a.referral_note).then(() => toast(t('copied'))) }, t('copy')),
          onSave && el('button', { class: 'btn primary small', type: 'button', onclick: onSave }, t('save_encounter')),
        ),
      );
    }
  }
  card.append(el('p', { class: 'muted small' }, t('disclaimer')));
  return card;
}

// ---------------------------------------------------------------- Talk view

function patientContext() {
  const years = $('#p-age').value;
  const months = $('#p-months').value;
  const ageYears = years !== '' ? Number(years) : months !== '' ? Number(months) / 12 : undefined;
  return { ageYears, sex: $('#p-sex').value || undefined, pregnant: $('#p-pregnant').checked };
}

function addBubble(role, text, extra) {
  const b = el('div', { class: `msg ${role}` }, text);
  $('#chat').append(b);
  if (extra) $('#chat').append(extra);
  b.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return b;
}

async function sendUserText(text) {
  text = text.trim();
  if (!text) return;
  $('#talk-intro').hidden = true;
  state.messages.push({ role: 'user', content: text });
  addBubble('user', text);
  const pending = addBubble('assistant pending', t('thinking'));
  setMic('busy');
  try {
    const r = await triage({ messages: state.messages, patient: patientContext(), language: getLanguage(), mode: 'self' });
    pending.remove();
    const a = r.assessment;
    const reply = [a.spoken_response, ...(a.follow_up_questions ?? []).filter((q) => !a.spoken_response?.includes(q))].filter(Boolean).join('\n');
    state.messages.push({ role: 'assistant', content: reply });
    $('#chat').querySelectorAll('.result').forEach((n) => n.remove());
    const bubble = addBubble('assistant', reply, renderResult(r));
    bubble.nextSibling?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    voice.speak(a.spoken_response);
  } catch (err) {
    pending.remove();
    addBubble('assistant', err.message);
  } finally {
    setMic('idle');
  }
}

function setMic(s) {
  const mic = $('#mic');
  mic.classList.toggle('recording', s === 'listening');
  mic.classList.toggle('busy', s === 'busy');
  $('#mic-label').textContent = t(s === 'listening' ? 'listening' : s === 'busy' ? 'thinking' : 'tap_to_speak');
}

function initTalk() {
  $('#mic').addEventListener('click', () => {
    if (voice.active) return voice.stop();
    if ($('#mic').classList.contains('busy')) return;
    voice.start(sendUserText, setMic);
  });
  $('#text-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#text-input').value;
    $('#text-input').value = '';
    sendUserText(v);
  });
  $('#reset-chat').addEventListener('click', () => {
    voice.stopSpeaking();
    state.messages = [];
    $('#chat').replaceChildren();
    $('#talk-intro').hidden = false;
  });
  $('#p-sex').addEventListener('change', () => ($('#p-pregnant-wrap').hidden = $('#p-sex').value === 'male'));
}

// ---------------------------------------------------------------- CHW view

const queue = {
  items: () => store.get('queue', []),
  add(item) {
    store.set('queue', [...this.items(), item]);
    updateSyncBadge();
  },
  async flush() {
    const items = this.items();
    if (!items.length || !navigator.onLine) return;
    const remaining = [];
    for (const item of items) {
      try {
        await api('/api/encounters', { method: 'POST', body: item });
      } catch (err) {
        // Keep for retry on network errors; drop items the server rejects as invalid.
        if (isNetworkError(err) || err.status >= 500 || err.status === 401) remaining.push(item);
      }
    }
    store.set('queue', remaining);
    updateSyncBadge();
    if (items.length !== remaining.length) toast(`${t('saved')}: ${items.length - remaining.length}`);
  },
};

function updateSyncBadge() {
  const n = queue.items().length;
  const b = $('#badge-sync');
  b.hidden = n === 0;
  b.textContent = `${n} ${t('pending_sync')}`;
}

async function refreshPatients(q = '') {
  try {
    state.chw.patients = await api(`/api/patients?q=${encodeURIComponent(q)}`);
    if (!q) store.set('patients', state.chw.patients);
  } catch (err) {
    if (!isNetworkError(err)) toast(err.message);
  }
}

function renderChw() {
  const view = $('#view-chw');
  const c = state.chw;
  view.replaceChildren();
  if (c.screen === 'list') view.append(chwList());
  else if (c.screen === 'new') view.append(chwNewPatient());
  else if (c.screen === 'patient') view.append(chwPatient());
  else if (c.screen === 'assess') view.append(chwAssess());
}

function goChw(screen) {
  state.chw.screen = screen;
  renderChw();
  window.scrollTo(0, 0);
}

function chwList() {
  const list = el('div', { class: 'list' });
  const draw = () =>
    list.replaceChildren(
      ...(state.chw.patients.length
        ? state.chw.patients.map((p) =>
            el('button', { class: 'item', type: 'button', onclick: () => openPatient(p.id) },
              el('div', {}, el('strong', {}, p.displayName), el('div', { class: 'muted small' }, [p.ageYears !== null && p.ageYears !== undefined ? `${formatAge(p.ageYears)}` : '', p.sex ? t(p.sex) : '', p.village].filter(Boolean).join(' · '))),
              p.lastLevel && el('span', { class: `pill lvl-${p.lastLevel}` }, levelLabel(p.lastLevel)),
            ))
        : [el('p', { class: 'muted' }, t('no_items'))]),
    );
  draw();
  let timer;
  const search = el('input', {
    type: 'search', placeholder: t('search'),
    oninput: (e) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await refreshPatients(e.target.value);
        draw();
      }, 250);
    },
  });
  refreshPatients().then(draw);
  return el('div', {},
    el('div', { class: 'toolbar' }, el('h1', {}, t('patients')), el('button', { class: 'btn primary', type: 'button', onclick: () => goChw('new') }, `+ ${t('new_patient')}`)),
    search,
    el('div', { style: 'height:.6rem' }),
    el('button', { class: 'btn block', type: 'button', onclick: () => startAssessment(null) }, `${t('start_assessment')} (${t('none')})`),
    el('div', { style: 'height:.6rem' }),
    list,
  );
}

function formatAge(y) {
  if (y < 1) return `${Math.round(y * 12)} mo`;
  return `${Math.round(y * 10) / 10} y`;
}

function chwNewPatient() {
  const f = {
    name: el('input', { required: true, autocomplete: 'off' }),
    age: el('input', { type: 'number', min: 0, max: 130, step: 'any', inputmode: 'decimal' }),
    months: el('input', { type: 'number', min: 0, max: 59, inputmode: 'numeric' }),
    sex: el('select', {}, el('option', { value: '' }), ...['female', 'male', 'other'].map((s) => el('option', { value: s }, t(s)))),
    pregnant: el('input', { type: 'checkbox' }),
    village: el('input', {}),
  };
  const form = el('form', {
    class: 'card',
    onsubmit: async (e) => {
      e.preventDefault();
      const ageYears = f.age.value !== '' ? Number(f.age.value) : f.months.value !== '' ? Number(f.months.value) / 12 : null;
      try {
        const p = await api('/api/patients', { method: 'POST', body: { displayName: f.name.value, ageYears, sex: f.sex.value || null, pregnant: f.pregnant.checked, village: f.village.value } });
        await openPatient(p.id);
      } catch (err) {
        toast(isNetworkError(err) ? 'Connect to the internet to register a new patient. You can still do an assessment without a patient record.' : err.message);
      }
    },
  },
    el('h2', {}, t('new_patient')),
    el('label', {}, el('span', {}, t('name')), f.name),
    el('div', { class: 'grid3' }, el('label', {}, el('span', {}, t('age')), f.age), el('label', {}, el('span', {}, t('age_months')), f.months), el('label', {}, el('span', {}, t('sex')), f.sex)),
    el('label', { class: 'check' }, f.pregnant, t('pregnant')),
    el('label', {}, el('span', {}, t('village')), f.village),
    el('div', { class: 'row' }, el('button', { class: 'btn', type: 'button', onclick: () => goChw('list') }, t('cancel')), el('button', { class: 'btn primary', type: 'submit' }, t('save'))),
  );
  return form;
}

async function openPatient(id) {
  try {
    state.chw.patient = await api(`/api/patients/${id}`);
  } catch (err) {
    const cached = state.chw.patients.find((p) => p.id === id);
    if (!cached) return toast(err.message);
    state.chw.patient = { ...cached, encounters: [] };
  }
  goChw('patient');
}

function chwPatient() {
  const p = state.chw.patient;
  return el('div', {},
    el('button', { class: 'btn link', type: 'button', onclick: () => goChw('list') }, `← ${t('back')}`),
    el('div', { class: 'card' },
      el('h1', {}, p.displayName),
      el('p', { class: 'muted' }, [p.ageYears !== null && p.ageYears !== undefined ? formatAge(p.ageYears) : '', p.sex ? t(p.sex) : '', p.pregnant ? t('pregnant') : '', p.village].filter(Boolean).join(' · ')),
      el('button', { class: 'btn primary block', type: 'button', onclick: () => startAssessment(p) }, t('start_assessment')),
    ),
    el('h2', {}, t('history')),
    el('div', { class: 'list' },
      p.encounters?.length
        ? p.encounters.map((e) =>
            el('div', { class: 'item' },
              el('div', {},
                el('strong', {}, new Date(e.createdAt).toLocaleString()),
                el('div', { class: 'muted small' }, `${e.kind}${e.input?.protocol?.id ? ` · ${e.input.protocol.id}` : ''}${e.review?.status !== 'pending' ? ` · reviewed: ${levelLabel(e.review.level)}` : ''}`),
                e.review?.note && el('div', { class: 'small' }, `🩺 ${e.review.note}`),
              ),
              el('span', { class: `pill lvl-${e.level}` }, levelLabel(e.level)),
            ))
        : el('p', { class: 'muted' }, t('no_items')),
    ),
  );
}

function startAssessment(patient) {
  const c = state.chw;
  c.patient = patient;
  c.protocolId = suggestProtocol({ ageYears: patient?.ageYears ?? undefined, pregnant: patient?.pregnant });
  c.answers = {};
  c.vitals = {};
  c.notes = '';
  c.result = null;
  c.adhoc = patient ? null : { ageYears: undefined, sex: undefined, pregnant: false };
  goChw('assess');
}

const VITAL_FIELDS = { tempC: 'temp', heartRate: 'hr', respRate: 'rr', spo2: 'spo2', systolic: 'sys', diastolic: 'dia', glucoseMgDl: 'glu', muacMm: 'muac' };

function assessPatientContext() {
  const c = state.chw;
  const p = c.patient ?? c.adhoc;
  return { ageYears: p?.ageYears ?? undefined, sex: p?.sex ?? undefined, pregnant: Boolean(p?.pregnant) };
}

function chwAssess() {
  const c = state.chw;
  const protocol = getProtocol(c.protocolId);
  const lang = getLanguage();
  const live = el('div');
  const resultBox = el('div');

  const updateLive = () => {
    const s = safetyAssessment({ text: c.notes, patient: assessPatientContext(), vitals: c.vitals, protocol: { id: c.protocolId, answers: c.answers } });
    const hits = [...s.redFlags, ...s.vitals, ...s.protocol.positives.map((p) => ({ message: p.text, level: p.level }))];
    live.replaceChildren(
      s.level && rankOf(s.level) >= 2
        ? el('div', { class: `card result lvl-${s.level}`, role: 'alert' },
            el('div', { class: 'level' }, el('span', { class: 'dot' }), levelLabel(s.level)),
            el('p', { class: 'action' }, protocol.guidance[s.level]),
            el('ul', {}, hits.filter((h) => rankOf(h.level) >= 2).map((h) => el('li', {}, h.message))),
          )
        : '',
    );
  };

  const protocolSelect = el('select', {
    onchange: (e) => {
      c.protocolId = e.target.value;
      c.answers = {};
      renderChw();
    },
  }, PROTOCOLS.map((p) => el('option', { value: p.id, selected: p.id === c.protocolId }, p.title[lang] ?? p.title.en)));

  const questions = protocol.questions.map((q) => {
    const yes = el('button', { type: 'button', class: 'btn small yes', 'aria-pressed': String(c.answers[q.id] === true) }, t('yes'));
    const no = el('button', { type: 'button', class: 'btn small no', 'aria-pressed': String(c.answers[q.id] === false) }, t('no'));
    const set = (v) => {
      c.answers[q.id] = c.answers[q.id] === v ? undefined : v;
      yes.setAttribute('aria-pressed', String(c.answers[q.id] === true));
      no.setAttribute('aria-pressed', String(c.answers[q.id] === false));
      updateLive();
    };
    yes.onclick = () => set(true);
    no.onclick = () => set(false);
    return el('div', { class: 'q' }, el('span', {}, q.text[lang] ?? q.text.en), el('div', { class: 'yn' }, yes, no));
  });

  const vitals = protocol.vitals.map((k) =>
    el('label', {}, el('span', {}, t(VITAL_FIELDS[k])),
      el('input', { type: 'number', step: 'any', inputmode: 'decimal', value: c.vitals[k] ?? '', oninput: (e) => { c.vitals[k] = e.target.value; updateLive(); } })),
  );

  const notes = el('textarea', { rows: 3, oninput: (e) => { c.notes = e.target.value; updateLive(); } }, c.notes);
  const dictate = el('button', {
    type: 'button', class: 'btn small',
    onclick: () => {
      if (voice.active) return voice.stop();
      voice.start((text) => {
        notes.value = `${notes.value} ${text}`.trim();
        c.notes = notes.value;
        updateLive();
      }, (s) => (dictate.textContent = s === 'listening' ? `⏹ ${t('listening')}` : s === 'busy' ? t('transcribing') : `🎤 ${t('tap_to_speak')}`));
    },
  }, `🎤 ${t('tap_to_speak')}`);

  let adhocBox = '';
  if (c.adhoc) {
    const a = c.adhoc;
    adhocBox = el('div', { class: 'grid3' },
      el('label', {}, el('span', {}, t('age')), el('input', { type: 'number', min: 0, max: 130, step: 'any', value: a.ageYears ?? '', onchange: (e) => { a.ageYears = e.target.value === '' ? undefined : Number(e.target.value); c.protocolId = suggestProtocol(a); renderChw(); } })),
      el('label', {}, el('span', {}, t('sex')), el('select', { onchange: (e) => { a.sex = e.target.value || undefined; } }, el('option', { value: '' }), ['female', 'male', 'other'].map((s) => el('option', { value: s, selected: a.sex === s }, t(s))))),
      el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: a.pregnant, onchange: (e) => { a.pregnant = e.target.checked; c.protocolId = suggestProtocol(a); renderChw(); } }), t('pregnant')),
    );
  }

  const assessBtn = el('button', {
    class: 'btn primary block', type: 'button',
    onclick: async () => {
      assessBtn.disabled = true;
      assessBtn.textContent = t('thinking');
      const positives = protocol.questions.filter((q) => c.answers[q.id] === true).map((q) => q.text.en);
      const negatives = protocol.questions.filter((q) => c.answers[q.id] === false).map((q) => q.text.en);
      const content = [
        c.notes && `CHW notes: ${c.notes}`,
        `Protocol: ${protocol.title.en}.`,
        positives.length && `YES to: ${positives.join(' ')}`,
        negatives.length && `NO to: ${negatives.join(' ')}`,
      ].filter(Boolean).join('\n');
      const input = { messages: [{ role: 'user', content }], patient: assessPatientContext(), vitals: c.vitals, protocol: { id: c.protocolId, answers: c.answers }, language: lang, mode: 'chw', notes: c.notes };
      try {
        c.result = await triage(input);
        c.input = input;
        resultBox.replaceChildren(renderResult(c.result, { chw: true, onSave: saveEncounter }));
        resultBox.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        toast(err.message);
      } finally {
        assessBtn.disabled = false;
        assessBtn.textContent = t('assess');
      }
    },
  }, t('assess'));

  updateLive();
  if (c.result) resultBox.append(renderResult(c.result, { chw: true, onSave: saveEncounter }));

  return el('div', {},
    el('button', { class: 'btn link', type: 'button', onclick: () => (c.patient ? goChw('patient') : goChw('list')) }, `← ${t('back')}`),
    el('h1', {}, c.patient ? c.patient.displayName : t('start_assessment')),
    adhocBox,
    el('label', {}, el('span', {}, t('protocol')), protocolSelect),
    live,
    el('div', { class: 'card' }, questions),
    vitals.length > 0 && el('div', { class: 'card' }, el('h3', {}, t('vitals')), el('div', { class: 'grid2' }, vitals)),
    el('div', { class: 'card' }, el('div', { class: 'toolbar' }, el('span', { class: 'muted' }, t('notes')), dictate), notes),
    assessBtn,
    resultBox,
  );
}

const rankOf = (l) => LEVEL_INFO[l]?.rank ?? -1;

async function saveEncounter(kind = 'protocol') {
  const c = state.chw;
  if (!c.result) return;
  const payload = {
    clientId: uid(),
    createdAt: new Date().toISOString(),
    patientId: c.patient?.id ?? null,
    kind: typeof kind === 'string' ? kind : 'protocol',
    input: { ...c.input, patient: assessPatientContext() },
    result: c.result,
  };
  try {
    await api('/api/encounters', { method: 'POST', body: payload });
    toast(t('saved'));
  } catch (err) {
    if (!isNetworkError(err)) return toast(err.message);
    queue.add(payload);
    toast(t('queued'));
  }
  if (c.patient) openPatient(c.patient.id);
}

// ---------------------------------------------------------------- Scan view

const SCAN_KINDS = ['rdt', 'skin', 'wound', 'eye', 'other'];

function initScan() {
  const seg = $('#scan-kind');
  const drawSeg = () =>
    seg.replaceChildren(...SCAN_KINDS.map((k) =>
      el('button', { class: 'btn small', type: 'button', role: 'radio', 'aria-pressed': String(state.scan.kind === k), onclick: () => { state.scan.kind = k; drawSeg(); } }, t(`kind_${k}`))));
  drawSeg();
  state.scan.drawSeg = drawSeg;

  $('#scan-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.scan.blob = await downscale(file, 1600);
    const img = $('#scan-preview');
    img.src = URL.createObjectURL(state.scan.blob);
    img.hidden = false;
    $('#scan-go').disabled = false;
  });

  $('#scan-go').addEventListener('click', async () => {
    const btn = $('#scan-go');
    if (!navigator.onLine) return toast(t('offline_badge'));
    btn.disabled = true;
    btn.textContent = t('thinking');
    const patientId = $('#scan-patient').value;
    const patient = state.chw.patients.find((p) => p.id === patientId);
    const form = new FormData();
    form.append('image', state.scan.blob, 'photo.jpg');
    form.append('kind', state.scan.kind);
    form.append('notes', $('#scan-notes').value);
    form.append('language', getLanguage());
    if (patient) form.append('patient', JSON.stringify({ ageYears: patient.ageYears, sex: patient.sex, pregnant: patient.pregnant }));
    try {
      const r = await api('/api/diagnostics/image', { method: 'POST', form });
      state.scan.result = r;
      $('#scan-result').replaceChildren(renderScanResult(r, patient));
      $('#scan-result').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = t('analyze');
    }
  });
}

function renderScanResult(r, patient) {
  const a = r.assessment;
  const card = el('div', { class: `card result lvl-${r.level}` },
    el('div', { class: 'level' }, el('span', { class: 'dot' }), r.levelLabel),
    r.overridden && el('div', { class: 'chips' }, el('span', { class: 'chip alert', title: r.overrideReasons.join(' ') }, t('raised_by_rules'))),
    a.rdt_result !== 'not_applicable' && el('p', {}, `${t('rdt_result')}: `, el('span', { class: 'rdt' }, a.rdt_result)),
    el('p', { class: 'muted small' }, `${t('image_quality')}: ${a.image_quality} · ${t('confidence')}: ${a.confidence}`),
    ['poor', 'unusable'].includes(a.image_quality) && a.retake_advice && el('p', { class: 'chip alert' }, a.retake_advice),
    el('p', {}, a.summary),
    a.findings.length > 0 && [el('h3', {}, t('findings')), el('ul', {}, a.findings.map((f) => el('li', {}, f)))],
    a.possible_conditions.length > 0 && [el('h3', {}, t('possible_causes')), el('ul', {}, a.possible_conditions.map((c) => el('li', {}, el('strong', {}, c.name), ` (${c.likelihood}) — ${c.rationale}`)))],
    a.recommendations.length > 0 && [el('h3', {}, t('recommendations')), el('ul', {}, a.recommendations.map((f) => el('li', {}, f)))],
    el('p', { class: 'muted small' }, r.disclaimer),
  );
  if (ROLE_RANK[state.role] >= ROLE_RANK.chw) {
    card.append(el('button', {
      class: 'btn primary small', type: 'button',
      onclick: async () => {
        state.chw.patient = patient ?? null;
        state.chw.adhoc = null;
        state.chw.result = r;
        state.chw.input = { kind: r.kind, notes: $('#scan-notes').value, patient: patient ? { ageYears: patient.ageYears, sex: patient.sex, pregnant: patient.pregnant } : {} };
        await saveEncounter('image');
      },
    }, t('save_encounter')));
  }
  return card;
}

function renderScanPatients() {
  const sel = $('#scan-patient');
  const current = sel.value;
  sel.replaceChildren(el('option', { value: '' }, t('none')), ...state.chw.patients.map((p) => el('option', { value: p.id, selected: p.id === current }, p.displayName)));
}

/** Resize and re-encode images on-device to save bandwidth (and strip EXIF location data). */
async function downscale(file, max) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

// ---------------------------------------------------------------- Review view

async function loadReview() {
  const seg = $('#review-filter');
  seg.replaceChildren(...['pending', 'all'].map((f) =>
    el('button', { class: 'btn small', type: 'button', 'aria-pressed': String(state.reviewFilter === f), onclick: () => { state.reviewFilter = f; loadReview(); } }, t(f))));
  try {
    const [m, items] = await Promise.all([api('/api/metrics'), api(`/api/review?status=${state.reviewFilter}`)]);
    const pct = (v) => (v === null ? '—' : `${v}%`);
    $('#metrics').replaceChildren(
      ...[
        [m.encounters, 'Encounters'],
        [m.pendingReview, 'Awaiting review'],
        [pct(m.clinicianAgreementPct), 'Clinician agreement'],
        [pct(m.underTriagePct), 'Under-triage (reviewed)'],
        [pct(m.overTriagePct), 'Over-triage (reviewed)'],
        [pct(m.safetyOverridePct), 'Safety-rule overrides'],
        [pct(m.aiFallbackPct), 'AI fallbacks'],
      ].map(([v, label]) => el('div', { class: 'metric' }, el('b', {}, v), el('span', {}, label))),
    );
    $('#review-list').replaceChildren(...(items.length ? items.map(reviewItem) : [el('p', { class: 'muted' }, t('no_items'))]));
  } catch (err) {
    $('#review-list').replaceChildren(el('p', { class: 'muted' }, err.message));
  }
}

function reviewItem(e) {
  const a = e.result?.assessment ?? {};
  const levelSel = el('select', {}, LEVELS.slice().reverse().map((l) => el('option', { value: l, selected: l === e.level }, levelLabel(l))));
  const note = el('textarea', { rows: 2, placeholder: t('review_note') });
  const outcome = el('input', { placeholder: t('outcome') });
  const submit = async (decision) => {
    try {
      await api(`/api/review/${e.id}`, { method: 'POST', body: { decision, level: levelSel.value, note: note.value, outcome: outcome.value } });
      toast(t('saved'));
      loadReview();
    } catch (err) {
      toast(err.message);
    }
  };
  const findings = [...(e.result?.safety?.redFlags ?? []), ...(e.result?.safety?.vitals ?? [])];
  return el('details', { class: `card result lvl-${e.level}` },
    el('summary', {},
      el('span', { class: `pill lvl-${e.level}` }, levelLabel(e.level)), ' ',
      el('strong', {}, e.patientName ?? 'Anonymous'), ' · ', e.kind, ' · ', new Date(e.createdAt).toLocaleString(),
      e.overridden ? ' · ⚠ rules override' : '',
      e.review.status !== 'pending' ? ` · ✓ ${e.review.status}` : ''),
    el('p', { class: 'muted small' }, `Source: ${e.result?.source ?? '?'} · AI level: ${e.aiLevel ?? '—'} · Confidence: ${e.confidence ?? '—'} · By: ${e.createdBy ?? '—'}`),
    findings.length > 0 && el('ul', {}, findings.map((f) => el('li', {}, `[${f.level}] ${f.message}`))),
    a.referral_note && el('div', { class: 'note' }, a.referral_note),
    a.summary && el('p', {}, a.summary),
    e.review.status !== 'pending'
      ? el('p', {}, `Reviewed ${new Date(e.review.at).toLocaleString()} by ${e.review.by}: ${levelLabel(e.review.level)}${e.review.note ? ` — ${e.review.note}` : ''}`)
      : el('div', {},
          el('label', {}, el('span', {}, t('modify')), levelSel),
          note, outcome,
          el('div', { class: 'row', style: 'margin-top:.5rem' },
            el('button', { class: 'btn primary', type: 'button', onclick: () => submit('agree') }, `✓ ${t('agree')}`),
            el('button', { class: 'btn', type: 'button', onclick: () => submit('modify') }, t('modify'))),
        ),
  );
}

// ---------------------------------------------------------------- Settings & boot

function initSettings() {
  const sel = $('#set-lang');
  sel.replaceChildren(...Object.entries(UI_LANGUAGES).map(([code, name]) => el('option', { value: code, selected: code === getLanguage() }, name)));
  sel.addEventListener('change', () => {
    setLanguage(sel.value);
    store.set('lang', sel.value);
    applyI18n();
    state.scan.drawSeg?.();
    $('#badge-demo').textContent = t('demo_badge');
    updateSyncBadge();
  });
  $('#set-voice').checked = state.voiceOut;
  $('#set-voice').addEventListener('change', (e) => {
    state.voiceOut = e.target.checked;
    store.set('voiceOut', state.voiceOut);
    if (!state.voiceOut) voice.stopSpeaking();
  });
  $('#set-token').value = state.token;
  $('#set-token-apply').addEventListener('click', async () => {
    state.token = $('#set-token').value.trim();
    store.set('token', state.token);
    await loadConfig();
    toast(`${t('role')}: ${state.role}`);
  });
}

async function boot() {
  const browserLang = (navigator.language || 'en').slice(0, 2);
  setLanguage(store.get('lang', UI_LANGUAGES[browserLang] ? browserLang : 'en'));
  applyI18n();
  initTalk();
  initScan();
  initSettings();
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $('#badge-sync').addEventListener('click', () => queue.flush());
  window.addEventListener('online', () => {
    updateOnline();
    queue.flush();
  });
  window.addEventListener('offline', updateOnline);
  updateOnline();
  updateSyncBadge();
  await loadConfig();
  showTab(store.get('tab', 'talk'));
  queue.flush();
  if (!store.get('consented', false)) {
    const d = $('#consent');
    d.addEventListener('close', () => store.set('consented', true), { once: true });
    d.showModal();
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot();
