import type { z } from 'zod';
import {
  AuthResponse,
  CreateEntryInput,
  Entry,
  FocusSession,
  LoginInput,
  RegisterInput,
  TodayResponse,
  User,
} from '../types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type ApiClientOptions = {
  /** Called before every request; return the session token, or null when logged out. */
  getToken?: () => string | null | Promise<string | null>;
  /** Called when the server rejects the token (401), e.g. to clear it and show the login screen. */
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
};

/**
 * Typed client for apps/api. Every response is validated with the same zod
 * schemas the server uses, so a contract drift fails loudly instead of silently.
 */
export function createApiClient(baseUrl: string, options: ApiClientOptions = {}) {
  const { getToken, onUnauthorized, fetchImpl = fetch } = options;

  async function request<T>(schema: z.ZodType<T>, path: string, init?: RequestInit): Promise<T> {
    const token = await getToken?.();
    const res = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) {
      // Login/register also return 401 for bad credentials; only a request that carried a token means "session expired".
      if (res.status === 401 && token) onUnauthorized?.();
      throw new ApiError(res.status, await readErrorMessage(res));
    }
    return schema.parse(await res.json());
  }

  return {
    register: (input: RegisterInput) =>
      request(AuthResponse, '/auth/register', { method: 'POST', body: JSON.stringify(RegisterInput.parse(input)) }),
    login: (input: LoginInput) =>
      request(AuthResponse, '/auth/login', { method: 'POST', body: JSON.stringify(LoginInput.parse(input)) }),
    getMe: () => request(User, '/auth/me'),
    getToday: (date: string) => request(TodayResponse, `/today?date=${encodeURIComponent(date)}`),
    createEntry: (input: CreateEntryInput) =>
      request(Entry, '/entries', {
        method: 'POST',
        body: JSON.stringify(CreateEntryInput.parse(input)),
      }),
    toggleFocus: (id: string) => request(FocusSession, `/focus/${id}/toggle`, { method: 'POST' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** The API answers errors as `{ error: string }`; fall back to the raw body for anything else. */
async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const body = JSON.parse(text);
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // not JSON
  }
  return text;
}
