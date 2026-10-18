import { randomUUID } from 'node:crypto';
import type { CreateEntryInput, Entry, EntryKind } from '@habitlonia/shared';
import { db } from './db';

type EntryRow = {
  id: string;
  kind: EntryKind;
  title: string;
  tag: string | null;
  color: string;
  created_at: string;
  ends_at: string | null;
};

const toEntry = (row: EntryRow): Entry => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  tag: row.tag ?? undefined,
  color: row.color,
  createdAt: row.created_at,
  endsAt: row.ends_at ?? undefined,
});

const insertEntry = db.prepare(
  'INSERT INTO entries (id, user_id, kind, title, tag, color, created_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
);
const selectBetween = db.prepare(
  `SELECT id, kind, title, tag, color, created_at, ends_at FROM entries
   WHERE user_id = ? AND created_at >= ? AND created_at < ?
   ORDER BY created_at`,
);

export function addEntry(userId: string, input: CreateEntryInput): Entry {
  const entry: Entry = {
    id: randomUUID(),
    kind: input.kind,
    title: input.title,
    tag: input.tag,
    color: input.color,
    // Normalized so every stored timestamp has the same shape and text comparison stays chronological.
    createdAt: new Date(input.createdAt).toISOString(),
    endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : undefined,
  };
  insertEntry.run(
    entry.id,
    userId,
    entry.kind,
    entry.title,
    entry.tag ?? null,
    entry.color,
    entry.createdAt,
    entry.endsAt ?? null,
  );
  return entry;
}

/** The user's entries that happened in [from, to). */
export function getEntriesBetween(userId: string, from: Date, to: Date): Entry[] {
  const rows = selectBetween.all(userId, from.toISOString(), to.toISOString()) as EntryRow[];
  return rows.map(toEntry);
}
