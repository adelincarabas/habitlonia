import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { db } from './db';

// Codes are 6 digits so they're easy to type on a phone. That's only a million options, so each
// code is short-lived, dies after a few wrong guesses, and a new one can't be requested right away.
const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

type ResetRow = { code_hash: string; attempts: number; created_at: string; expires_at: string };

const selectReset = db.prepare('SELECT code_hash, attempts, created_at, expires_at FROM password_resets WHERE user_id = ?');
const upsertReset = db.prepare(`
  INSERT INTO password_resets (user_id, code_hash, attempts, created_at, expires_at) VALUES (?, ?, 0, ?, ?)
  ON CONFLICT (user_id) DO UPDATE SET
    code_hash = excluded.code_hash, attempts = 0, created_at = excluded.created_at, expires_at = excluded.expires_at
`);
const bumpAttempts = db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE user_id = ?');
const deleteReset = db.prepare('DELETE FROM password_resets WHERE user_id = ?');

// Stored hashed so a leaked database can't be used to take over accounts with pending resets.
const hashCode = (code: string) => createHash('sha256').update(code).digest();

/** Makes a fresh code for the user, or returns null if one was issued too recently. */
export function createResetCode(userId: string): string | null {
  const existing = selectReset.get(userId) as ResetRow | undefined;
  const now = Date.now();
  if (existing && now - Date.parse(existing.created_at) < RESEND_COOLDOWN_MS) return null;

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  upsertReset.run(userId, hashCode(code).toString('hex'), new Date(now).toISOString(), new Date(now + CODE_TTL_MS).toISOString());
  return code;
}

/** True if the code is right; the code can't be used again either way once it's spent. */
export function consumeResetCode(userId: string, code: string): boolean {
  const row = selectReset.get(userId) as ResetRow | undefined;
  if (!row) return false;

  if (Date.now() > Date.parse(row.expires_at) || row.attempts >= MAX_ATTEMPTS) {
    deleteReset.run(userId);
    return false;
  }

  const ok = timingSafeEqual(hashCode(code), Buffer.from(row.code_hash, 'hex'));
  if (ok) deleteReset.run(userId);
  else bumpAttempts.run(userId);
  return ok;
}
