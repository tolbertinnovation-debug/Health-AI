// Basic-phone access: SMS conversations, USSD danger-sign menus and voice-call triage.
// Works with Twilio (SMS + voice), Africa's Talking (SMS + USSD) and any SMS gateway that
// can POST JSON. Phone numbers are never stored — only a keyed hash.

import express from 'express';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { runTriage } from '../triage.js';
import { speak } from '../openai.js';
import { redact } from '../privacy.js';
import { normalize } from '../../shared/redflags.js';
import { LEVEL_INFO, rank } from '../../shared/levels.js';
import { getProtocol, evaluateProtocol } from '../../shared/protocols.js';
import {
  say, TWILIO_LANG, LANGUAGE_MENU, USSD_LANGUAGE_MENU, USSD_LANGUAGES, RESET_WORDS, HELP_WORDS, CHANNEL_LANGUAGES,
} from './strings.js';

const MAX_SMS_CHARS = 640;
const MAX_VOICE_TURNS = 4;

let warnedSecret = false;
const fallbackSecret = crypto.randomBytes(32).toString('hex');
function sessionId(channel, address) {
  if (!config.channels.secret && !warnedSecret) {
    warnedSecret = true;
    console.warn('⚠  CHANNEL_SECRET not set: SMS/voice sessions will not survive a restart.');
  }
  return crypto.createHmac('sha256', config.channels.secret || fallbackSecret).update(`${channel}:${address}`).digest('hex').slice(0, 40);
}

const emergencyNumber = () => config.emergencyNumber;
const chLang = (l) => (CHANNEL_LANGUAGES.includes(l) ? l : 'en');

// ---------------------------------------------------------------- webhook authentication

/** Twilio request signature: base64(HMAC-SHA1(authToken, url + sorted key/value pairs)). */
export function twilioSignature(authToken, url, params) {
  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
  return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf8')).digest('base64');
}

const publicBase = (req) => config.channels.publicUrl || `${req.protocol}://${req.get('host')}`;

function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function verifyTwilio(req, res, next) {
  const { authToken } = config.channels.twilio;
  if (authToken) {
    const expected = twilioSignature(authToken, publicBase(req) + req.originalUrl, req.body ?? {});
    if (!safeEqual(expected, req.get('x-twilio-signature'))) return res.status(403).send('Invalid signature');
    return next();
  }
  return verifyKey(req, res, next);
}

function verifyKey(req, res, next) {
  const key = config.channels.webhookKey;
  if (key && !safeEqual(key, req.query.key)) return res.status(403).send('Forbidden');
  next();
}

const keyQuery = () => (config.channels.webhookKey && !config.channels.twilio.authToken ? `?key=${encodeURIComponent(config.channels.webhookKey)}` : '');

// ---------------------------------------------------------------- per-sender rate limiting

const senderHits = new Map();
function senderAllowed(id) {
  const t = Date.now();
  const recent = (senderHits.get(id) ?? []).filter((x) => t - x < 3600_000);
  if (recent.length >= config.channels.smsPerHour) return false;
  recent.push(t);
  senderHits.set(id, recent);
  if (senderHits.size > 50_000) senderHits.clear();
  return true;
}

// ---------------------------------------------------------------- shared conversation logic

function recordRemoteEncounter(store, { channel, id, session, result }) {
  store.upsertEncounter(
    `${channel}:${id.slice(0, 24)}`,
    {
      kind: channel, level: result.level, aiLevel: result.aiLevel, overridden: result.overridden, source: result.source,
      confidence: result.assessment?.confidence,
      input: { channel, language: session.lang, messages: session.messages.map((m) => ({ ...m, content: redact(m.content) })) },
      result,
    },
    channel,
  );
  store.audit({
    actor: channel, action: 'triage', level: result.level, aiLevel: result.aiLevel, overridden: result.overridden, source: result.source,
    model: result.model, detail: { mode: 'self', channel, turns: session.messages.length, redFlags: result.safety.redFlags.map((f) => f.id) },
  });
}

