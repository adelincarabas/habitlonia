import { describe, expect, it } from 'vitest';
import type { Entry } from '../types';
import { findInsights } from './insights';

// October 2026: the 1st is a Thursday.
const now = new Date(2026, 10, 1, 12);

const habit = (habitId: string, day: number, done: boolean): Entry => ({
  id: `${habitId}@${day}`,
  kind: 'habit',
  title: habitId,
  color: '#2B4BDB',
  createdAt: new Date(2026, 9, day, 8).toISOString(),
  endsAt: new Date(2026, 9, day, 9).toISOString(),
  habitId,
  done: done || undefined,
});

const feeling = (day: number, tag: string): Entry => ({
  id: `f${day}`,
  kind: 'feeling',
  title: tag,
  tag,
  color: '#E86BA0',
  createdAt: new Date(2026, 9, day, 20).toISOString(),
});

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('insights', () => {
  it('finds a habit that goes with another', () => {
    // Workout is done 5 of 6 days with Meditate, and 1 of 6 days without.
    const entries = [
      ...range(1, 12).map((d) => habit('Meditate', d, d <= 6)),
      ...range(1, 12).map((d) => habit('Workout', d, d <= 5 || d === 12)),
    ];

    const [top] = findInsights(entries, now);
    expect(top).toMatchObject({ kind: 'pair', tone: 'up' });
    expect(top!.text).toBe('You finish Workout 5× as often on days you do Meditate.');
    expect(top!.detail).toBe('Done on 5 of 6 days with Meditate, vs 1 of 6 days without.');
  });

  it('says how much more in percent when it is less than double', () => {
    // Read: 6 of 6 days with Walk, 4 of 6 without.
    const entries = [
      ...range(1, 12).map((d) => habit('Walk', d, d <= 6)),
      ...range(1, 12).map((d) => habit('Read', d, d <= 6 || d === 7 || d === 8 || d === 9 || d === 10)),
    ];

    expect(findInsights(entries, now).map((i) => i.text)).toContain('You finish Read 50% more often on days you do Walk.');
  });

  it('stays quiet about small gaps and too few days', () => {
    const entries = [
      ...range(1, 3).map((d) => habit('Meditate', d, d <= 2)),
      ...range(1, 3).map((d) => habit('Workout', d, d <= 2)),
    ];

    expect(findInsights(entries, now)).toEqual([]);
  });

  it('names the weakest weekday', () => {
    // Four weeks; every habit on a Thursday is missed, everything else is done.
    const entries = range(1, 28).map((d) => habit('Stretch', d, new Date(2026, 9, d).getDay() !== 4));

    const weakest = findInsights(entries, now).find((i) => i.kind === 'weekday' && i.tone === 'down');
    expect(weakest?.text).toBe('Your weakest day is Thursday.');
    expect(weakest?.detail).toBe('You finish 0% of habits on Thursdays, vs 100% on other days.');
  });

  it('links a habit to how the day felt', () => {
    const entries = [
      ...range(1, 10).map((d) => habit('Walk', d, d <= 5)),
      ...range(1, 10).map((d) => feeling(d, d <= 5 ? 'calm' : d === 6 ? 'happy' : 'anxious')),
    ];

    const found = findInsights(entries, now).find((i) => i.kind === 'feeling');
    expect(found?.text).toBe('You feel better on days you do Walk.');
    expect(found?.detail).toBe('100% of days with it felt good, vs 20% of days without.');
  });

  it('leaves out habits whose time has not ended yet', () => {
    const entries = [
      ...range(1, 12).map((d) => habit('Meditate', d, d <= 6)),
      ...range(1, 12).map((d) => habit('Workout', d, d <= 5 || d === 12)),
    ];

    // Before the 9th, Workout has only 2 days without Meditate to compare.
    expect(findInsights(entries, new Date(2026, 9, 8, 12))).toEqual([]);
  });
});
