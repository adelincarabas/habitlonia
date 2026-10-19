import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import {
  addDays,
  AddPhotoInput,
  CreateEntryInput,
  CreateHabitInput,
  daysBetween,
  fromDateKey,
  habitHistory,
  habitOccurrences,
  ImportSonglessPlaylistInput,
  MAX_HISTORY_DAYS,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_ENTRY,
  summarizeDay,
  toDateKey,
  UpdateEntryInput,
  weekOf,
  type Entry,
  type HabitHistoryResponse,
  SonglessMemoryInput,
  SonglessTryInput,
  type OkResponse,
  type SonglessRound,
  type TodayResponse,
} from '@habitlonia/shared';
import { authRoutes, requireAuth, type AuthEnv } from './auth';
import {
  addEntry,
  addPhoto,
  getEntriesBetween,
  getEntryDetail,
  getPhotoData,
  removePhoto,
  TooManyPhotosError,
  updateEntry,
} from './entries';
import { addHabit, getHabits } from './habits';
import {
  getArtworkUrl,
  getPreviewUrl,
  getSongless,
  importSonglessPlaylist,
  playSonglessTry,
  PlaylistNotFoundError,
  removeSonglessPlaylist,
  RoundNotFoundError,
  RoundStateError,
  saveSonglessMemory,
  selectSonglessPlaylist,
} from './songless';
import { getFocus, getMessageOfTheDay, toggleFocus } from './store';

export const app = new Hono<AuthEnv>();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ ok: true });
});

app.route('/auth', authRoutes);

// GET /photos/:id
// Not behind auth so <Image> can load it directly (web can't send headers for images).
// Photo ids are random UUIDs that are only ever handed to the entry's owner.
app.get('/photos/:id', (c) => {
  const photo = getPhotoData(c.req.param('id'));

  if (!photo) {
    return c.json({ error: 'photo not found' }, 404);
  }

  return c.body(photo.data, 200, {
    'content-type': photo.mimeType,
    'cache-control': 'private, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
  });
});

// GET /songless/artwork/:trackId
// Redirects to a Spotify song's album cover. Public so <Image> can load it, like photos.
app.get('/songless/artwork/:trackId', async (c) => {
  const url = await getArtworkUrl(c.req.param('trackId'));

  if (!url) {
    return c.json({ error: 'artwork not found' }, 404);
  }

  return c.redirect(url, 302);
});

// GET /songless/preview/:id
// Redirects to the song's 30s preview on Deezer, for the few songs Spotify has no preview for.
// Public for the same reason as photos: audio players can't send headers.
app.get('/songless/preview/:id', async (c) => {
  const url = await getPreviewUrl(c.req.param('id'));

  if (!url) {
    return c.json({ error: 'preview not found' }, 404);
  }

  return c.redirect(url, 302);
});

// Everything below needs a logged-in user.
app.use('/today', requireAuth);
app.use('/entries', requireAuth);
app.use('/entries/*', requireAuth);
app.use('/habits', requireAuth);
app.use('/history', requireAuth);
app.use('/focus/*', requireAuth);
app.use('/songless', requireAuth);
app.use('/songless/playlist', requireAuth);
app.use('/songless/playlists/*', requireAuth);
app.use('/songless/rounds/*', requireAuth);

/** The user's entries on `days` (consecutive), with each repeating habit's occurrences filled in. */
function entriesOn(userId: string, days: Date[]): Entry[] {
  const stored = getEntriesBetween(userId, days[0]!, addDays(days.at(-1)!, 1));
  // Occurrences that were edited or checked off are already stored; the stored copy replaces the generated one.
  const storedIds = new Set(stored.map((entry) => entry.id));
  return [
    ...stored,
    ...getHabits(userId)
      .flatMap((habit) => habitOccurrences(habit, days))
      .filter((entry) => !storedIds.has(entry.id)),
  ];
}