/** Handle one inbound text message and return the reply text. */
export async function handleTextMessage(store, { channel, from, text }) {
  const id = sessionId(channel, from);
  const body = String(text ?? '').trim().slice(0, 1600);
  const word = normalize(body).replace(/[^\p{L}]/gu, '');
  let session = store.getChannelSession(id);
  const lang = chLang(session?.lang);
  const num = emergencyNumber();

  if (RESET_WORDS.has(word)) {
    store.deleteChannelSession(id);
    return say(lang, 'sms_reset');
  }
  if (HELP_WORDS.has(word) || !body) return say(lang, 'sms_help', { num });
  if (!senderAllowed(id)) return say(lang, 'sms_limit', { num });

  const isNew = !session;
  session ??= { lang: 'auto', messages: [] };
  session.messages.push({ role: 'user', content: body });
  session.messages = session.messages.slice(-20);

  let result;
  try {
    result = await runTriage({
      messages: session.messages, patient: {}, vitals: {}, language: 'auto', mode: 'self', channel: 'sms',
    });
  } catch (err) {
    console.error('sms triage failed', err);
    return say(lang, 'sms_error', { num });
  }
  session.lang = chLang(result.language);
  const l = session.lang;
  const a = result.assessment;
  session.messages.push({ role: 'assistant', content: a.spoken_response });
  store.saveChannelSession(id, channel, session);
  recordRemoteEncounter(store, { channel, id, session, result });

  // The deterministic level label always leads, so the most important information survives truncation.
  const parts = [`[${LEVEL_INFO[result.level].label[l] ?? LEVEL_INFO[result.level].label.en}]`, a.spoken_response];
  if (result.level === 'emergency' && !a.spoken_response.includes(num)) parts.push(say(l, 'call_now', { num }));
  if (isNew) parts.push(say(l, 'sms_welcome', { num }));
  if (a.needs_more_info || isNew) parts.push(say(l, 'sms_footer'));
  const reply = parts.filter(Boolean).join(' ');
  return reply.length > MAX_SMS_CHARS ? `${reply.slice(0, MAX_SMS_CHARS - 1)}…` : reply;
}

// ---------------------------------------------------------------- USSD (deterministic, no AI)

const USSD_PROTOCOLS = ['newborn_0_2m', 'child_2m_5y', 'pregnancy', 'adult_general'];
const USSD_MAX = 182;
const fit = (s) => (s.length > USSD_MAX ? `${s.slice(0, USSD_MAX - 1)}…` : s);

/**
 * Pure USSD state machine. `text` is the "*"-joined history of the user's inputs, as sent by
 * USSD gateways. Returns {reply: "CON …"|"END …", level?}.
 * Flow: language -> who is unwell -> yes/no danger-sign questions. Stops at the first
 * emergency sign so the caller gets the instruction as fast as possible.
 */
export function ussdStep(text) {
  const inputs = text ? String(text).split('*') : [];
  let lang = null;
  let protocolId = null;
  const answers = {};
  let invalid = false;
  const num = emergencyNumber();

  for (const raw of inputs) {
    const v = raw.trim();
    invalid = false;
    if (!lang) {
      lang = USSD_LANGUAGES[Number(v) - 1] ?? null;
      invalid = !lang;
    } else if (!protocolId) {
      protocolId = USSD_PROTOCOLS[Number(v) - 1] ?? null;
      invalid = !protocolId;
    } else {
      const q = getProtocol(protocolId).questions.find((qq) => answers[qq.id] === undefined);
      if (!q) break;
      if (v === '1' || v === '2') {
        answers[q.id] = v === '1';
        if (v === '1' && q.level === 'emergency') return ussdEnd(lang, 'emergency', num);
      } else invalid = true;
    }
  }

  const prefix = invalid ? `${say(lang ?? 'en', 'ussd_invalid')}\n` : '';
  if (!lang) return { reply: `CON ${prefix}${USSD_LANGUAGE_MENU}` };
  if (!protocolId) return { reply: fit(`CON ${prefix}${say(lang, 'ussd_who')}`) };

  const protocol = getProtocol(protocolId);
  const next = protocol.questions.find((qq) => answers[qq.id] === undefined);
  if (next) {
    const n = protocol.questions.indexOf(next) + 1;
    const yn = say(lang, 'ussd_yes_no');
    const head = `CON ${prefix}${n}/${protocol.questions.length} `;
    const room = USSD_MAX - head.length - yn.length - 1;
    const qText = next.text[lang] ?? next.text.en;
    return { reply: `${head}${qText.length > room ? `${qText.slice(0, room - 1)}…` : qText}\n${yn}` };
  }
  return ussdEnd(lang, evaluateProtocol(protocolId, answers).level ?? 'routine', num);
}

function ussdEnd(lang, level, num) {
  const info = LEVEL_INFO[level];
  let msg = `${info.label[lang] ?? info.label.en}. ${info.action[lang] ?? info.action.en}`;
  if (rank(level) >= rank('emergency')) msg += ` ${say(lang, 'call_now', { num })}`;
  return { reply: fit(`END ${msg}`), level };
}

// ---------------------------------------------------------------- Twilio voice (TwiML)

