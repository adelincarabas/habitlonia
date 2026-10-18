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
`);
