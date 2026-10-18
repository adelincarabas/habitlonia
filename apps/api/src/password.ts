import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Passwords are never stored. We store `scrypt$N$r$p$salt$hash` (base64), which carries
// its own parameters so the cost can be raised later without breaking existing users.
const KEY_LENGTH = 64;
const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
// scrypt needs ~128 * N * r bytes; the default maxmem (32 MiB) is too tight for N = 2^15.
const MAXMEM = 128 * PARAMS.N * PARAMS.r * 2;

function derive(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  const options: ScryptOptions = { N, r, p, maxmem: MAXMEM };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS.N, PARAMS.r, PARAMS.p);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Verified against when the email is unknown, so "no such user" and "wrong password"
// take about the same time and can't be told apart.
export const DUMMY_HASH = await hashPassword(randomBytes(16).toString('hex'));