// GET /today?date=2026-10-18
// Returns everything the Today screen needs. If no date is given, uses today.
app.get('/today', (c) => {
  let dateKey = c.req.query('date');

  if (!dateKey) {
    dateKey = toDateKey(new Date());
  }

  const date = fromDateKey(dateKey);

  if (!date) {
    return c.json({ error: 'date must look like YYYY-MM-DD' }, 400);
  }

  const days = weekOf(date);
  const weekEntries = entriesOn(c.get('user').id, days);
  const entriesForDay = weekEntries.filter((entry) => toDateKey(new Date(entry.createdAt)) === dateKey);
  const week = days.map((weekDay) => summarizeDay(weekDay, weekEntries));

  const response: TodayResponse = {
    messageOfTheDay: getMessageOfTheDay(),
    focus: getFocus(),
    entries: entriesForDay,
    week: week,
  };

  return c.json(response);
});

// GET /history?from=2026-01-01&to=2026-12-31
// Habits checked off and missed on each day of the range, for the profile chart and calendar.
app.get('/history', (c) => {
  const from = fromDateKey(c.req.query('from') ?? '');
  const to = fromDateKey(c.req.query('to') ?? '');

  if (!from || !to) {
    return c.json({ error: 'from and to must look like YYYY-MM-DD' }, 400);
  }

  // Checked on the dates first, so a silly range is turned away before it's walked day by day.
  const days = to >= from && to.getTime() - from.getTime() < MAX_HISTORY_DAYS * 86_400_000 ? daysBetween(from, to) : [];

  if (days.length === 0 || days.length > MAX_HISTORY_DAYS) {
    return c.json({ error: `the range must be 1 to ${MAX_HISTORY_DAYS} days` }, 400);
  }

  const response: HabitHistoryResponse = {
    days: habitHistory(entriesOn(c.get('user').id, days), days, new Date()),
  };

  return c.json(response);
});

// POST /entries
app.post('/entries', async (c) => {
  const body = await c.req.json();
  const result = CreateEntryInput.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const entry = addEntry(c.get('user').id, result.data);
  return c.json(entry, 201);
});

// POST /habits
// Creates a repeating habit. One-off habits are plain entries (POST /entries).
app.post('/habits', async (c) => {
  const body = await c.req.json();
  const result = CreateHabitInput.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const habit = addHabit(c.get('user').id, result.data);
  return c.json(habit, 201);
});

// GET /entries/:id
// One entry with its description and photos, for the detail screen.
app.get('/entries/:id', (c) => {
  const entry = getEntryDetail(c.get('user').id, c.req.param('id'));

  if (!entry) {
    return c.json({ error: 'entry not found' }, 404);
  }

  return c.json(entry);
});

// PATCH /entries/:id
app.patch('/entries/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = UpdateEntryInput.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues[0]?.message ?? 'invalid input' }, 400);
  }

  const entry = updateEntry(c.get('user').id, c.req.param('id'), result.data);

  if (!entry) {
    return c.json({ error: 'entry not found' }, 404);
  }

  return c.json(entry);
});

// POST /entries/:id/photos
// Body is JSON with the image base64-encoded, which every platform's picker can produce.
app.post(
  '/entries/:id/photos',
  // Base64 is 4/3 the size of the bytes, plus a little for the JSON around it.
  bodyLimit({
    maxSize: Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 1024,
    onError: (c) => c.json({ error: 'That photo is too big' }, 413),
  }),
  async (c) => {
    const body = await c.req.json().catch(() => null);
    const result = AddPhotoInput.safeParse(body);

    if (!result.success) {
      return c.json({ error: result.error.issues[0]?.message ?? 'invalid input' }, 400);
    }

    const data = Buffer.from(result.data.data, 'base64');

    if (data.length > MAX_PHOTO_BYTES) {
      return c.json({ error: 'That photo is too big' }, 413);
    }

    let photo;
    try {
      photo = addPhoto(c.get('user').id, c.req.param('id'), result.data.mimeType, data);
    } catch (err) {
      if (err instanceof TooManyPhotosError) {
        return c.json({ error: `An entry can have up to ${MAX_PHOTOS_PER_ENTRY} photos` }, 409);
      }
      throw err;
    }

    if (!photo) {
      return c.json({ error: 'entry not found' }, 404);
    }

    return c.json(photo, 201);
  },
);

