import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { config, authEnabled, ROOT } from './config.js';
import { runTriage, runVision, validateTriageInput } from './triage.js';
import { transcribe, speak, AiError } from './openai.js';
import { safetyAssessment } from '../shared/safety.js';
import { maxLevel, isValidLevel } from '../shared/levels.js';
import { PROTOCOLS } from '../shared/protocols.js';
import { LANGUAGE_NAMES } from './prompts.js';
import { createChannelsRouter } from './channels/index.js';

const ROLE_RANK = { public: 0, chw: 1, clinician: 2, admin: 3 };

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function rateLimiter(perMinute) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const t = Date.now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < 60_000);
    if (recent.length >= perMinute) {
      res.set('Retry-After', '60');
      return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
    }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 10_000) hits.clear();
    next();
  };
}

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createApp({ store }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'microphone=(self), camera=(self), geolocation=()',
    });
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  // Authentication: bearer token -> role. With no ACCESS_TOKENS configured the app runs in
  // open development mode where everyone has full access.
  app.use((req, _res, next) => {
    if (!authEnabled()) {
      req.role = 'admin';
      req.actor = 'dev';
      return next();
    }
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    req.role = config.tokens.get(token) || 'public';
    req.actor = req.role === 'public' ? 'public' : `${req.role}:${token.slice(0, 4)}…`;
    next();
  });
  const requireRole = (role) => (req, res, next) =>
    ROLE_RANK[req.role] >= ROLE_RANK[role] ? next() : res.status(req.role === 'public' ? 401 : 403).json({ error: `Requires ${role} access` });

  const aiLimit = rateLimiter(config.rateLimitPerMinute);

  // ---------- Public ----------
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/config', (req, res) =>
    res.json({
      mockAi: config.mockAi,
      authEnabled: authEnabled(),
      role: req.role,
      emergencyNumber: config.emergencyNumber,
      languages: LANGUAGE_NAMES,
      protocols: PROTOCOLS.map((p) => ({ id: p.id, title: p.title })),
      channels: { sms: true, ussd: true, voice: true },
    }),
  );

  app.post('/api/triage', aiLimit, asyncRoute(async (req, res) => {
    const { errors, input } = validateTriageInput(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    if (input.mode === 'chw' && ROLE_RANK[req.role] < ROLE_RANK.chw) input.mode = 'self';
    const result = await runTriage(input);
    store.audit({
      actor: req.actor, action: 'triage', level: result.level, aiLevel: result.aiLevel, overridden: result.overridden,
      source: result.source, model: result.model,
      detail: {
        mode: input.mode, language: input.language, turns: input.messages.length,
        redFlags: result.safety.redFlags.map((f) => f.id), vitals: result.safety.vitals.map((f) => f.id), aiError: result.aiError,
      },
    });
    res.json(result);
  }));

  app.post('/api/voice/transcribe', aiLimit, upload.single('audio'), asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'audio file is required' });
    if (config.mockAi) return res.status(501).json({ error: 'Server transcription needs OPENAI_API_KEY; use on-device speech recognition.' });
    const language = typeof req.body.language === 'string' && /^[a-z]{2}$/.test(req.body.language) ? req.body.language : undefined;
    const text = await transcribe({ buffer: req.file.buffer, mimeType: req.file.mimetype, filename: req.file.originalname, language });
    store.audit({ actor: req.actor, action: 'transcribe', model: config.models.transcribe, detail: { bytes: req.file.size, language } });
    res.json({ text });
  }));

  app.post('/api/voice/speak', aiLimit, asyncRoute(async (req, res) => {
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ error: 'text is required' });
    if (config.mockAi) return res.status(501).json({ error: 'Server speech needs OPENAI_API_KEY; use on-device speech.' });
    const audio = await speak({ text, language: LANGUAGE_NAMES[req.body?.language] });
    res.set('Content-Type', 'audio/mpeg').send(audio);
  }));

  // ---------- Community health worker ----------
  app.post('/api/diagnostics/image', requireRole('chw'), aiLimit, upload.single('image'), asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'image file is required' });
    if (!/^image\/(jpeg|png|webp|gif)$/.test(req.file.mimetype)) return res.status(400).json({ error: 'image must be JPEG, PNG, WebP or GIF' });
    if (req.file.size > 8 * 1024 * 1024) return res.status(400).json({ error: 'image must be under 8 MB' });
    let patient = {};
    try {
      patient = req.body.patient ? JSON.parse(req.body.patient) : {};
    } catch {
      /* ignore malformed patient context */
    }
    const result = await runVision({
      image: req.file.buffer, mimeType: req.file.mimetype, kind: req.body.kind,
      notes: String(req.body.notes ?? '').slice(0, 2000), language: req.body.language || 'en', patient,
    });
    store.audit({
      actor: req.actor, action: 'vision', level: result.level, aiLevel: result.assessment.triage_level, overridden: result.overridden,
      source: result.source, model: result.model, detail: { kind: result.kind, quality: result.assessment.image_quality, rdt: result.assessment.rdt_result },
    });
    res.json(result);
  }));

  app.get('/api/patients', requireRole('chw'), (req, res) => res.json(store.listPatients(String(req.query.q ?? ''))));

  const patientFields = (b) => ({
    displayName: String(b.displayName ?? '').trim(),
    ageYears: b.ageYears === '' || b.ageYears === undefined || b.ageYears === null ? null : Number(b.ageYears),
    sex: ['female', 'male', 'other'].includes(b.sex) ? b.sex : null,
    pregnant: Boolean(b.pregnant),
    village: b.village ? String(b.village).slice(0, 120) : null,
    notes: b.notes ? String(b.notes).slice(0, 2000) : null,
  });

  app.post('/api/patients', requireRole('chw'), (req, res) => {
    const p = patientFields(req.body ?? {});
    if (!p.displayName) return res.status(400).json({ error: 'displayName is required' });
    if (p.ageYears !== null && !(p.ageYears >= 0 && p.ageYears <= 130)) return res.status(400).json({ error: 'ageYears must be between 0 and 130' });
    const patient = store.createPatient(p, req.actor);
    store.audit({ actor: req.actor, action: 'patient.create', detail: { id: patient.id } });
    res.status(201).json(patient);
  });

  app.get('/api/patients/:id', requireRole('chw'), (req, res) => {
    const p = store.getPatient(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ ...p, encounters: store.listEncounters({ patientId: p.id }) });
  });

  app.patch('/api/patients/:id', requireRole('chw'), (req, res) => {
    const cur = store.getPatient(req.params.id);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const p = store.updatePatient(req.params.id, patientFields({ ...cur, ...req.body }));
    store.audit({ actor: req.actor, action: 'patient.update', detail: { id: p.id } });
    res.json(p);
  });

  app.post('/api/encounters', requireRole('chw'), (req, res) => {
    const b = req.body ?? {};
    const result = b.result ?? {};
    if (!isValidLevel(result.level)) return res.status(400).json({ error: 'result.level is required' });
    if (b.patientId && !store.getPatient(b.patientId)) return res.status(400).json({ error: 'Unknown patientId' });
    // Never trust a client-supplied level below what the safety rules give for the same input.
    const i = b.input ?? {};
    const text = (i.messages ?? []).filter((m) => m.role === 'user').map((m) => m.content).join('\n') + (i.notes ? `\n${i.notes}` : '');
    const floor = safetyAssessment({ text, patient: i.patient ?? {}, vitals: i.vitals ?? {}, protocol: i.protocol }).level;
    const level = maxLevel(result.level, floor);
    const enc = store.createEncounter(
      {
        clientId: b.clientId ? String(b.clientId).slice(0, 64) : null, patientId: b.patientId || null, createdAt: b.createdAt,
        kind: ['triage', 'protocol', 'image'].includes(b.kind) ? b.kind : 'triage', level, aiLevel: result.aiLevel,
        overridden: Boolean(result.overridden) || level !== result.level, source: result.source,
        confidence: result.assessment?.confidence, input: i, result,
      },
      req.actor,
    );
    if (!enc.duplicate) store.audit({ actor: req.actor, action: 'encounter.create', level, detail: { id: enc.id, kind: enc.kind } });
    res.status(enc.duplicate ? 200 : 201).json(enc);
  });

  // ---------- Clinician oversight ----------
  app.get('/api/review', requireRole('clinician'), (req, res) =>
    res.json(store.listEncounters({ status: req.query.status === 'all' ? undefined : String(req.query.status || 'pending') })),
  );

  app.post('/api/review/:id', requireRole('clinician'), (req, res) => {
    const { decision, level, note, outcome } = req.body ?? {};
    if (!['agree', 'modify'].includes(decision)) return res.status(400).json({ error: 'decision must be agree or modify' });
    if (decision === 'modify' && !isValidLevel(level)) return res.status(400).json({ error: 'level is required when modifying' });
    const enc = store.reviewEncounter(req.params.id, { decision, level, note: note ? String(note).slice(0, 2000) : null, outcome }, req.actor);
    if (!enc) return res.status(404).json({ error: 'Not found' });
    store.audit({ actor: req.actor, action: 'review', level: enc.review.level, aiLevel: enc.level, detail: { id: enc.id, decision } });
    res.json(enc);
  });

  app.get('/api/metrics', requireRole('clinician'), (_req, res) => res.json(store.metrics()));
  app.get('/api/audit', requireRole('clinician'), (req, res) => res.json(store.listAudit(Math.min(500, Number(req.query.limit) || 100))));

  // ---------- Basic-phone channels: SMS, USSD, voice calls ----------
  app.use('/api/channels', createChannelsRouter({ store }));

  // ---------- Static frontend (PWA) ----------
  app.use('/shared', express.static(path.join(ROOT, 'shared'), { maxAge: '1h' }));
  app.use(express.static(path.join(ROOT, 'public'), { maxAge: '1h', setHeaders: (res, p) => p.endsWith('sw.js') && res.set('Cache-Control', 'no-cache') }));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
    if (err instanceof AiError) return res.status(err.status).json({ error: 'The AI service is temporarily unavailable. Safety rules still apply — if you are worried, seek care.', detail: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
