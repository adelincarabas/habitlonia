import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

// A plain `import ... from 'node:sqlite'` breaks the tsup build: esbuild strips the `node:` prefix,
// and `sqlite` only resolves with it. Loading through require keeps the specifier intact.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

// SQLite file on disk (Node's built-in driver, no native build step).
// Use DATABASE_PATH=:memory: for a throwaway database, e.g. in tests.
const path = process.env.DATABASE_PATH ?? './data/habitlonia.db';

if (path !== ':memory:') {
  mkdirSync(dirname(path), { recursive: true });
}

export const db: DatabaseSyncType = new DatabaseSync(path);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

// Actions were renamed to habits. SQLite can't change a CHECK constraint in place, so a database
// created before the rename gets its entries table rebuilt once, with old actions carried over as habits.
const entriesTable = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'entries'").get() as
  | { sql: string }
  | undefined;
const migrateActions = entriesTable?.sql.includes("'action'") ?? false;

db.exec('BEGIN');
if (migrateActions) {
  db.exec('ALTER TABLE entries RENAME TO entries_before_habits; DROP INDEX entries_user_created;');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  -- Memories, thoughts, feelings and one-off habits. Timestamps are UTC ISO strings
  -- (always toISOString() form), so comparing them as text orders them in time.
  CREATE TABLE IF NOT EXISTS entries (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('memory', 'feeling', 'habit', 'thought')),
    title      TEXT NOT NULL,
    tag        TEXT,
    color      TEXT NOT NULL,
    created_at TEXT NOT NULL,
    ends_at    TEXT
  );

  CREATE INDEX IF NOT EXISTS entries_user_created ON entries (user_id, created_at);

  -- Repeating habits. Only the rule is stored; /today expands it onto the days it lands on.
  CREATE TABLE IF NOT EXISTS habits (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    tag           TEXT,
    color         TEXT NOT NULL,
    starts_on     TEXT NOT NULL, -- YYYY-MM-DD
    start_minutes INTEGER NOT NULL,
    end_minutes   INTEGER NOT NULL,
    repeat        TEXT NOT NULL, -- HabitRepeat as JSON
    created_at    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS habits_user ON habits (user_id);

  -- At most one live reset code per user; asking again replaces it.
  CREATE TABLE IF NOT EXISTS password_resets (
    user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

if (migrateActions) {
  db.exec(`
    INSERT INTO entries (id, user_id, kind, title, tag, color, created_at, ends_at)
      SELECT id, user_id, CASE kind WHEN 'action' THEN 'habit' ELSE kind END, title, tag, color, created_at, ends_at
      FROM entries_before_habits;
    DROP TABLE entries_before_habits;
  `);
}
db.exec('COMMIT');