// DELETE /entries/:id/photos/:photoId
app.delete('/entries/:id/photos/:photoId', (c) => {
  const removed = removePhoto(c.get('user').id, c.req.param('id'), c.req.param('photoId'));

  if (!removed) {
    return c.json({ error: 'photo not found' }, 404);
  }

  const response: OkResponse = { ok: true };
  return c.json(response);
});

// POST /focus/:id/toggle
app.post('/focus/:id/toggle', (c) => {
  const id = c.req.param('id');
  const session = toggleFocus(id);

  if (!session) {
    return c.json({ error: 'focus session not found' }, 404);
  }

  return c.json(session);
});

// GET /songless?date=2026-10-19
// Everything the Songless card needs: the playlist being played, its song of the day (picked on the
// first ask) and the user's saved playlists. If no date is given, uses today.
app.get('/songless', (c) => {
  const day = c.req.query('date') ?? toDateKey(new Date());

  if (!fromDateKey(day)) {
    return c.json({ error: 'date must look like YYYY-MM-DD' }, 400);
  }

  return c.json(getSongless(c.get('user').id, day));
});

// PUT /songless/playlist
// Body is { link } with a Spotify playlist link, as copied from Spotify's Share menu.
// The playlist is saved with its link and becomes the one being played; adding it again reloads its songs.
app.put('/songless/playlist', async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = ImportSonglessPlaylistInput.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues[0]?.message ?? 'invalid input' }, 400);
  }

  let playlist;
  try {
    playlist = await importSonglessPlaylist(c.get('user').id, result.data.link);
  } catch (err) {
    if (err instanceof PlaylistNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }

  if (playlist.songs.length === 0) {
    return c.json({ error: 'None of the songs in that playlist have a preview to play' }, 422);
  }

  return c.json(playlist);
});

// POST /songless/playlists/:id/select
// Switches to a playlist the user added before.
app.post('/songless/playlists/:id/select', (c) => {
  if (!selectSonglessPlaylist(c.get('user').id, c.req.param('id'))) {
    return c.json({ error: 'playlist not found' }, 404);
  }

  const response: OkResponse = { ok: true };
  return c.json(response);
});

// DELETE /songless/playlists/:id
app.delete('/songless/playlists/:id', (c) => {
  if (!removeSonglessPlaylist(c.get('user').id, c.req.param('id'))) {
    return c.json({ error: 'playlist not found' }, 404);
  }

  const response: OkResponse = { ok: true };
  return c.json(response);
});

// POST /songless/rounds/:playlistId/:date/tries
// Body is { songId } with the song picked from the playlist, or { songId: null } to skip. Returns the round.
app.post('/songless/rounds/:playlistId/:date/tries', async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = SonglessTryInput.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues[0]?.message ?? 'invalid input' }, 400);
  }

  return songlessRoundResponse(c, () =>
    playSonglessTry(c.get('user').id, c.req.param('playlistId'), c.req.param('date'), result.data.songId),
  );
});

// POST /songless/rounds/:playlistId/:date/memory
// Body is { feeling }: how the song made the user feel. Saved as a memory once the round is over.
app.post('/songless/rounds/:playlistId/:date/memory', async (c) => {
  const body = await c.req.json().catch(() => null);
  const result = SonglessMemoryInput.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues[0]?.message ?? 'invalid input' }, 400);
  }

  return songlessRoundResponse(
    c,
    () => saveSonglessMemory(c.get('user').id, c.req.param('playlistId'), c.req.param('date'), result.data.feeling),
    201,
  );
});

/** Runs a change to a round and answers with the round, or with why it couldn't be made. */
function songlessRoundResponse(c: Context<AuthEnv>, change: () => SonglessRound, status: 200 | 201 = 200) {
  try {
    return c.json(change(), status);
  } catch (err) {
    if (err instanceof RoundNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    if (err instanceof RoundStateError) {
      return c.json({ error: err.message }, 409);
    }
    throw err;
  }
}
