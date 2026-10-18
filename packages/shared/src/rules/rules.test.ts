import { describe, expect, it } from 'vitest';
import { entriesForTab, summarizeDay } from './entries';
import { focusElapsedSeconds, formatDuration, greetingFor, weekOf } from './time';
import type { Entry } from '../types';

const entry = (over: Partial<Entry>): Entry => ({
  id: '1',
  kind: 'memory',
  title: 't',
  createdAt: new Date(2026, 9, 17, 6, 55).toISOString(),
  color: '#2B4BDB',
  ...over,
});

describe('time rules', () => {
  it('formats durations', () => {
    expect(formatDuration(3 * 3600 + 45 * 60 + 39)).toBe('3:45:39');
    expect(formatDuration(-5)).toBe('0:00:00');
  });

  it('builds a Sunday-first week', () => {
    const week = weekOf(new Date(2026, 9, 14)); // Wed
    expect(week).toHaveLength(7);
    expect(week[0]!.getDay()).toBe(0);
    expect(week[0]!.getDate()).toBe(11);
  });

  it('greets by time of day', () => {
    expect(greetingFor(new Date(2026, 0, 1, 8))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 0, 1, 20))).toBe('Good evening');
  });

  it('adds running time to accumulated focus time', () => {
    const now = new Date('2026-10-17T10:00:10Z');
    expect(
      focusElapsedSeconds(
        { id: 'f', label: 'x', accumulatedSeconds: 50, runningSince: '2026-10-17T10:00:00Z' },
        now,
      ),
    ).toBe(60);
  });
});

describe('entry rules', () => {
  it('filters by tab and sorts newest first', () => {
    const list = [
      entry({ id: 'a', createdAt: '2026-10-17T01:00:00Z' }),
      entry({ id: 'b', kind: 'thought', createdAt: '2026-10-17T05:00:00Z' }),
      entry({ id: 'c', kind: 'feeling' }),
    ];
    expect(entriesForTab(list, 'memories').map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('summarizes a day with its top two colors', () => {
    const day = new Date(2026, 9, 17);
    const s = summarizeDay(day, [
      entry({ color: '#111' }),
      entry({ color: '#222' }),
      entry({ color: '#222' }),
      entry({ color: '#333', createdAt: new Date(2026, 9, 18).toISOString() }),
    ]);
    expect(s).toEqual({ date: '2026-10-17', colors: ['#222', '#111'] });
  });
});
