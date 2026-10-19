import type { HabitDay, HabitHealth, HabitHealthBand, HabitLevel, Milestone, MilestoneKey, ProgressResponse } from '../types';

/**
 * Gentle gamification: a health score, levels and a handful of milestones, all worked out from
 * per-day habit history. Deliberately no streak counter, no points and nothing that can be lost:
 * levels only count check-offs, milestones stay once reached, and the score forgives old misses.
 */

/** Days the health score looks back over. */
export const HEALTH_WINDOW_DAYS = 28;
/** A day this many days old counts half as much as today. */
const HEALTH_HALF_LIFE_DAYS = 10;
/** Fewer scheduled habits than this in the window and the score would just be noise. */
const HEALTH_MIN_SCHEDULED = 3;

const HEALTH_BANDS: [number, HabitHealthBand][] = [
  [85, 'thriving'],
  [65, 'steady'],
  [40, 'growing'],
  [0, 'resting'],
];

export const HEALTH_BAND_TEXT: Record<HabitHealthBand, { label: string; note: string }> = {
  thriving: { label: 'Thriving', note: 'Your habits are part of your days now.' },
  steady: { label: 'Steady', note: 'Most of what you plan is getting done.' },
  growing: { label: 'Growing', note: "Some days land, some don't. That's how habits form." },
  resting: { label: 'Resting', note: 'A quiet stretch. One check-off is enough to start again.' },
};

const rate = (days: HabitDay[]) => {
  const done = days.reduce((n, d) => n + d.done, 0);
  const total = done + days.reduce((n, d) => n + d.missed, 0);
  return total ? done / total : null;
};

/** `days` oldest first, ending today. Days with nothing scheduled neither help nor hurt. */
export function habitHealth(days: HabitDay[]): HabitHealth | null {
  const recent = days.slice(-HEALTH_WINDOW_DAYS);
  let weighted = 0;
  let weights = 0;
  let scheduled = 0;
  recent.forEach((day, i) => {
    const age = recent.length - 1 - i;
    const weight = 0.5 ** (age / HEALTH_HALF_LIFE_DAYS);
    weighted += weight * day.done;
    weights += weight * (day.done + day.missed);
    scheduled += day.done + day.missed;
  });
  if (scheduled < HEALTH_MIN_SCHEDULED) return null;

  const score = Math.round((weighted / weights) * 100);
  const half = Math.floor(recent.length / 2);
  const before = rate(recent.slice(0, half));
  const after = rate(recent.slice(half));
  // Ten points either way before calling it a trend, so the arrow doesn't flicker day to day.
  const delta = before === null || after === null ? 0 : after - before;
  return {
    score,
    band: HEALTH_BANDS.find(([min]) => score >= min)![1],
    trend: delta >= 0.1 ? 'up' : delta <= -0.1 ? 'down' : 'level',
  };
}

/** Check-offs needed to reach `level`: 0, 5, 15, 30, 50, 75… each level asks for 5 more than the last. */
export function levelStartsAt(level: number): number {
  return (5 * (level - 1) * level) / 2;
}

export function habitLevel(totalDone: number): HabitLevel {
  let level = 1;
  while (levelStartsAt(level + 1) <= totalDone) level++;
  return { level, totalDone, levelStartsAt: levelStartsAt(level), nextLevelAt: levelStartsAt(level + 1) };
}

type MilestoneDef = { key: MilestoneKey; title: string; description: string };

export const MILESTONES: readonly MilestoneDef[] = [
  { key: 'first-step', title: 'First step', description: 'Checked off your first habit.' },
  { key: 'full-day', title: 'Full day', description: 'Did every habit planned for a day.' },
  { key: 'good-week', title: 'Good week', description: 'Checked off habits on 5 days within a week.' },
  { key: 'comeback', title: 'Back at it', description: 'Picked a habit up again after a few quiet days.' },
  { key: 'steady-month', title: 'Steady month', description: 'Did 8 in 10 of your habits over 30 days.' },
  { key: 'done-25', title: '25 check-offs', description: 'Checked off 25 habits in all.' },
  { key: 'done-100', title: '100 check-offs', description: 'Checked off 100 habits in all.' },
  { key: 'done-365', title: '365 check-offs', description: "A year's worth of check-offs." },
];

/** The first date each milestone was reached. Today only counts once it's over, for anything about whole days. */
function earnedDates(days: HabitDay[], todayKey: string): Partial<Record<MilestoneKey, string>> {
  const earned: Partial<Record<MilestoneKey, string>> = {};
  const earn = (key: MilestoneKey, date: string) => (earned[key] ??= date);

  let total = 0;
  let quietDays = 0;
  days.forEach((day, i) => {
    total += day.done;
    if (day.done > 0) earn('first-step', day.date);
    for (const n of [25, 100, 365] as const) if (total >= n) earn(`done-${n}`, day.date);

    if (day.date < todayKey && day.done > 0 && day.missed === 0) earn('full-day', day.date);

    // Quiet = something was planned and none of it got done. Days with nothing planned don't break the run.
    if (day.done > 0) {
      if (quietDays >= 3) earn('comeback', day.date);
      quietDays = 0;
    } else if (day.missed > 0) {
      quietDays++;
    }

    const week = days.slice(Math.max(0, i - 6), i + 1);
    if (week.filter((d) => d.done > 0).length >= 5) earn('good-week', day.date);

    if (i >= 29 && day.date < todayKey) {
      const month = days.slice(i - 29, i + 1);
      const scheduled = month.reduce((n, d) => n + d.done + d.missed, 0);
      if (scheduled >= 20 && rate(month)! >= 0.8) earn('steady-month', day.date);
    }
  });
  return earned;
}

/** Everything the profile's progress card shows. `days` runs oldest first, from the first habit to today. */
export function habitProgress(days: HabitDay[], todayKey: string): ProgressResponse {
  const earned = earnedDates(days, todayKey);
  const milestones: Milestone[] = MILESTONES.map((m) => ({ ...m, earnedOn: earned[m.key] ?? null }));
  return {
    health: habitHealth(days),
    level: habitLevel(days.reduce((n, d) => n + d.done, 0)),
    milestones,
  };
}
