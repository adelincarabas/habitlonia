import type { z } from 'zod';
import { CreateEntryInput, Entry, FocusSession, TodayResponse } from '../types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Typed client for apps/api. Every response is validated with the same zod
 * schemas the server uses, so a contract drift fails loudly instead of silently.
 */
export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch) {
  async function request<T>(schema: z.ZodType<T>, path: string, init?: RequestInit): Promise<T> {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return schema.parse(await res.json());
  }

  return {
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
