import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// Fake OpenAI: chat answers are scripted per test; /audio/speech returns fake mp3 bytes.
let fakeAi;
let server;
let base;
let store;
let nextReply;
let mod;
const chatRequests = [];

const reply = (over = {}) => ({
  triage_level: 'self_care', summary: '', likely_conditions: [], red_flags_detected: [], follow_up_questions: [],
  needs_more_info: false, advice: [], when_to_seek_care: '', referral_note: 'note', confidence: 'high',
  spoken_response: 'Rest at home.', english_translation: '', detected_language: 'en', ...over,
});

before(async () => {
  fakeAi = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.url.endsWith('/audio/speech')) return res.end(Buffer.from('ID3fake-mp3'));
      chatRequests.push(JSON.parse(body));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ model: 'fake', choices: [{ message: { content: JSON.stringify(nextReply) } }] }));
    });
  });
  await new Promise((r) => fakeAi.listen(0, r));
  Object.assign(process.env, {
    OPENAI_API_KEY: 'k', OPENAI_BASE_URL: `http://127.0.0.1:${fakeAi.address().port}`,
    CHANNEL_SECRET: 's3cret', TWILIO_AUTH_TOKEN: 'twilio-token', CHANNEL_WEBHOOK_KEY: 'hook', EMERGENCY_NUMBER: '999',
    ACCESS_TOKENS: 'clinician:doc',
  });
  const { openStore } = await import('../server/store.js');
  const { createApp } = await import('../server/app.js');
  mod = await import('../server/channels/index.js');
  store = openStore(':memory:');
  server = createApp({ store }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  fakeAi?.close();
});

const sms = (from, text, key = 'hook') =>
  fetch(`${base}/api/channels/sms?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, text }) });

async function twilio(path, params) {
  const url = `${base}/api/channels/twilio/${path}`;
  const sig = mod.twilioSignature('twilio-token', url, params);
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': sig }, body: new URLSearchParams(params) });
}

test('SMS: emergency leads the reply with the deterministic label and emergency number', async () => {
  nextReply = reply({ triage_level: 'emergency', spoken_response: 'Go to hospital now.' });
  const r = await (await sms('+254700000001', 'my husband has chest pain')).json();
  assert.match(r.reply, /^\[Emergency/);
  assert.match(r.reply, /999/);
  assert.ok(r.reply.length <= 640);
});

test('SMS: conversation memory, RESET, and channel language from the model', async () => {
  nextReply = reply({ triage_level: 'routine', spoken_response: 'Ana homa kwa siku ngapi?', detected_language: 'sw', needs_more_info: true });
  const first = await (await sms('+254700000002', 'mtoto ana homa')).json();
  assert.match(first.reply, /^\[Muone mhudumu wa afya/);
  nextReply = reply({ triage_level: 'routine', spoken_response: 'Sawa.', detected_language: 'sw' });
  await sms('+254700000002', 'siku mbili');
  const last = chatRequests.at(-1);
  // previous turns are sent back to the model
  assert.ok(last.messages.some((m) => m.content === 'mtoto ana homa'));
  assert.equal(last.response_format.json_schema.schema.required.includes('english_translation'), true);
  const reset = await (await sms('+254700000002', 'ANZA')).json();
  assert.match(reset.reply, /Mazungumzo mapya/);
});

test('safety floor applies through the AI translation for languages without rules', async () => {
  // Hausa text the regex rules do not understand; the model translates it but under-triages.
  nextReply = reply({ triage_level: 'self_care', english_translation: 'I have chest pain since morning', detected_language: 'ha' });
  const res = await fetch(`${base}/api/triage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Ina ciwon kirji tun safe' }], language: 'auto' }),
  });
  const r = await res.json();
  assert.equal(r.level, 'emergency');
  assert.equal(r.overridden, true);
  assert.equal(r.safety.viaTranslation, true);
});

test('SMS cases reach the clinician review queue without the phone number', async () => {
  const items = await (await fetch(`${base}/api/review?status=all`, { headers: { Authorization: 'Bearer doc' } })).json();
  const smsCases = items.filter((e) => e.kind === 'sms');
  assert.ok(smsCases.length >= 2);
  assert.doesNotMatch(JSON.stringify(items), /254700000001/);
});

