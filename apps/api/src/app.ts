import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  addDays,
  CreateEntryInput,
  CreateHabitInput,
  fromDateKey,
  habitOccurrences,
  summarizeDay,
  toDateKey,
  weekOf,
  type TodayResponse,
} from '@habitlonia/shared';
import { authRoutes, requireAuth, type AuthEnv } from './auth';
import { addEntry, getEntriesBetween } from './entries';
import { addHabit, getHabits } from './habits';
import { getFocus, getMessageOfTheDay, toggleFocus } from './store';

export const app = new Hono<AuthEnv>();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ ok: true });
});

app.route('/auth', authRoutes);

// Everything below needs a logged-in user.
app.use('/today', requireAuth);
app.use('/entries', requireAuth);
app.use('/habits', requireAuth);
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

  const userId = c.get('user').id;
  const days = weekOf(date);
  const weekEntries = [
    ...getEntriesBetween(userId, days[0]!, addDays(days[6]!, 1)),
    ...getHabits(userId).flatMap((habit) => habitOccurrences(habit, days)),
  ];
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

// POST /focus/:id/toggle
app.post('/focus/:id/toggle', (c) => {
  const id = c.req.param('id');
  const session = toggleFocus(id);

  if (!session) {
    return c.json({ error: 'focus session not found' }, 404);
  }

  return c.json(session);
});
