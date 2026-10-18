import type { Entry, Habit, HabitRepeat } from '../types';
import { clockRangeOn, fromDateKey, toDateKey, WEEKDAY_NAMES } from './time';

/** Presets on the add screen. Weekly and biweekly also take a set of weekdays. */
export const REPEAT_OPTIONS = [
  { key: 'once', label: 'Once' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Biweekly' },
] as const;

export type RepeatOption = (typeof REPEAT_OPTIONS)[number]['key'];

/** The repeat rule a preset stands for, or null for a one-off habit. */
export function repeatFor(option: RepeatOption, weekdays: number[]): HabitRepeat | null {
  switch (option) {
    case 'once':
      return null;
    case 'daily':
      return { every: 'day' };
    case 'weekly':
    case 'biweekly':
      return { every: 'week', interval: option === 'weekly' ? 1 : 2, weekdays: [...weekdays].sort((a, b) => a - b) };
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole weeks between the Sundays starting the weeks of `from` and `to`. */
function weeksBetween(from: Date, to: Date): number {
  const sunday = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  // Rounded because a DST change makes a week an hour shorter or longer.
  return Math.round((sunday(to).getTime() - sunday(from).getTime()) / (7 * DAY_MS));
}

export function habitOccursOn(habit: Habit, day: Date): boolean {
  const start = fromDateKey(habit.startsOn);
  if (!start || toDateKey(day) < habit.startsOn) return false;
  const { repeat } = habit;
  if (repeat.every === 'day') return true;
  return repeat.weekdays.includes(day.getDay()) && weeksBetween(start, day) % repeat.interval === 0;
}

/** The habit's occurrences on `days`, shaped as entries so they sit on the timeline next to everything else. */
export function habitOccurrences(habit: Habit, days: Date[]): Entry[] {
  return days.flatMap((day) => {
    if (!habitOccursOn(habit, day)) return [];
    const range = clockRangeOn(day, habit.startMinutes, habit.endMinutes);
    if (!range) return [];
    return [
      {
        id: `${habit.id}@${toDateKey(day)}`,
        kind: 'habit',
        title: habit.title,
        tag: habit.tag,
        color: habit.color,
        createdAt: range.start.toISOString(),
        endsAt: range.end.toISOString(),
        habitId: habit.id,
      },
    ];
  });
}

/** "Every day", "Every weekday", "Every Mon, Wed", "Every other week on Fri". */
export function describeRepeat(repeat: HabitRepeat): string {
  if (repeat.every === 'day') return 'Every day';
  const days = [...repeat.weekdays].sort((a, b) => a - b);
  const names = days.join() === '1,2,3,4,5' ? 'weekday' : days.map((d) => WEEKDAY_NAMES[d]).join(', ');
  return repeat.interval === 2 ? `Every other week on ${names}` : `Every ${names}`;
}
