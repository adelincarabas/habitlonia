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

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  -- Memories, thoughts, feelings and actions. Timestamps are UTC ISO strings
  -- (always toISOString() form), so comparing them as text orders them in time.
  CREATE TABLE IF NOT EXISTS entries (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('memory', 'feeling', 'action', 'thought')),
    title      TEXT NOT NULL,
    description TEXT,
    tag        TEXT,
    color      TEXT NOT NULL,
    created_at TEXT NOT NULL,
    ends_at    TEXT
  );

  CREATE INDEX IF NOT EXISTS entries_user_created ON entries (user_id, created_at);

  -- Photos attached on an entry's detail screen. Kept in the database so they go
  -- wherever it goes (and are deleted with their entry).
  CREATE TABLE IF NOT EXISTS entry_photos (
    id         TEXT PRIMARY KEY,
    entry_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    mime_type  TEXT NOT NULL,
    data       BLOB NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS entry_photos_entry ON entry_photos (entry_id, created_at);

  -- At most one live reset code per user; asking again replaces it.
  CREATE TABLE IF NOT EXISTS password_resets (
    user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

// Databases created before entries had a description.
const entryColumns = db.prepare('PRAGMA table_info(entries)').all() as { name: string }[];
if (!entryColumns.some((column) => column.name === 'description')) {
  db.exec('ALTER TABLE entries ADD COLUMN description TEXT');
}
