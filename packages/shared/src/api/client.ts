import type { z } from 'zod';
import {
  AddPhotoInput,
  AuthResponse,
  CreateEntryInput,
  CreateHabitInput,
  Entry,
  EntryDetail,
  EntryPhoto,
  FocusSession,
  Habit,
  ImportSonglessPlaylistInput,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  LoginInput,
  OkResponse,
  RegisterInput,
  ResetPasswordInput,
  SonglessMemoryInput,
  SonglessPlaylist,
  SonglessResponse,
  SonglessRound,
  SonglessTryInput,
  type SonglessSong,
  TodayResponse,
  UpdateEntryInput,
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
    forgotPassword: (input: ForgotPasswordInput) =>
      request(ForgotPasswordResponse, '/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(ForgotPasswordInput.parse(input)),
      }),
    resetPassword: (input: ResetPasswordInput) =>
      request(AuthResponse, '/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(ResetPasswordInput.parse(input)),
      }),
    getMe: () => request(User, '/auth/me'),
    getToday: (date: string) => request(TodayResponse, `/today?date=${encodeURIComponent(date)}`),
    createEntry: (input: CreateEntryInput) =>
      request(Entry, '/entries', {
        method: 'POST',
        body: JSON.stringify(CreateEntryInput.parse(input)),
      }),
    createHabit: (input: CreateHabitInput) =>
      request(Habit, '/habits', {
        method: 'POST',
        body: JSON.stringify(CreateHabitInput.parse(input)),
      }),
    getEntry: (id: string) => request(EntryDetail, `/entries/${encodeURIComponent(id)}`),
    updateEntry: (id: string, input: UpdateEntryInput) =>
      request(Entry, `/entries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(UpdateEntryInput.parse(input)),
      }),
    addEntryPhoto: (entryId: string, input: AddPhotoInput) =>
      request(EntryPhoto, `/entries/${encodeURIComponent(entryId)}/photos`, {
        method: 'POST',
        body: JSON.stringify(AddPhotoInput.parse(input)),
      }),
    removeEntryPhoto: (entryId: string, photoId: string) =>
      request(OkResponse, `/entries/${encodeURIComponent(entryId)}/photos/${encodeURIComponent(photoId)}`, {
        method: 'DELETE',
      }),
    /** Full URL for an <Image> source. */
    photoUrl: (photo: EntryPhoto) => `${baseUrl}${photo.path}`,
    toggleFocus: (id: string) => request(FocusSession, `/focus/${id}/toggle`, { method: 'POST' }),
    getSongless: (date: string) => request(SonglessResponse, `/songless?date=${encodeURIComponent(date)}`),
    /** Adds a playlist (or reloads one added before) and starts playing it. */
    importSonglessPlaylist: (input: ImportSonglessPlaylistInput) =>
      request(SonglessPlaylist, '/songless/playlist', {
        method: 'PUT',
        body: JSON.stringify(ImportSonglessPlaylistInput.parse(input)),
      }),
    selectSonglessPlaylist: (id: string) =>
      request(OkResponse, `/songless/playlists/${encodeURIComponent(id)}/select`, { method: 'POST' }),
    removeSonglessPlaylist: (id: string) =>
      request(OkResponse, `/songless/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    songlessTry: (playlistId: string, date: string, input: SonglessTryInput) =>
      request(SonglessRound, `/songless/rounds/${encodeURIComponent(playlistId)}/${encodeURIComponent(date)}/tries`, {
        method: 'POST',
        body: JSON.stringify(SonglessTryInput.parse(input)),
      }),
    saveSonglessMemory: (playlistId: string, date: string, input: SonglessMemoryInput) =>
      request(SonglessRound, `/songless/rounds/${encodeURIComponent(playlistId)}/${encodeURIComponent(date)}/memory`, {
        method: 'POST',
        body: JSON.stringify(SonglessMemoryInput.parse(input)),
      }),
    /** Full URL of a song's 30s preview, for the audio player. */
    songlessPreviewUrl: ({ previewUrl }: Pick<SonglessSong, 'previewUrl'>) =>
      previewUrl.startsWith('/') ? `${baseUrl}${previewUrl}` : previewUrl,
    /** The song's album cover, for an <Image> source. */
    songlessArtworkUrl: (song: SonglessSong) => `${baseUrl}/songless/artwork/${encodeURIComponent(song.id)}`,
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
