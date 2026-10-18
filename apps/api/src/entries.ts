import { randomUUID } from 'node:crypto';
import {
  MAX_PHOTOS_PER_ENTRY,
  type CreateEntryInput,
  type Entry,
  type EntryDetail,
  type EntryKind,
  type EntryPhoto,
  type UpdateEntryInput,
} from '@habitlonia/shared';
import { db } from './db';

type EntryRow = {
  id: string;
  kind: EntryKind;
  title: string;
  description: string | null;
  tag: string | null;
  color: string;
  created_at: string;
  ends_at: string | null;
};

type PhotoRow = { id: string; created_at: string };

const toEntry = (row: EntryRow): Entry => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  description: row.description ?? undefined,
  tag: row.tag ?? undefined,
  color: row.color,
  createdAt: row.created_at,
  endsAt: row.ends_at ?? undefined,
});

const toPhoto = (row: PhotoRow): EntryPhoto => ({
  id: row.id,
  path: `/photos/${row.id}`,
  createdAt: row.created_at,
});

const ENTRY_COLUMNS = 'id, kind, title, description, tag, color, created_at, ends_at';

const insertEntry = db.prepare(
  'INSERT INTO entries (id, user_id, kind, title, description, tag, color, created_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
);
const selectBetween = db.prepare(
  `SELECT ${ENTRY_COLUMNS} FROM entries
   WHERE user_id = ? AND created_at >= ? AND created_at < ?
   ORDER BY created_at`,
);
const selectOne = db.prepare(`SELECT ${ENTRY_COLUMNS} FROM entries WHERE id = ? AND user_id = ?`);
const updateOne = db.prepare(
  `UPDATE entries SET title = ?, description = ? WHERE id = ? AND user_id = ?`,
);

const insertPhoto = db.prepare(
  'INSERT INTO entry_photos (id, entry_id, mime_type, data, created_at) VALUES (?, ?, ?, ?, ?)',
);
const selectPhotos = db.prepare(
  'SELECT id, created_at FROM entry_photos WHERE entry_id = ? ORDER BY created_at',
);
const selectPhotoData = db.prepare('SELECT mime_type, data FROM entry_photos WHERE id = ?');
const countPhotos = db.prepare('SELECT COUNT(*) AS n FROM entry_photos WHERE entry_id = ?');
const deletePhoto = db.prepare('DELETE FROM entry_photos WHERE id = ? AND entry_id = ?');

export function addEntry(userId: string, input: CreateEntryInput): Entry {
  const entry: Entry = {
    id: randomUUID(),
    kind: input.kind,
    title: input.title,
    description: input.description || undefined,
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
    entry.description ?? null,
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

function findEntry(userId: string, id: string): Entry | null {
  const row = selectOne.get(id, userId) as EntryRow | undefined;
  return row ? toEntry(row) : null;
}

/** Null when the entry doesn't exist or belongs to someone else; callers can't tell which. */
export function getEntryDetail(userId: string, id: string): EntryDetail | null {
  const entry = findEntry(userId, id);
  if (!entry) return null;
  const photos = (selectPhotos.all(id) as PhotoRow[]).map(toPhoto);
  return { ...entry, photos };
}

export function updateEntry(userId: string, id: string, input: UpdateEntryInput): Entry | null {
  const entry = findEntry(userId, id);
  if (!entry) return null;
  const title = input.title ?? entry.title;
  // Present-but-empty clears the description; absent leaves it alone.
  const description = input.description === undefined ? entry.description : input.description || undefined;
  updateOne.run(title, description ?? null, id, userId);
  return { ...entry, title, description };
}

export class TooManyPhotosError extends Error {}

export function addPhoto(userId: string, entryId: string, mimeType: string, data: Buffer): EntryPhoto | null {
  if (!findEntry(userId, entryId)) return null;
  const { n } = countPhotos.get(entryId) as { n: number };
  if (n >= MAX_PHOTOS_PER_ENTRY) throw new TooManyPhotosError();
  const row: PhotoRow = { id: randomUUID(), created_at: new Date().toISOString() };
  insertPhoto.run(row.id, entryId, mimeType, data, row.created_at);
  return toPhoto(row);
}

/** False when the entry isn't the user's or the photo isn't on it. */
export function removePhoto(userId: string, entryId: string, photoId: string): boolean {
  if (!findEntry(userId, entryId)) return false;
  return deletePhoto.run(photoId, entryId).changes > 0;
}

export function getPhotoData(photoId: string): { mimeType: string; data: Uint8Array<ArrayBuffer> } | null {
  const row = selectPhotoData.get(photoId) as { mime_type: string; data: Uint8Array<ArrayBuffer> } | undefined;
  return row ? { mimeType: row.mime_type, data: row.data } : null;
}
