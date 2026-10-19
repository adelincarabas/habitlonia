import { describe, expect, it } from 'vitest';
import type { Entry } from '../types';
import { writeRundown } from './rundown';

const day = new Date(2026, 9, 19);
const at = (h: number, m = 0) => new Date(2026, 9, 19, h, m).toISOString();

const habit = (id: string, title: string, start: number, end: number): Entry => ({
  id,
  kind: 'habit',
  title,
  color: '#2B4BDB',
  createdAt: at(start),
  endsAt: at(end),
  habitId: id,
});

const logged = (id: string, kind: Entry['kind'], title: string, h: number, tag?: string): Entry => ({
  id,
  kind,
  title,
  tag,
  color: '#E86BA0',
  createdAt: at(h),
});

const entries = [
  habit('stretch', 'Morning stretch', 7, 8),
  habit('work', 'Deep work', 10, 12),
  habit('run', 'Evening run', 19, 20),
  logged('m1', 'memory', 'coffee with Ana', 9),
  logged('f1', 'feeling', 'calm after the walk', 13, 'calm'),
];

describe('rundown', () => {
  it('splits the day into what is ahead and what has passed', () => {
    const { plan, recap } = writeRundown(entries, day, { now: new Date(2026, 9, 19, 15) });

    expect(plan.items.map((i) => i.title)).toEqual(['Evening run']);
    expect(plan.summary).toContain('Next up is Evening run at 19:00, in 4h');
    expect(recap.items.map((i) => i.title)).toEqual(['Morning stretch', 'coffee with Ana', 'Deep work', 'calm after the walk']);
    expect(recap.headline.toLowerCase()).toContain('calm');
    expect(recap.summary).toContain("You've written down 1 memory and 1 feeling.");
  });

  it('nudges missed habits to be done later while the day is still going', () => {
    const { recap } = writeRundown(entries, day, { now: new Date(2026, 9, 19, 15) });
    const nudges = recap.items.filter((i) => i.tone === 'nudge');

    expect(nudges.map((i) => i.title)).toEqual(['Morning stretch', 'Deep work']);
    expect(recap.summary).toContain("2 habits slipped by, and there's still time to fit them in later.");
  });

  it('points missed habits at next time once the day is over', () => {
    const { plan, recap } = writeRundown(entries, day, { now: new Date(2026, 9, 20, 9) });

    expect(plan.items).toEqual([]);
    expect(recap.summary).toContain('pick up again next time');
    expect(recap.items.filter((i) => i.tone === 'nudge')).toHaveLength(3);
  });

  it('treats checked-off habits as done instead of nudging them', () => {
    const { recap } = writeRundown(entries, day, {
      now: new Date(2026, 9, 19, 15),
      isDone: (h) => h.habitId === 'stretch',
    });

    expect(recap.items.find((i) => i.title === 'Morning stretch')?.tone).toBe('done');
    expect(recap.summary).toContain('You finished 1 of 2 habits.');
  });

  it('reads check-offs from the entries themselves', () => {
    const checked = entries.map((e) => (e.id === 'work' ? { ...e, done: true } : e));
    const { recap } = writeRundown(checked, day, { now: new Date(2026, 9, 19, 15) });

    expect(recap.items.find((i) => i.title === 'Deep work')?.tone).toBe('done');
    expect(recap.items.find((i) => i.title === 'Morning stretch')?.tone).toBe('nudge');
  });

  it('describes a habit that is happening right now', () => {
    const { plan } = writeRundown(entries, day, { now: new Date(2026, 9, 19, 10, 30) });

    expect(plan.summary).toContain('Deep work is on right now, until 12:00.');
    expect(plan.items[0]?.title).toBe('Deep work');
  });

  it('has nothing to recap for a day that has not started', () => {
    const { plan, recap } = writeRundown(entries, day, { now: new Date(2026, 9, 18, 20) });

    expect(plan.items).toHaveLength(3);
    expect(plan.summary).toContain('The day starts with Morning stretch at 07:00.');
    expect(recap.items).toEqual([]);
  });

  it('handles an empty day', () => {
    const { plan, recap } = writeRundown([], day, { now: new Date(2026, 9, 19, 23) });

    expect(plan.items).toEqual([]);
    expect(recap.items).toEqual([]);
    expect(recap.summary).toContain('Nothing logged yet');
  });

  it('words the same day the same way every time', () => {
    const now = new Date(2026, 9, 19, 15);
    expect(writeRundown(entries, day, { now })).toEqual(writeRundown(entries, day, { now }));
  });
});
