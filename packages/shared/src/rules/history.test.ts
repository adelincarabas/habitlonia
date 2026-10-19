import { describe, expect, it } from 'vitest';
import type { Entry } from '../types';
import {
  HEATMAP_WEEKS,
  daysBetween,
  habitHistory,
  habitStreaks,
  heatLevel,
  heatmapMonthStarts,
  heatmapWeeks,
  historyBars,
  monthGrid,
} from './history';

const habit = (id: string, day: number, start: number, done?: boolean): Entry => ({
  id,
  kind: 'habit',
  title: id,
  color: '#2B4BDB',
  createdAt: new Date(2026, 9, day, start).toISOString(),
  endsAt: new Date(2026, 9, day, start + 1).toISOString(),
  done,
});

describe('history', () => {
  it('lists every day of a range, both ends included', () => {
    const days = daysBetween(new Date(2026, 9, 30), new Date(2026, 10, 2));
    expect(days.map((d) => d.getDate())).toEqual([30, 31, 1, 2]);
  });

  it('counts done habits and missed ones, but not habits still ahead', () => {
    const entries = [
      habit('a', 18, 8, true),
      habit('b', 18, 10),
      habit('c', 19, 8, true),
      habit('d', 19, 20),
      { ...habit('memory', 19, 9), kind: 'memory' as const, endsAt: undefined },
    ];
    const days = daysBetween(new Date(2026, 9, 18), new Date(2026, 9, 20));

    expect(habitHistory(entries, days, new Date(2026, 9, 19, 15))).toEqual([
      { date: '2026-10-18', done: 1, missed: 1 },
      { date: '2026-10-19', done: 1, missed: 0 },
      { date: '2026-10-20', done: 0, missed: 0 },
    ]);
  });

  it('adds days up into bars', () => {
    const days = Array.from({ length: 10 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, done: 1, missed: i % 2 }));
    const bars = historyBars(days, 7);

    expect(bars).toEqual([
      { from: '2026-10-01', to: '2026-10-07', done: 7, missed: 3 },
      { from: '2026-10-08', to: '2026-10-10', done: 3, missed: 2 },
    ]);
  });

  it('lays a month out in Sunday-first weeks', () => {
    // October 2026 starts on a Thursday and has 31 days.
    const grid = monthGrid(2026, 9);

    expect(grid).toHaveLength(5);
    expect(grid[0]!.slice(0, 4)).toEqual([null, null, null, null]);
    expect(grid[0]![4]?.getDate()).toBe(1);
    expect(grid.at(-1)!.filter(Boolean).at(-1)?.getDate()).toBe(31);
  });

  it('lays the heatmap out as a year of Sunday-first weeks ending today', () => {
    // 2026-10-19 is a Monday.
    const weeks = heatmapWeeks(new Date(2026, 9, 19));

    expect(weeks).toHaveLength(HEATMAP_WEEKS);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]![0]).toEqual(new Date(2025, 9, 19));
    expect(weeks.at(-1)!.map((day) => day?.getDate() ?? null)).toEqual([18, 19, null, null, null, null, null]);
  });

  it('shades a day by how much of it got done', () => {
    expect(heatLevel(undefined)).toBe(0);
    expect(heatLevel({ date: '2026-10-19', done: 0, missed: 0 })).toBe(0);
    expect(heatLevel({ date: '2026-10-19', done: 0, missed: 3 })).toBe(0);
    expect(heatLevel({ date: '2026-10-19', done: 1, missed: 3 })).toBe(1);
    expect(heatLevel({ date: '2026-10-19', done: 1, missed: 1 })).toBe(2);
    expect(heatLevel({ date: '2026-10-19', done: 2, missed: 1 })).toBe(3);
    expect(heatLevel({ date: '2026-10-19', done: 2, missed: 0 })).toBe(4);
  });

  it('labels the heatmap columns where a month starts', () => {
    const starts = heatmapMonthStarts(heatmapWeeks(new Date(2026, 9, 19)));

    expect(starts[0]).toEqual({ week: 0, month: 9 });
    // November 2025's first Sunday is the 2nd, two weeks after 2025-10-19.
    expect(starts[1]).toEqual({ week: 2, month: 10 });
    expect(starts).toHaveLength(13);
  });

  it('counts streaks, skipping days with nothing due', () => {
    const day = (done: number, missed: number) => ({ date: '', done, missed });
    const days = [day(1, 0), day(2, 1), day(0, 1), day(1, 0), day(0, 0), day(1, 2), day(1, 0), day(0, 0)];

    expect(habitStreaks(days)).toEqual({ current: 3, longest: 3, activeDays: 5 });
    expect(habitStreaks([day(1, 0), day(1, 0), day(0, 2)])).toEqual({ current: 0, longest: 2, activeDays: 2 });
  });
});
