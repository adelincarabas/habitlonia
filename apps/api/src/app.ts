import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CreateEntryInput, summarizeDay, toDateKey, weekOf, type TodayResponse } from '@habitlonia/shared';
import { authRoutes, requireAuth } from './auth';
import {
  addEntry,
  getAllEntries,
  getFocus,
  getMessageOfTheDay,
  toggleFocus,
} from './store';

export const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ ok: true });
});

app.route('/auth', authRoutes);

// Everything below needs a logged-in user.
app.use('/today', requireAuth);
app.use('/entries', requireAuth);
app.use('/focus/*', requireAuth);

// GET /today?date=2026-10-18
// Returns everything the Today screen needs. If no date is given, uses today.
app.get('/today', (c) => {
  let dateKey = c.req.query('date');

  if (!dateKey) {
    dateKey = toDateKey(new Date());
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return c.json({ error: 'date must look like YYYY-MM-DD' }, 400);
  }

  // "2026-10-18" -> Date
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);

  const allEntries = getAllEntries();
  const entriesForDay = allEntries.filter((entry) => toDateKey(new Date(entry.createdAt)) === dateKey);
  const week = weekOf(date).map((weekDay) => summarizeDay(weekDay, allEntries));

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

  const entry = addEntry(result.data);
  return c.json(entry, 201);
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
