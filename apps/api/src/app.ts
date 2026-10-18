import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import {
  addDays,
  AddPhotoInput,
  CreateEntryInput,
  fromDateKey,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_ENTRY,
  summarizeDay,
  toDateKey,
  UpdateEntryInput,
  weekOf,
  type OkResponse,
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

// Everything below needs a logged-in user.
app.use('/today', requireAuth);
app.use('/entries', requireAuth);
app.use('/entries/*', requireAuth);
app.use('/focus/*', requireAuth);

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
  const weekEntries = getEntriesBetween(c.get('user').id, days[0]!, addDays(days[6]!, 1));
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
