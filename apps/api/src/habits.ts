import { randomUUID } from 'node:crypto';
import { HabitRepeat, type CreateHabitInput, type Habit } from '@habitlonia/shared';
import { db } from './db';

type HabitRow = {
  id: string;
  title: string;
  tag: string | null;
  color: string;
  starts_on: string;
  start_minutes: number;
  end_minutes: number;
  repeat: string;
};

const toHabit = (row: HabitRow): Habit => ({
  id: row.id,
  title: row.title,
  tag: row.tag ?? undefined,
  color: row.color,
  startsOn: row.starts_on,
  startMinutes: row.start_minutes,
  endMinutes: row.end_minutes,
  repeat: HabitRepeat.parse(JSON.parse(row.repeat)),
});

const insertHabit = db.prepare(
  `INSERT INTO habits (id, user_id, title, tag, color, starts_on, start_minutes, end_minutes, repeat, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const selectForUser = db.prepare(
  `SELECT id, title, tag, color, starts_on, start_minutes, end_minutes, repeat FROM habits
   WHERE user_id = ? ORDER BY created_at`,
);

const selectOne = db.prepare(
  `SELECT id, title, tag, color, starts_on, start_minutes, end_minutes, repeat FROM habits
   WHERE id = ? AND user_id = ?`,
);

export function addHabit(userId: string, input: CreateHabitInput): Habit {
  const habit: Habit = { id: randomUUID(), ...input };
  insertHabit.run(
    habit.id,
    userId,
    habit.title,
    habit.tag ?? null,
    habit.color,
    habit.startsOn,
    habit.startMinutes,
    habit.endMinutes,
    JSON.stringify(habit.repeat),
    new Date().toISOString(),
  );
  return habit;
}

export function getHabits(userId: string): Habit[] {
  return (selectForUser.all(userId) as HabitRow[]).map(toHabit);
}

export function getHabit(userId: string, id: string): Habit | null {
  const row = selectOne.get(id, userId) as HabitRow | undefined;
  return row ? toHabit(row) : null;
}
