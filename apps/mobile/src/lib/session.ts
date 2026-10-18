import { storage } from './storage';

const KEY = 'habitlonia.session-token';

// The API client reads the token synchronously-ish on every request, so keep a copy in memory.
let token: string | null = null;

export const getToken = () => token;

export async function loadToken(): Promise<string | null> {
  token = await storage.get(KEY);
  return token;
}

export async function saveToken(next: string): Promise<void> {
  token = next;
  await storage.set(KEY, next);
}

export async function clearToken(): Promise<void> {
  token = null;
  await storage.remove(KEY);
}
