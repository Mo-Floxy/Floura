import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(process.env.DB_PATH || path.join(dataDir, 'floura.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  date_of_birth TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verify_token_hash TEXT,
  verify_expires TEXT,
  reset_token_hash TEXT,
  reset_expires TEXT,
  consent_health_data INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cycle_length INTEGER NOT NULL DEFAULT 28,
  period_duration INTEGER NOT NULL DEFAULT 5,
  use_manual_cycle_length INTEGER NOT NULL DEFAULT 0,
  theme TEXT NOT NULL DEFAULT 'light',
  reminder_period INTEGER NOT NULL DEFAULT 1,
  reminder_ovulation INTEGER NOT NULL DEFAULT 1,
  reminder_fertile INTEGER NOT NULL DEFAULT 0,
  reminder_medication INTEGER NOT NULL DEFAULT 0,
  reminder_water INTEGER NOT NULL DEFAULT 0,
  reminder_log INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT NOT NULL DEFAULT '08:00',
  reminder_days_before INTEGER NOT NULL DEFAULT 2,
  medication_name TEXT NOT NULL DEFAULT '',
  water_goal INTEGER NOT NULL DEFAULT 8,
  sensitive_notifications INTEGER NOT NULL DEFAULT 0,
  browser_notifications INTEGER NOT NULL DEFAULT 0,
  profile_visible INTEGER NOT NULL DEFAULT 0,
  research_opt_in INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, start_date)
);
CREATE INDEX IF NOT EXISTS idx_periods_user_start ON periods(user_id, start_date);

CREATE TABLE IF NOT EXISTS daily_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS symptoms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('mild','moderate','severe')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date, name)
);
CREATE INDEX IF NOT EXISTS idx_symptoms_user_date ON symptoms(user_id, date);

CREATE TABLE IF NOT EXISTS moods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  mood TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date, mood)
);
CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moods(user_id, date);

CREATE TABLE IF NOT EXISTS water_logs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  glasses INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  quality TEXT NOT NULL CHECK (quality IN ('poor','fair','good','excellent')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  activity TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_exercise_user_date ON exercise_logs(user_id, date);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  food_notes TEXT,
  craving TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  time TEXT NOT NULL DEFAULT '08:00',
  days_before INTEGER NOT NULL DEFAULT 2,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, type)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sensitive INTEGER NOT NULL DEFAULT 0,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
`);

// Migration: early builds keyed nutrition logs by user only. Daily records need a unique (user, date) pair.
const nutritionColumns = db.prepare('PRAGMA table_info(nutrition_logs)').all();
if (!nutritionColumns.some((column) => column.name === 'id')) {
  db.exec(`
    ALTER TABLE nutrition_logs RENAME TO nutrition_logs_old;
    CREATE TABLE nutrition_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      food_notes TEXT,
      craving TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );
    INSERT INTO nutrition_logs (user_id, date, food_notes, craving, updated_at)
      SELECT user_id, date, food_notes, craving, updated_at FROM nutrition_logs_old;
    DROP TABLE nutrition_logs_old;
  `);
}

/** Create the default settings row for a new user. */
export function createSettingsForUser(userId) {
  db.prepare('INSERT OR IGNORE INTO settings (user_id) VALUES (?)').run(userId);
  const defaults = [
    ['period', 1, 2], ['ovulation', 1, 1], ['fertile', 0, 1],
    ['medication', 0, 0], ['water', 0, 0], ['log', 0, 0],
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO reminders (user_id, type, enabled, time, days_before) VALUES (?, ?, ?, ?, ?)');
  for (const [type, enabled, daysBefore] of defaults) {
    insert.run(userId, type, enabled, '08:00', daysBefore);
  }
}

export function getSettings(userId) {
  return db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
}

export default db;
