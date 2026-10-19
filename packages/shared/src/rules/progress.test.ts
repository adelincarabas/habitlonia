import { describe, expect, it } from 'vitest';
import type { HabitDay } from '../types';
import { addDays, toDateKey } from './time';
import { habitHealth, habitLevel, habitProgress, levelStartsAt } from './progress';

/** Consecutive days ending 2026-10-19, built from [done, missed] pairs. */
function history(pairs: [number, number][]): HabitDay[] {
  const last = new Date(2026, 9, 19);
  return pairs.map(([done, missed], i) => ({ date: toDateKey(addDays(last, i - pairs.length + 1)), done, missed }));
}

const TODAY = '2026-10-19';
const repeat = (n: number, pair: [number, number]) => Array.from({ length: n }, () => pair);
const earned = (days: HabitDay[]) =>
  Object.fromEntries(habitProgress(days, TODAY).milestones.map((m) => [m.key, m.earnedOn]));

describe('habit health', () => {
  it('stays quiet until there is enough history', () => {
    expect(habitHealth(history([[1, 0], [0, 1]]))).toBeNull();
  });

  it('scores a perfect month 100 and an empty one 0', () => {
    expect(habitHealth(history(repeat(28, [1, 0])))).toEqual({ score: 100, band: 'thriving', trend: 'level' });
    expect(habitHealth(history(repeat(28, [0, 1])))).toEqual({ score: 0, band: 'resting', trend: 'level' });
  });

  it('lets old misses fade: a bad start and a good finish scores higher than the reverse', () => {
    const recovering = habitHealth(history([...repeat(14, [0, 1]), ...repeat(14, [1, 0])]))!;
    const slipping = habitHealth(history([...repeat(14, [1, 0]), ...repeat(14, [0, 1])]))!;
    expect(recovering.score).toBeGreaterThan(60);
    expect(slipping.score).toBeLessThan(40);
    expect(recovering.trend).toBe('up');
    expect(slipping.trend).toBe('down');
  });

  it('ignores days with nothing planned', () => {
    const withRests = history([...repeat(10, [1, 0]), ...repeat(18, [0, 0])]);
    expect(habitHealth(withRests)!.score).toBe(100);
  });
});

describe('levels', () => {
  it('asks for 5 more check-offs each level', () => {
    expect([1, 2, 3, 4, 5].map(levelStartsAt)).toEqual([0, 5, 15, 30, 50]);
  });

  it('places a total between two levels', () => {
    expect(habitLevel(0)).toEqual({ level: 1, totalDone: 0, levelStartsAt: 0, nextLevelAt: 5 });
    expect(habitLevel(15)).toEqual({ level: 3, totalDone: 15, levelStartsAt: 15, nextLevelAt: 30 });
    expect(habitLevel(29).level).toBe(3);
  });
});

describe('milestones', () => {
  it('has none for a new account', () => {
    expect(Object.values(earned(history(repeat(3, [0, 0]))))).toEqual(Array(8).fill(null));
  });

  it('dates the first check-off and a full day, but not a full day that is still today', () => {
    const days = history([[0, 1], [1, 1], [2, 0]]);
    expect(earned(days)['first-step']).toBe('2026-10-18');
    expect(earned(days)['full-day']).toBeNull();
    expect(earned(history([[1, 0], [0, 0]]))['full-day']).toBe('2026-10-18');
  });

  it('counts a good week as 5 days with something done in any 7', () => {
    const days = history([[1, 0], [0, 1], [1, 0], [1, 0], [0, 0], [1, 0], [1, 0]]);
    expect(earned(days)['good-week']).toBe(TODAY);
    expect(earned(days.slice(0, 6))['good-week']).toBeNull();
  });

  it('rewards coming back after three quiet days, with rest days not breaking the run', () => {
    expect(earned(history([[0, 1], [0, 0], [0, 1], [0, 1], [1, 0]]))['comeback']).toBe(TODAY);
    expect(earned(history([[0, 1], [0, 1], [1, 0]]))['comeback']).toBeNull();
  });

  it('counts check-offs in all', () => {
    const days = history(repeat(30, [1, 0]));
    expect(earned(days)['done-25']).toBe('2026-10-14');
    expect(earned(days)['done-100']).toBeNull();
  });

  it('needs 8 in 10 over a finished 30-day stretch for a steady month', () => {
    const steady = history([...repeat(31, [4, 1]), [0, 0]]);
    expect(earned(steady)['steady-month']).not.toBeNull();
    expect(earned(history([...repeat(31, [3, 1]), [0, 0]]))['steady-month']).toBeNull();
  });
});