const xml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
const twiml = (inner) => `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;

// Synthesised speech is cached so fixed phrases are generated once per language.
const audioCache = new Map();
function cacheAudio(key, buf) {
  if (audioCache.size > 500) audioCache.delete(audioCache.keys().next().value);
  audioCache.set(key, buf);
}

/** <Play> OpenAI-synthesised audio (natural voice in every language); <Say> as fallback. */
async function voiceOut(req, text, lang) {
  if (!config.mockAi) {
    const key = crypto.createHash('sha256').update(`${lang}|${text}`).digest('hex').slice(0, 32);
    try {
      if (!audioCache.has(key)) cacheAudio(key, await speak({ text, language: lang }));
      return `<Play>${xml(`${publicBase(req)}/api/channels/audio/${key}.mp3`)}</Play>`;
    } catch (err) {
      console.warn('TTS failed, falling back to <Say>:', err.message);
    }
  }
  return `<Say language="${TWILIO_LANG[lang] ?? 'en-US'}">${xml(text)}</Say>`;
}

const voiceUrl = (req, step) => xml(`${publicBase(req)}/api/channels/twilio/voice/${step}${keyQuery()}`);

async function gatherSpeech(req, lang, prompt) {
  return `<Gather input="speech" action="${voiceUrl(req, 'gather')}" method="POST" language="${TWILIO_LANG[lang]}" speechTimeout="auto" timeout="7" actionOnEmptyResult="true">${await voiceOut(req, prompt, lang)}</Gather>`;
}

const pendingCalls = new Map();

// ---------------------------------------------------------------- router

export function createChannelsRouter({ store }) {
  const r = express.Router();
  r.use(express.urlencoded({ extended: false, limit: '100kb' }));
  const send = (res, body, type = 'text/xml') => res.type(type).send(body);
  const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  setInterval(() => store.purgeChannelSessions(), 3600_000).unref();

  // Synthesised audio for <Play> (unguessable ids, short-lived in memory).
  r.get('/audio/:key.mp3', (req, res) => {
    const buf = audioCache.get(req.params.key);
    if (!buf) return res.status(404).end();
    res.type('audio/mpeg').send(buf);
  });

  // ---- Generic SMS gateway: POST {from, text} -> {reply}
  r.post('/sms', verifyKey, route(async (req, res) => {
    const { from, text } = req.body ?? {};
    if (!from) return res.status(400).json({ error: 'from is required' });
    res.json({ reply: await handleTextMessage(store, { channel: 'sms', from: String(from), text }) });
  }));

  // ---- Twilio SMS (reply inline as TwiML)
  r.post('/twilio/sms', verifyTwilio, route(async (req, res) => {
    const reply = await handleTextMessage(store, { channel: 'sms', from: String(req.body.From ?? ''), text: req.body.Body });
    send(res, twiml(`<Message>${xml(reply)}</Message>`));
  }));

  // ---- Africa's Talking SMS (reply sent asynchronously through their API)
  r.post('/africastalking/sms', verifyKey, route(async (req, res) => {
    res.status(200).end();
    const from = String(req.body.from ?? '');
    const reply = await handleTextMessage(store, { channel: 'sms', from, text: req.body.text });
    await sendAfricasTalkingSms(from, reply).catch((err) => console.error("Africa's Talking send failed:", err.message));
  }));

  // ---- Africa's Talking USSD
  r.post('/africastalking/ussd', verifyKey, (req, res) => {
    const { reply, level } = ussdStep(String(req.body.text ?? ''));
    if (level) store.audit({ actor: 'ussd', action: 'triage', level, source: 'rules', detail: { channel: 'ussd' } });
    send(res, reply, 'text/plain');
  });

  // ---- Twilio voice: language menu -> speech -> AI triage -> spoken answer (loop)
  r.post('/twilio/voice', verifyTwilio, route(async (req, res) => {
    const id = sessionId('voice', req.body.CallSid ?? crypto.randomUUID());
    store.saveChannelSession(id, 'voice', { lang: null, messages: [], misses: 0 });
    const menu = (await Promise.all(LANGUAGE_MENU.map(([l, t]) => voiceOut(req, t, l)))).join('');
    send(res, twiml(`<Gather input="dtmf" numDigits="1" timeout="6" action="${voiceUrl(req, 'lang')}" method="POST">${menu}</Gather><Redirect method="POST">${voiceUrl(req, 'lang')}</Redirect>`));
  }));

  r.post('/twilio/voice/lang', verifyTwilio, route(async (req, res) => {
    const id = sessionId('voice', req.body.CallSid);
    const session = store.getChannelSession(id) ?? { messages: [], misses: 0 };
    session.lang = LANGUAGE_MENU[Number(req.body.Digits) - 1]?.[0] ?? 'en';
    store.saveChannelSession(id, 'voice', session);
    send(res, twiml(await gatherSpeech(req, session.lang, say(session.lang, 'voice_greeting', { num: emergencyNumber() }))));
  }));

  r.post('/twilio/voice/gather', verifyTwilio, route(async (req, res) => {
    const id = sessionId('voice', req.body.CallSid);
    const session = store.getChannelSession(id) ?? { lang: 'en', messages: [], misses: 0 };
    const lang = chLang(session.lang);
    const speech = String(req.body.SpeechResult ?? '').trim();
    if (!speech) {
      session.misses = (session.misses ?? 0) + 1;
      store.saveChannelSession(id, 'voice', session);
      if (session.misses >= 2) return send(res, twiml(`${await voiceOut(req, say(lang, 'voice_goodbye'), lang)}<Hangup/>`));
      return send(res, twiml(await gatherSpeech(req, lang, say(lang, 'voice_no_input'))));
    }
    session.messages.push({ role: 'user', content: speech.slice(0, 2000) });
    store.saveChannelSession(id, 'voice', session);
    // Run triage in the background; Twilio polls /result so slow AI responses never time out the call.
    const job = runTriage({ messages: session.messages, patient: {}, vitals: {}, language: lang, mode: 'self', channel: 'voice' });
    pendingCalls.set(id, job);
    // Drop results nobody collects (caller hung up while waiting).
    job.catch(() => {}).finally(() => setTimeout(() => pendingCalls.get(id) === job && pendingCalls.delete(id), 120_000).unref());
    send(res, twiml(`${await voiceOut(req, say(lang, 'voice_wait'), lang)}<Redirect method="POST">${voiceUrl(req, 'result')}</Redirect>`));
  }));

  r.post('/twilio/voice/result', verifyTwilio, route(async (req, res) => {
    const id = sessionId('voice', req.body.CallSid);
    const session = store.getChannelSession(id) ?? { lang: 'en', messages: [] };
    const lang = chLang(session.lang);
    const num = emergencyNumber();
    const job = pendingCalls.get(id);
    if (!job) return send(res, twiml(await gatherSpeech(req, lang, say(lang, 'voice_no_input'))));

    const TIMEOUT = Symbol('timeout');
    let result;
    try {
      result = await Promise.race([job, new Promise((resolve) => setTimeout(() => resolve(TIMEOUT), 8000).unref())]);
    } catch (err) {
      pendingCalls.delete(id);
      console.error('voice triage failed', err);
      return send(res, twiml(`${await voiceOut(req, say(lang, 'sms_error', { num }), lang)}<Hangup/>`));
    }
    if (result === TIMEOUT) return send(res, twiml(`<Pause length="1"/><Redirect method="POST">${voiceUrl(req, 'result')}</Redirect>`));
    pendingCalls.delete(id);

    const a = result.assessment;
    session.messages.push({ role: 'assistant', content: a.spoken_response });
    store.saveChannelSession(id, 'voice', session);
    recordRemoteEncounter(store, { channel: 'voice', id, session, result });

    const turns = session.messages.filter((m) => m.role === 'user').length;
    const hotline = config.channels.hotlineNumber;
    let out;
    if (hotline && rank(result.level) >= rank('urgent')) {
      out = `${await voiceOut(req, `${a.spoken_response} ${say(lang, 'voice_connect')}`, lang)}<Dial>${xml(hotline)}</Dial>`;
    } else if (result.level === 'emergency') {
      out = `${await voiceOut(req, `${a.spoken_response} ${say(lang, 'voice_hangup_call', { num })}`, lang)}<Hangup/>`;
    } else if (a.needs_more_info && turns < MAX_VOICE_TURNS) {
      out = await gatherSpeech(req, lang, a.spoken_response);
    } else {
      out = `${await voiceOut(req, `${a.spoken_response} ${say(lang, 'voice_goodbye')}`, lang)}<Hangup/>`;
    }
    send(res, twiml(out));
  }));

  return r;
}

async function sendAfricasTalkingSms(to, message) {
  const { username, apiKey, senderId } = config.channels.africasTalking;
  if (!username || !apiKey) throw new Error('AT_USERNAME / AT_API_KEY not configured');
  const host = username === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';
  const body = new URLSearchParams({ username, to, message });
  if (senderId) body.set('from', senderId);
  const res = await fetch(`${host}/version1/messaging`, {
    method: 'POST',
    headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
