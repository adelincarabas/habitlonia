import { randomBytes } from 'node:crypto';
import { Hono, type MiddlewareHandler } from 'hono';
import { sign, verify } from 'hono/jwt';
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  type AuthResponse,
  type ForgotPasswordResponse,
  type User,
} from '@habitlonia/shared';
import { sendPasswordResetCode } from './mailer';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password';
import { consumeResetCode, createResetCode } from './password-resets';
import { createUser, EmailTakenError, findUserById, findUserWithHash, updatePasswordHash } from './users';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

function loadSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  console.warn('JWT_SECRET is not set; using a random one. Everyone is logged out when the API restarts.');
  return randomBytes(32).toString('hex');
}

const secret = loadSecret();

async function issueToken(user: User): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: user.id, iat: now, exp: now + TOKEN_TTL_SECONDS }, secret, 'HS256');
}

export type AuthEnv = { Variables: { user: User } };

/** Rejects the request unless it carries a valid Bearer token for an existing user. */
export const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const header = c.req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return c.json({ error: 'not logged in' }, 401);

  try {
    const payload = await verify(token, secret, 'HS256');
    const user = typeof payload.sub === 'string' ? findUserById(payload.sub) : null;
    if (!user) return c.json({ error: 'not logged in' }, 401);
    c.set('user', user);
  } catch {
    return c.json({ error: 'not logged in' }, 401);
  }

  await next();
};

export const authRoutes = new Hono<AuthEnv>();

// POST /auth/register
authRoutes.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = RegisterInput.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0]?.message ?? 'invalid input' }, 400);
  }

  const { name, email, password } = result.data;
  try {
    const user = createUser({ name, email, passwordHash: await hashPassword(password) });
    const response: AuthResponse = { token: await issueToken(user), user };
    return c.json(response, 201);
  } catch (err) {
    if (err instanceof EmailTakenError) return c.json({ error: 'That email is already registered' }, 409);
    throw err;
  }
});

// POST /auth/login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = LoginInput.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0]?.message ?? 'invalid input' }, 400);
  }

  const { email, password } = result.data;
  const found = findUserWithHash(email);
  // Always run one verification so an unknown email costs the same as a wrong password.
  const ok = await verifyPassword(password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !ok) return c.json({ error: 'Wrong email or password' }, 401);

  const response: AuthResponse = { token: await issueToken(found.user), user: found.user };
  return c.json(response);
});

// POST /auth/forgot-password
// Emails a 6-digit code. Answers the same way whether or not the email has an account.
authRoutes.post('/forgot-password', async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = ForgotPasswordInput.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0]?.message ?? 'invalid input' }, 400);
  }

  const found = findUserWithHash(result.data.email);
  const code = found ? createResetCode(found.user.id) : null;
  if (found && code) {
    // Not awaited: waiting on the mail provider would make known emails measurably slower to answer.
    sendPasswordResetCode(found.user, code).catch((err) => console.error('Failed to send reset code', err));
  }

  const response: ForgotPasswordResponse = { ok: true };
  return c.json(response);
});

// POST /auth/reset-password
// Sets a new password with the emailed code, then logs the user in.
authRoutes.post('/reset-password', async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = ResetPasswordInput.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0]?.message ?? 'invalid input' }, 400);
  }

  const { email, code, password } = result.data;
  const found = findUserWithHash(email);
  if (!found || !consumeResetCode(found.user.id, code)) {
    return c.json({ error: 'That code is wrong or has expired' }, 400);
  }

  updatePasswordHash(found.user.id, await hashPassword(password));
  const response: AuthResponse = { token: await issueToken(found.user), user: found.user };
  return c.json(response);
});

// GET /auth/me
authRoutes.get('/me', requireAuth, (c) => {
  return c.json(c.get('user'));
});