test('webhooks reject requests without a valid key or Twilio signature', async () => {
  assert.equal((await sms('+1', 'hi', 'wrong')).status, 403);
  const res = await fetch(`${base}/api/channels/twilio/sms`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': 'bad' },
    body: new URLSearchParams({ From: '+1', Body: 'hi' }),
  });
  assert.equal(res.status, 403);
});

test('Twilio SMS returns TwiML', async () => {
  nextReply = reply({ triage_level: 'routine', spoken_response: 'See a nurse <soon> & rest.' });
  const res = await twilio('sms', { From: '+15550001', Body: 'sore throat' });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /<Response><Message>\[See a health worker soon\] See a nurse &lt;soon&gt; &amp; rest\./);
});

test('Twilio voice: menu -> language -> speech -> result with synthesised audio', async () => {
  const call = { CallSid: 'CA123' };
  const menu = await (await twilio('voice', call)).text();
  assert.match(menu, /<Gather input="dtmf"/);
  assert.match(menu, /<Play>.*\/api\/channels\/audio\/[a-f0-9]+\.mp3<\/Play>/);

  const greet = await (await twilio('voice/lang', { ...call, Digits: '2' })).text();
  assert.match(greet, /language="sw-KE"/);

  nextReply = reply({ triage_level: 'emergency', spoken_response: 'Nenda hospitali sasa.' });
  const wait = await (await twilio('voice/gather', { ...call, SpeechResult: 'ana degedege' })).text();
  assert.match(wait, /<Redirect method="POST">.*voice\/result/);

  const result = await (await twilio('voice/result', call)).text();
  assert.match(result, /<Hangup\/>/);
  const audioUrl = result.match(/<Play>([^<]+)<\/Play>/)[1].replace(/&amp;/g, '&');
  const audio = await fetch(audioUrl);
  assert.equal(audio.headers.get('content-type'), 'audio/mpeg');
});

test('Twilio voice: silence twice ends the call politely', async () => {
  const call = { CallSid: 'CA999' };
  await twilio('voice', call);
  await twilio('voice/lang', { ...call, Digits: '1' });
  const first = await (await twilio('voice/gather', { ...call, SpeechResult: '' })).text();
  assert.match(first, /<Gather input="speech"/);
  const second = await (await twilio('voice/gather', { ...call, SpeechResult: '' })).text();
  assert.match(second, /<Hangup\/>/);
});

test('USSD: language and patient menus, early stop on an emergency sign', () => {
  assert.match(mod.ussdStep('').reply, /^CON Health AI\n1 English/);
  assert.match(mod.ussdStep('2').reply, /^CON Nani mgonjwa\?/);
  const q1 = mod.ussdStep('1*2').reply; // English, child 2m-5y
  assert.match(q1, /^CON 1\/13 Is the child unable to drink/);
  const emergency = mod.ussdStep('1*2*1');
  assert.equal(emergency.level, 'emergency');
  assert.match(emergency.reply, /^END Emergency.*999/);
});

test('USSD: invalid input repeats the step; all "no" ends with no danger signs', () => {
  assert.match(mod.ussdStep('1*9').reply, /^CON Invalid choice\.\nWho is unwell\?/);
  const allNo = `1*4*${Array(10).fill('2').join('*')}`; // adult protocol, 10 questions
  const end = mod.ussdStep(allNo);
  assert.equal(end.level, 'self_care');
  assert.match(end.reply, /^END Self-care/);
  for (const t of ['', '1', '1*1', '5*3*1', allNo]) assert.ok(mod.ussdStep(t).reply.length <= 186);
});

test('USSD webhook returns plain text', async () => {
  const res = await fetch(`${base}/api/channels/africastalking/ussd?key=hook`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ sessionId: 'x', phoneNumber: '+254700', text: '3' }),
  });
  assert.match(res.headers.get('content-type'), /text\/plain/);
  assert.match(await res.text(), /^CON Qui est malade/);
});
