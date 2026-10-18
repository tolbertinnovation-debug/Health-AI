// SQLite persistence (node:sqlite, no native dependency): patients, encounters,
// clinician review queue and an append-only audit log.

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  created_by TEXT,
  display_name TEXT NOT NULL,
  age_years REAL,
  sex TEXT,
  pregnant INTEGER DEFAULT 0,
  village TEXT,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY,
  client_id TEXT UNIQUE,
  patient_id TEXT REFERENCES patients(id),
  created_at TEXT NOT NULL,
  created_by TEXT,
  kind TEXT NOT NULL,
  level TEXT NOT NULL,
  ai_level TEXT,
  overridden INTEGER DEFAULT 0,
  source TEXT,
  confidence TEXT,
  input_json TEXT,
  result_json TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_level TEXT,
  review_note TEXT,
  outcome TEXT
);
CREATE INDEX IF NOT EXISTS idx_enc_patient ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_enc_review ON encounters(review_status, level);
CREATE TABLE IF NOT EXISTS channel_sessions (
  id TEXT PRIMARY KEY,           -- keyed hash of channel + phone number / call id (never the raw number)
  channel TEXT NOT NULL,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor TEXT,
  action TEXT NOT NULL,
  level TEXT,
  ai_level TEXT,
  overridden INTEGER,
  source TEXT,
  model TEXT,
  detail_json TEXT
);
`;

const now = () => new Date().toISOString();
const parse = (s) => (s ? JSON.parse(s) : null);

export function openStore(dbPath) {
  if (dbPath !== ':memory:') mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  const encounterRow = (r) =>
    r && {
      id: r.id,
      clientId: r.client_id,
      patientId: r.patient_id,
      patientName: r.display_name ?? null,
      createdAt: r.created_at,
      createdBy: r.created_by,
      kind: r.kind,
      level: r.level,
      aiLevel: r.ai_level,
      overridden: Boolean(r.overridden),
      source: r.source,
      confidence: r.confidence,
      input: parse(r.input_json),
      result: parse(r.result_json),
      review: { status: r.review_status, at: r.reviewed_at, by: r.reviewed_by, level: r.review_level, note: r.review_note },
      outcome: r.outcome,
    };

  const patientRow = (r) =>
    r && {
      id: r.id,
      createdAt: r.created_at,
      displayName: r.display_name,
      ageYears: r.age_years,
      sex: r.sex,
      pregnant: Boolean(r.pregnant),
      village: r.village,
      notes: r.notes,
      encounterCount: r.encounter_count ?? undefined,
      lastLevel: r.last_level ?? undefined,
      lastSeen: r.last_seen ?? undefined,
    };

  return {
    db,

    audit({ actor, action, level, aiLevel, overridden, source, model, detail }) {
      db.prepare(
        'INSERT INTO audit (ts, actor, action, level, ai_level, overridden, source, model, detail_json) VALUES (?,?,?,?,?,?,?,?,?)',
      ).run(now(), actor ?? null, action, level ?? null, aiLevel ?? null, overridden ? 1 : 0, source ?? null, model ?? null, detail ? JSON.stringify(detail) : null);
    },

    listAudit(limit = 100) {
      return db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT ?').all(limit).map((r) => ({ ...r, detail: parse(r.detail_json), detail_json: undefined }));
    },

    createPatient(p, actor) {
      const id = randomUUID();
      db.prepare('INSERT INTO patients (id, created_at, created_by, display_name, age_years, sex, pregnant, village, notes) VALUES (?,?,?,?,?,?,?,?,?)').run(
        id, now(), actor ?? null, String(p.displayName).slice(0, 120), p.ageYears ?? null, p.sex ?? null, p.pregnant ? 1 : 0, p.village ?? null, p.notes ?? null,
      );
      return this.getPatient(id);
    },

    updatePatient(id, p) {
      const cur = this.getPatient(id);
      if (!cur) return null;
      const m = { ...cur, ...p };
      db.prepare('UPDATE patients SET display_name=?, age_years=?, sex=?, pregnant=?, village=?, notes=? WHERE id=?').run(
        String(m.displayName).slice(0, 120), m.ageYears ?? null, m.sex ?? null, m.pregnant ? 1 : 0, m.village ?? null, m.notes ?? null, id,
      );
      return this.getPatient(id);
    },

    getPatient(id) {
      return patientRow(db.prepare('SELECT * FROM patients WHERE id = ?').get(id));
    },

    listPatients(search = '') {
      const rows = db
        .prepare(
          `SELECT p.*, COUNT(e.id) AS encounter_count, MAX(e.created_at) AS last_seen,
             (SELECT level FROM encounters e2 WHERE e2.patient_id = p.id ORDER BY e2.created_at DESC LIMIT 1) AS last_level
           FROM patients p LEFT JOIN encounters e ON e.patient_id = p.id
           WHERE p.display_name LIKE ? OR IFNULL(p.village,'') LIKE ?
           GROUP BY p.id ORDER BY COALESCE(MAX(e.created_at), p.created_at) DESC LIMIT 200`,
        )
        .all(`%${search}%`, `%${search}%`);
      return rows.map(patientRow);
    },

    /** Idempotent on clientId so offline-queued encounters can be retried safely. */
    createEncounter(e, actor) {
      if (e.clientId) {
        const existing = db.prepare('SELECT id FROM encounters WHERE client_id = ?').get(e.clientId);
        if (existing) return { ...this.getEncounter(existing.id), duplicate: true };
      }
      const id = randomUUID();
      // Emergency/urgent cases and AI/rule disagreements are prioritised for clinician review;
      // everything is still reviewable.
      db.prepare(
        `INSERT INTO encounters (id, client_id, patient_id, created_at, created_by, kind, level, ai_level, overridden, source, confidence, input_json, result_json)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        id, e.clientId ?? null, e.patientId ?? null, e.createdAt ?? now(), actor ?? null, e.kind ?? 'triage', e.level, e.aiLevel ?? null,
        e.overridden ? 1 : 0, e.source ?? null, e.confidence ?? null, JSON.stringify(e.input ?? null), JSON.stringify(e.result ?? null),
      );
      return this.getEncounter(id);
    },

    getEncounter(id) {
      return encounterRow(db.prepare('SELECT e.*, p.display_name FROM encounters e LEFT JOIN patients p ON p.id = e.patient_id WHERE e.id = ?').get(id));
    },

    listEncounters({ patientId, status, limit = 100 } = {}) {
      const where = [];
      const args = [];
      if (patientId) {
        where.push('e.patient_id = ?');
        args.push(patientId);
      }
      if (status) {
        where.push('e.review_status = ?');
        args.push(status);
      }
      const sql = `SELECT e.*, p.display_name FROM encounters e LEFT JOIN patients p ON p.id = e.patient_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY CASE e.level WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 WHEN 'routine' THEN 2 ELSE 3 END,
                 e.overridden DESC, e.created_at DESC LIMIT ?`;
      return db.prepare(sql).all(...args, limit).map(encounterRow);
    },

    reviewEncounter(id, { decision, level, note, outcome }, actor) {
      const cur = this.getEncounter(id);
      if (!cur) return null;
      const status = decision === 'agree' ? 'agreed' : 'modified';
      db.prepare('UPDATE encounters SET review_status=?, reviewed_at=?, reviewed_by=?, review_level=?, review_note=?, outcome=? WHERE id=?').run(
        status, now(), actor ?? null, decision === 'agree' ? cur.level : level, note ?? null, outcome ?? null, id,
      );
      return this.getEncounter(id);
    },

    // ---- SMS / voice / USSD conversation state (expires after `maxAgeHours` of inactivity)
    getChannelSession(id, maxAgeHours = 24) {
      const r = db.prepare('SELECT * FROM channel_sessions WHERE id = ?').get(id);
      if (!r) return null;
      if (Date.now() - Date.parse(r.updated_at) > maxAgeHours * 3600_000) {
        this.deleteChannelSession(id);
        return null;
      }
      return parse(r.data_json);
    },

    saveChannelSession(id, channel, data) {
      db.prepare(
        'INSERT INTO channel_sessions (id, channel, data_json, updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at',
      ).run(id, channel, JSON.stringify(data), now());
    },

    deleteChannelSession(id) {
      db.prepare('DELETE FROM channel_sessions WHERE id = ?').run(id);
    },

    purgeChannelSessions(maxAgeHours = 24) {
      return db.prepare('DELETE FROM channel_sessions WHERE updated_at < ?').run(new Date(Date.now() - maxAgeHours * 3600_000).toISOString()).changes;
    },

    /**
     * Create or update the encounter for an ongoing remote conversation (one per session),
     * so SMS and phone cases reach the clinician review queue. A rise in level re-opens review.
     */
    upsertEncounter(clientId, e, actor) {
      const existing = db.prepare('SELECT id, level FROM encounters WHERE client_id = ?').get(clientId);
      if (!existing) return this.createEncounter({ ...e, clientId }, actor);
      const order = { emergency: 3, urgent: 2, routine: 1, self_care: 0 };
      const reopen = order[e.level] > order[existing.level];
      db.prepare(
        `UPDATE encounters SET level=?, ai_level=?, overridden=?, source=?, confidence=?, input_json=?, result_json=?
         ${reopen ? ", review_status='pending', reviewed_at=NULL, reviewed_by=NULL, review_level=NULL" : ''} WHERE id=?`,
      ).run(e.level, e.aiLevel ?? null, e.overridden ? 1 : 0, e.source ?? null, e.confidence ?? null, JSON.stringify(e.input ?? null), JSON.stringify(e.result ?? null), existing.id);
      return this.getEncounter(existing.id);
    },

    /** Quality metrics that build the evidence base for safety and regulatory review. */
    metrics() {
      const one = (sql, ...a) => db.prepare(sql).get(...a);
      const total = one('SELECT COUNT(*) AS n FROM encounters').n;
      const byLevel = Object.fromEntries(db.prepare('SELECT level, COUNT(*) AS n FROM encounters GROUP BY level').all().map((r) => [r.level, r.n]));
      const overridden = one('SELECT COUNT(*) AS n FROM encounters WHERE overridden = 1').n;
      const reviewed = one("SELECT COUNT(*) AS n FROM encounters WHERE review_status != 'pending'").n;
      const agreed = one("SELECT COUNT(*) AS n FROM encounters WHERE review_status = 'agreed'").n;
      const rank = "CASE {c} WHEN 'emergency' THEN 3 WHEN 'urgent' THEN 2 WHEN 'routine' THEN 1 ELSE 0 END";
      const under = one(`SELECT COUNT(*) AS n FROM encounters WHERE review_status = 'modified' AND ${rank.replace('{c}', 'review_level')} > ${rank.replace('{c}', 'level')}`).n;
      const over = one(`SELECT COUNT(*) AS n FROM encounters WHERE review_status = 'modified' AND ${rank.replace('{c}', 'review_level')} < ${rank.replace('{c}', 'level')}`).n;
      const triageCalls = one("SELECT COUNT(*) AS n FROM audit WHERE action IN ('triage','vision')").n;
      const aiFallbacks = one("SELECT COUNT(*) AS n FROM audit WHERE action IN ('triage','vision') AND source = 'rules'").n;
      const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
      return {
        encounters: total,
        byLevel,
        pendingReview: total - reviewed,
        reviewed,
        clinicianAgreementPct: pct(agreed, reviewed),
        underTriagePct: pct(under, reviewed),
        overTriagePct: pct(over, reviewed),
        safetyOverridePct: pct(overridden, total),
        assessments: triageCalls,
        aiFallbackPct: pct(aiFallbacks, triageCalls),
      };
    },
  };
}
