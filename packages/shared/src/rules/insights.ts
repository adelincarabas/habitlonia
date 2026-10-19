import type { Entry, Insight } from '../types';
import { findFeeling, type FeelingFamilyKey } from './feelings';
import { fromDateKey, toDateKey } from './time';

/**
 * Smart insights: plain counting over the user's history, no model. Every insight compares how
 * often something happens in two groups of days (with vs. without a habit, one weekday vs. the
 * rest) and is only reported when both groups are big enough and the gap between them is wide.
 */

/** How far back /insights looks. */
export const INSIGHT_DAYS = 90;

/** Fewest days each side of a comparison needs before it's worth saying anything. */
const MIN_DAYS = 4;
/** Smallest gap between the two sides' rates, so noise doesn't read as a pattern. */
const MIN_GAP = 0.15;

const WEEKDAY_FULL_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const GOOD_FAMILIES: readonly FeelingFamilyKey[] = ['joy', 'peace', 'love', 'courage'];

type Rate = { hits: number; total: number };
type Scored = Insight & { score: number };

/** One habit's record: for each day it was due and its time had ended, whether it got done. */
type Track = { title: string; color: string; days: Map<string, boolean> };

const rate = ({ hits, total }: Rate) => hits / total;

/** A gap counts for more when it rests on more days. */
const scoreOf = (gap: number, a: Rate, b: Rate) => Math.abs(gap) * Math.sqrt(Math.min(a.total, b.total));

const percent = (r: number) => `${Math.round(r * 100)}%`;
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/** "40% more often", "2.5× as often", "35% less often". */
function howMuchMore(more: number, less: number): string {
  if (more >= less * 2) return `${(Math.round((more / less) * 10) / 10).toString()}× as often`;
  return `${Math.round((more / less - 1) * 100)}% more often`;
}

/** Ended habit occurrences grouped by habit. One-off habits are grouped by their title. */
function habitTracks(entries: Entry[], now: Date): Track[] {
  const tracks = new Map<string, Track>();
  for (const entry of entries) {
    if (entry.kind !== 'habit' || new Date(entry.endsAt ?? entry.createdAt) > now) continue;
    const key = entry.habitId ?? `title:${entry.title.trim().toLowerCase()}`;
    const track = tracks.get(key) ?? { title: entry.title, color: entry.color, days: new Map() };
    tracks.set(key, track);
    const day = toDateKey(new Date(entry.createdAt));
    track.days.set(day, track.days.get(day) === true || entry.done === true);
  }
  return [...tracks.values()];
}

/** "You finish Workout 40% more often on days you do Meditate." */
function pairInsight(cause: Track, effect: Track): Scored | null {
  const withIt: Rate = { hits: 0, total: 0 };
  const without: Rate = { hits: 0, total: 0 };
  for (const [day, causeDone] of cause.days) {
    const effectDone = effect.days.get(day);
    if (effectDone === undefined) continue;
    const side = causeDone ? withIt : without;
    side.total++;
    if (effectDone) side.hits++;
  }
  if (withIt.total < MIN_DAYS || without.total < MIN_DAYS) return null;

  const gap = rate(withIt) - rate(without);
  if (Math.abs(gap) < MIN_GAP) return null;

  let text: string;
  if (gap > 0) {
    text =
      without.hits === 0
        ? `You only finish ${effect.title} on days you also do ${cause.title}.`
        : `You finish ${effect.title} ${howMuchMore(rate(withIt), rate(without))} on days you do ${cause.title}.`;
  } else {
    text =
      withIt.hits === 0
        ? `You never finish ${effect.title} on days you do ${cause.title}.`
        : `You finish ${effect.title} ${Math.round((1 - rate(withIt) / rate(without)) * 100)}% less often on days you do ${cause.title}.`;
  }

  return {
    kind: 'pair',
    text,
    detail: `Done on ${withIt.hits} of ${days(withIt.total)} with ${cause.title}, vs ${without.hits} of ${days(without.total)} without.`,
    tone: gap > 0 ? 'up' : 'down',
    color: effect.color,
    score: scoreOf(gap, withIt, without),
  };
}

/** The stronger direction of each pair of habits; both directions usually say the same thing. */
function pairInsights(tracks: Track[]): Scored[] {
  const found: Scored[] = [];
  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      const best = [pairInsight(tracks[i]!, tracks[j]!), pairInsight(tracks[j]!, tracks[i]!)]
        .filter((insight) => insight !== null)
        .sort((a, b) => b.score - a.score)[0];
      if (best) found.push(best);
    }
  }
  return found;
}

