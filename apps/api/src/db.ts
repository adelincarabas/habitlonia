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

// A database from before the rename may already have descriptions and photos; carry both over.
const oldHasDescription =
  migrateActions &&
  (db.prepare('PRAGMA table_info(entries)').all() as { name: string }[]).some((column) => column.name === 'description');

if (migrateActions) {
  // While the table is swapped, keep entry_photos pointing at "entries" (the rebuilt table) instead of
  // following the rename, and keep the old table's drop from cascading to the photos.
  db.exec('PRAGMA foreign_keys = OFF; PRAGMA legacy_alter_table = ON;');
}
// Songless first kept a single playlist per user, without its id or link. Those can't be told apart
// or reloaded, so that table is dropped and users add their playlist again.
const songlessColumns = db.prepare('PRAGMA table_info(songless_playlists)').all() as { name: string }[];
if (songlessColumns.length > 0 && !songlessColumns.some((column) => column.name === 'playlist_id')) {
  db.exec('DROP TABLE songless_playlists');
}

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
    description TEXT,
    tag        TEXT,
    color      TEXT NOT NULL,
    created_at TEXT NOT NULL,
    ends_at    TEXT,
    done       INTEGER NOT NULL DEFAULT 0 -- habits only: 1 once checked off
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

  -- The Spotify playlists each user has added to Songless, kept with the link they came from.
  -- Songs are SonglessSong[] as JSON; adding a playlist again reloads it. The one picked most
  -- recently (selected_at) is the one being played.
  CREATE TABLE IF NOT EXISTS songless_playlists (
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_id TEXT NOT NULL,
    link        TEXT NOT NULL,
    name        TEXT NOT NULL,
    songs       TEXT NOT NULL,
    skipped     INTEGER NOT NULL,
    updated_at  TEXT NOT NULL,
    selected_at TEXT NOT NULL,
    PRIMARY KEY (user_id, playlist_id)
  );

  -- One song per playlist per day. Rounds outlive their playlist, so removing and re-adding
  -- it doesn't give the day's song again. song and attempts are SonglessSong / SonglessAttempt[] as JSON.
  CREATE TABLE IF NOT EXISTS songless_rounds (
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_id TEXT NOT NULL,
    day         TEXT NOT NULL, -- YYYY-MM-DD
    song        TEXT NOT NULL,
    attempts    TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('guessing', 'won', 'lost')),
    memory_id   TEXT REFERENCES entries(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, playlist_id, day)
  );

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
    INSERT INTO entries (id, user_id, kind, title, description, tag, color, created_at, ends_at)
      SELECT id, user_id, CASE kind WHEN 'action' THEN 'habit' ELSE kind END, title, ${oldHasDescription ? 'description' : 'NULL'}, tag, color, created_at, ends_at
      FROM entries_before_habits;
    DROP TABLE entries_before_habits;
  `);
}
db.exec('COMMIT');
db.exec('PRAGMA foreign_keys = ON; PRAGMA legacy_alter_table = OFF;');

// Databases created before entries had a description.
const entryColumns = db.prepare('PRAGMA table_info(entries)').all() as { name: string }[];
if (!entryColumns.some((column) => column.name === 'description')) {
  db.exec('ALTER TABLE entries ADD COLUMN description TEXT');
}

// Databases created before habits could be checked off.
if (!entryColumns.some((column) => column.name === 'done')) {
  db.exec('ALTER TABLE entries ADD COLUMN done INTEGER NOT NULL DEFAULT 0');
}
