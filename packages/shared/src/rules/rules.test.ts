import { describe, expect, it } from 'vitest';
import { defaultKindForTab, entriesForTab, summarizeDay } from './entries';
import { describeRepeat, habitOccurrences, habitOccursOn, repeatFor } from './habits';
import {
  clockRangeOn,
  focusElapsedSeconds,
  formatDuration,
  formatSpan,
  fromDateKey,
  greetingFor,
  parseClock,
  weekOf,
} from './time';
import { CreateEntryInput, CreateHabitInput, type Entry, type Habit } from '../types';

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

  it('requires habits to have an end after their start', () => {
    expect(CreateEntryInput.safeParse({ ...base, kind: 'habit' }).success).toBe(false);
    expect(
      CreateEntryInput.safeParse({ ...base, kind: 'habit', endsAt: '2026-10-18T09:00:00.000Z' }).success,
    ).toBe(false);
    expect(
      CreateEntryInput.safeParse({ ...base, kind: 'habit', endsAt: '2026-10-19T02:00:00.000Z' }).success,
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
    expect(defaultKindForTab('habits')).toBe('habit');
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

describe('habit rules', () => {
  const habit = (over: Partial<Habit>): Habit => ({
    id: 'h',
    title: 'run',
    color: '#2B4BDB',
    startsOn: '2026-10-14', // Wed
    startMinutes: 7 * 60,
    endMinutes: 8 * 60,
    repeat: { every: 'day' },
    ...over,
  });
  const day = (d: number) => new Date(2026, 9, d);

  it('repeats daily from its start day on', () => {
    const h = habit({});
    expect(habitOccursOn(h, day(13))).toBe(false);
    expect(habitOccursOn(h, day(14))).toBe(true);
    expect(habitOccursOn(h, new Date(2027, 0, 1))).toBe(true);
  });

  it('repeats weekly on the picked days only', () => {
    const h = habit({ repeat: { every: 'week', interval: 1, weekdays: [1, 3] } }); // Mon, Wed
    expect([14, 15, 16, 17, 18, 19, 20, 21].filter((d) => habitOccursOn(h, day(d)))).toEqual([14, 19, 21]);
  });

  it('skips every other week when biweekly, counting from the start week', () => {
    const h = habit({ repeat: { every: 'week', interval: 2, weekdays: [3] } });
    expect([14, 21, 28].map((d) => habitOccursOn(h, day(d)))).toEqual([true, false, true]);
    // Monday of the start week is before startsOn, so it doesn't count even though the week matches.
    expect(habitOccursOn(habit({ repeat: { every: 'week', interval: 2, weekdays: [1] } }), day(12))).toBe(false);
  });

  it('turns occurrences into timeline entries, running past midnight when needed', () => {
    const [occurrence] = habitOccurrences(habit({ startMinutes: 22 * 60, endMinutes: 60 }), [day(13), day(14)]);
    expect(occurrence).toMatchObject({ id: 'h@2026-10-14', kind: 'habit', habitId: 'h' });
    expect(occurrence!.createdAt).toBe(new Date(2026, 9, 14, 22).toISOString());
    expect(occurrence!.endsAt).toBe(new Date(2026, 9, 15, 1).toISOString());
  });

  it('maps the add screen presets to rules', () => {
    expect(repeatFor('once', [3])).toBeNull();
    expect(repeatFor('daily', [3])).toEqual({ every: 'day' });
    expect(repeatFor('biweekly', [5, 1])).toEqual({ every: 'week', interval: 2, weekdays: [1, 5] });
  });

  it('describes repeats', () => {
    expect(describeRepeat({ every: 'day' })).toBe('Every day');
    expect(describeRepeat({ every: 'week', interval: 1, weekdays: [5, 1] })).toBe('Every Mon, Fri');
    expect(describeRepeat({ every: 'week', interval: 1, weekdays: [1, 2, 3, 4, 5] })).toBe('Every weekday');
    expect(describeRepeat({ every: 'week', interval: 2, weekdays: [6] })).toBe('Every other week on Sat');
  });

  it('rejects a habit with no days or no length', () => {
    const { id: _, ...input } = habit({});
    expect(CreateHabitInput.safeParse(input).success).toBe(true);
    expect(CreateHabitInput.safeParse({ ...input, endMinutes: input.startMinutes }).success).toBe(false);
    expect(
      CreateHabitInput.safeParse({ ...input, repeat: { every: 'week', interval: 1, weekdays: [] } }).success,
    ).toBe(false);
  });
});
