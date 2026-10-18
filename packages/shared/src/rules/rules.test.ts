import { describe, expect, it } from 'vitest';
import { defaultKindForTab, entriesForTab, summarizeDay } from './entries';
import {
  clockRangeOn,
  focusElapsedSeconds,
  formatDuration,
  formatSpan,
  fromDateKey,
  greetingFor,
  isDarkOut,
  parseClock,
  weekOf,
} from './time';
import { CreateEntryInput, type Entry } from '../types';

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
    expect(greetingFor(new Date(2026, 0, 1, 14))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 0, 1, 20))).toBe('Good evening');
    expect(greetingFor(new Date(2026, 0, 1, 23))).toBe('Good night');
    expect(greetingFor(new Date(2026, 0, 1, 1, 30))).toBe('Good night');
    expect(greetingFor(new Date(2026, 0, 1, 5))).toBe('Good morning');
  });

  it('knows when it is dark out', () => {
    expect(isDarkOut(new Date(2026, 0, 1, 12))).toBe(false);
    expect(isDarkOut(new Date(2026, 0, 1, 19))).toBe(true);
    expect(isDarkOut(new Date(2026, 0, 1, 3))).toBe(true);
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

  it('parses 24-hour clock text', () => {
    expect(parseClock('10:00')).toBe(600);
    expect(parseClock('2:05')).toBe(125);
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('10:60')).toBeNull();
    expect(parseClock('10')).toBeNull();
  });

  it('parses date keys and rejects impossible dates', () => {
    expect(fromDateKey('2026-10-18')).toEqual(new Date(2026, 9, 18));
    expect(fromDateKey('2026-02-30')).toBeNull();
    expect(fromDateKey('yesterday')).toBeNull();
  });

  it('rolls a range that ends before it starts into the next day', () => {
    const day = new Date(2026, 9, 18);
    expect(clockRangeOn(day, 600, 120)).toEqual({
      start: new Date(2026, 9, 18, 10, 0),
      end: new Date(2026, 9, 19, 2, 0),
    });
    expect(clockRangeOn(day, 600, 690)?.end).toEqual(new Date(2026, 9, 18, 11, 30));
    expect(clockRangeOn(day, 600, 600)).toBeNull();
  });

  it('formats spans', () => {
    expect(formatSpan(960)).toBe('16h');
    expect(formatSpan(90)).toBe('1h 30m');
    expect(formatSpan(45)).toBe('45m');
  });
});

describe('create entry input', () => {
  const base = { title: 't', color: '#2B4BDB', createdAt: '2026-10-18T10:00:00.000Z' };

  it('requires actions to have an end after their start', () => {
    expect(CreateEntryInput.safeParse({ ...base, kind: 'action' }).success).toBe(false);
    expect(
      CreateEntryInput.safeParse({ ...base, kind: 'action', endsAt: '2026-10-18T09:00:00.000Z' }).success,
    ).toBe(false);
    expect(
      CreateEntryInput.safeParse({ ...base, kind: 'action', endsAt: '2026-10-19T02:00:00.000Z' }).success,
    ).toBe(true);
  });

  it('keeps memories to a single moment', () => {
    expect(CreateEntryInput.safeParse({ ...base, kind: 'memory' }).success).toBe(true);
    expect(
      CreateEntryInput.safeParse({ ...base, kind: 'memory', endsAt: '2026-10-18T11:00:00.000Z' }).success,
    ).toBe(false);
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

  it('defaults a new entry to the open tab', () => {
    expect(defaultKindForTab('memories')).toBe('memory');
    expect(defaultKindForTab('actions')).toBe('action');
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
