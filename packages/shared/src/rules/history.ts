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

/** Columns on the consistency heatmap: a year, plus the week in progress. */
export const HEATMAP_WEEKS = 53;

/**
 * The consistency heatmap as Sunday-first week columns, oldest first, ending with the week of `today`.
 * Days after today are null.
 */
export function heatmapWeeks(today: Date): (Date | null)[][] {
  const last = toDateKey(today);
  const start = addDays(today, -today.getDay() - (HEATMAP_WEEKS - 1) * 7);
  return Array.from({ length: HEATMAP_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = addDays(start, week * 7 + weekday);
      return toDateKey(day) <= last ? day : null;
    }),
  );
}

/** Shade steps on the heatmap, from "nothing done" to "everything done". */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** How much of the day's habits got done: 0 when none were, 4 when all of them were. */
export function heatLevel(day: HabitDay | undefined): HeatLevel {
  if (!day?.done) return 0;
  const rate = day.done / (day.done + day.missed);
  if (rate === 1) return 4;
  if (rate >= 2 / 3) return 3;
  if (rate >= 1 / 3) return 2;
  return 1;
}

/** Which heatmap columns start a new month, for the labels above them. */
export function heatmapMonthStarts(weeks: (Date | null)[][]): { week: number; month: number }[] {
  const starts: { week: number; month: number }[] = [];
  weeks.forEach((days, week) => {
    const month = days[0]!.getMonth();
    if (week === 0 || month !== weeks[week - 1]![0]!.getMonth()) starts.push({ week, month });
  });
  return starts;
}

/**
 * Runs of days with at least one habit done, `days` being consecutive and oldest first.
 * A day where habits were missed and none were done ends a run; a day with nothing due neither
 * adds to it nor ends it, so weekly habits and today-in-progress don't break a streak.
 */
export function habitStreaks(days: HabitDay[]): { current: number; longest: number; activeDays: number } {
  let run = 0;
  let longest = 0;
  let activeDays = 0;
  for (const day of days) {
    if (day.done) {
      run++;
      activeDays++;
      longest = Math.max(longest, run);
    } else if (day.missed) {
      run = 0;
    }
  }
  return { current: run, longest, activeDays };
}
