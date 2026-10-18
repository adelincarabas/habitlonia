import { randomUUID } from 'node:crypto';
import type { User } from '@habitlonia/shared';
import { db } from './db';

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
};

const toUser = (row: UserRow): User => ({ id: row.id, email: row.email, name: row.name });

const insertUser = db.prepare(
  'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
);
const selectByEmail = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?');
const selectById = db.prepare('SELECT id, email, name, password_hash FROM users WHERE id = ?');

export class EmailTakenError extends Error {}

export function createUser(input: { email: string; name: string; passwordHash: string }): User {
  const id = randomUUID();
  try {
    insertUser.run(id, input.email, input.name, input.passwordHash, new Date().toISOString());
  } catch (err) {
    // The UNIQUE constraint is the source of truth; checking first would race.
    if (err instanceof Error && 'errcode' in err && err.errcode === 2067) throw new EmailTakenError();
    throw err;
  }
  return { id, email: input.email, name: input.name };
}

/** Includes the password hash, so only use it to verify a login. */
export function findUserWithHash(email: string): { user: User; passwordHash: string } | null {
  const row = selectByEmail.get(email) as UserRow | undefined;
  return row ? { user: toUser(row), passwordHash: row.password_hash } : null;
}

export function findUserById(id: string): User | null {
  const row = selectById.get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}