/** "Your weakest day is Thursday." and "Your strongest day is Monday." */
function weekdayInsights(tracks: Track[]): Scored[] {
  const byWeekday: Rate[] = Array.from({ length: 7 }, () => ({ hits: 0, total: 0 }));
  for (const track of tracks) {
    for (const [day, done] of track.days) {
      const weekday = byWeekday[fromDateKey(day)!.getDay()]!;
      weekday.total++;
      if (done) weekday.hits++;
    }
  }
  const all: Rate = byWeekday.reduce((sum, r) => ({ hits: sum.hits + r.hits, total: sum.total + r.total }), { hits: 0, total: 0 });

  const compared = byWeekday
    .map((r, weekday) => ({ weekday, r, rest: { hits: all.hits - r.hits, total: all.total - r.total } }))
    .filter(({ r, rest }) => r.total >= MIN_DAYS && rest.total >= MIN_DAYS)
    .map((c) => ({ ...c, gap: rate(c.r) - rate(c.rest) }));
  if (compared.length < 2) return [];

  const weakest = compared.reduce((a, b) => (b.gap < a.gap ? b : a));
  const strongest = compared.reduce((a, b) => (b.gap > a.gap ? b : a));
  const found: Scored[] = [];
  for (const [c, word] of [
    [weakest, 'weakest'],
    [strongest, 'strongest'],
  ] as const) {
    if ((word === 'weakest' ? -c.gap : c.gap) < MIN_GAP) continue;
    const name = WEEKDAY_FULL_NAMES[c.weekday];
    found.push({
      kind: 'weekday',
      text: `Your ${word} day is ${name}.`,
      detail: `You finish ${percent(rate(c.r))} of habits on ${name}s, vs ${percent(rate(c.rest))} on other days.`,
      tone: word === 'weakest' ? 'down' : 'up',
      score: scoreOf(c.gap, c.r, c.rest),
    });
  }
  return found;
}

/** Per day, whether the feelings logged were mostly good (true) or mostly hard (false). Mixed days are left out. */
function moodByDay(entries: Entry[], now: Date): Map<string, boolean> {
  const tally = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind !== 'feeling' || !entry.tag || new Date(entry.createdAt) > now) continue;
    const found = findFeeling(entry.tag);
    if (!found) continue;
    const day = toDateKey(new Date(entry.createdAt));
    tally.set(day, (tally.get(day) ?? 0) + (GOOD_FAMILIES.includes(found.family.key) ? 1 : -1));
  }
  return new Map([...tally].filter(([, n]) => n !== 0).map(([day, n]) => [day, n > 0]));
}

/** "You feel better on days you do Meditate." */
function feelingInsights(tracks: Track[], mood: Map<string, boolean>): Scored[] {
  const found: Scored[] = [];
  for (const track of tracks) {
    const withIt: Rate = { hits: 0, total: 0 };
    const without: Rate = { hits: 0, total: 0 };
    for (const [day, done] of track.days) {
      const good = mood.get(day);
      if (good === undefined) continue;
      const side = done ? withIt : without;
      side.total++;
      if (good) side.hits++;
    }
    if (withIt.total < MIN_DAYS || without.total < MIN_DAYS) continue;

    const gap = rate(withIt) - rate(without);
    if (Math.abs(gap) < MIN_GAP) continue;
    found.push({
      kind: 'feeling',
      text: gap > 0 ? `You feel better on days you do ${track.title}.` : `Days you do ${track.title} tend to feel harder.`,
      detail: `${percent(rate(withIt))} of days with it felt good, vs ${percent(rate(without))} of days without.`,
      tone: gap > 0 ? 'up' : 'down',
      color: track.color,
      score: scoreOf(gap, withIt, without),
    });
  }
  return found;
}

/**
 * Patterns in `entries` (habit occurrences, as /history gets them, plus logged feelings), strongest
 * first. Habits whose time hasn't ended by `now` are left out, like on the history chart.
 */
export function findInsights(entries: Entry[], now: Date, limit = 5): Insight[] {
  const tracks = habitTracks(entries, now);
  return [...pairInsights(tracks), ...weekdayInsights(tracks), ...feelingInsights(tracks, moodByDay(entries, now))]
    .sort((a, b) => b.score - a.score || a.text.localeCompare(b.text))
    .slice(0, limit)
    .map(({ score: _, ...insight }) => insight);
}
