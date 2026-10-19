import type { Entry, HabitDay } from '../types';
import { addDays, toDateKey } from './time';

/** Longest span /history answers for: a whole year, with room for a leap day. */
export const MAX_HISTORY_DAYS = 400;

/** Ranges on the profile chart. The 3-month view groups days into weeks so the bars stay readable. */
export const HISTORY_RANGES = [
  { key: 'week', label: 'Week', days: 7, daysPerBar: 1 },
  { key: 'month', label: 'Month', days: 30, daysPerBar: 1 },
  { key: 'quarter', label: '3 months', days: 91, daysPerBar: 7 },
] as const;

export type HistoryRangeKey = (typeof HISTORY_RANGES)[number]['key'];

export function historyRange(key: HistoryRangeKey): (typeof HISTORY_RANGES)[number] {
  return HISTORY_RANGES.find((r) => r.key === key)!;
}

/** Every day from `from` to `to`, both included. */
export function daysBetween(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const last = toDateKey(to);
  for (let day = addDays(from, 0); toDateKey(day) <= last; day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * Per day, how many habits were checked off and how many ended without being checked off.
 * Habits that haven't ended yet count as neither, so today doesn't look worse than it is.
 */
export function habitHistory(entries: Entry[], days: Date[], now: Date): HabitDay[] {
  const byDay = new Map(days.map((day) => [toDateKey(day), { date: toDateKey(day), done: 0, missed: 0 }]));
  for (const entry of entries) {
    if (entry.kind !== 'habit') continue;
    const day = byDay.get(toDateKey(new Date(entry.createdAt)));
    if (!day) continue;
    if (entry.done) day.done++;
    else if (new Date(entry.endsAt ?? entry.createdAt) <= now) day.missed++;
  }
  return [...byDay.values()];
}

export type HistoryBar = { from: string; to: string; done: number; missed: number };

/** Adds up consecutive days into bars of `daysPerBar` days each. */
export function historyBars(days: HabitDay[], daysPerBar: number): HistoryBar[] {
  const bars: HistoryBar[] = [];
  for (let i = 0; i < days.length; i += daysPerBar) {
    const chunk = days.slice(i, i + daysPerBar);
    bars.push({
      from: chunk[0]!.date,
      to: chunk.at(-1)!.date,
      done: chunk.reduce((n, d) => n + d.done, 0),
      missed: chunk.reduce((n, d) => n + d.missed, 0),
    });
  }
  return bars;
}

/** A month as calendar rows, Sunday first. Cells outside the month are null. */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const length = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));
}
