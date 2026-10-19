import type { Entry, EntryKind } from '../types';
import { dayPeriod, formatClock, formatClockRange, formatSpan, toDateKey } from './time';

/**
 * The Rundown: a plan for the rest of the day and a recap of what's happened so far, written from
 * hand-made rules. Phrasings are picked per day and per habit, so the page reads differently from
 * one day to the next but stays the same while you look at it.
 */

/** tip: advice for something ahead. nudge: a habit that slipped by. done: a finished habit. note: a logged entry. */
export type RundownTone = 'tip' | 'nudge' | 'done' | 'note';

export type RundownItem = { title: string; time: string; note: string; tone: RundownTone };
export type RundownSection = { headline: string; summary: string; items: RundownItem[] };
export type Rundown = { plan: RundownSection; recap: RundownSection };

export type RundownOptions = {
  now?: Date;
  /** Whether a habit occurrence was checked off. Defaults to the entry's own `done` flag. */
  isDone?: (habit: Entry) => boolean;
};

// FNV-1a: a cheap, stable string hash, so the same day and habit always pick the same line.
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(options: readonly T[], seed: string): T {
  return options[hash(seed) % options.length]!;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "a, b and c" */
function listOf(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

const timeOf = (e: Entry) => (e.endsAt ? formatClockRange(e.createdAt, e.endsAt) : formatClock(e.createdAt));

// ---- Plan: what's ahead -------------------------------------------------------------------------

const TIPS_NOW = [
  'Happening now, until {end}. Put your phone face down and give it the time.',
  "It's on right now. If you're running late, a shorter version still beats skipping it.",
  'This is the moment for it. Finish at {end} and the rest of the day is lighter.',
];

const TIPS_SOON = [
  'Starts in {wait}. Get what you need for it ready now so starting takes no effort.',
  "Coming up in {wait}. Wrap up what you're doing so you can switch over on time.",
  'In {wait}. A two-minute warning to yourself now makes it easier to actually start.',
];

const TIPS_BY_PERIOD: Record<ReturnType<typeof dayPeriod>, string[]> = {
  morning: [
    'Do it before messages and errands start piling up.',
    'Have everything you need for it ready, so starting takes no thinking.',
    'Tie it to something you already do every morning, like your first coffee.',
    'Mornings are when willpower is freshest. Use it on this before anything else.',
  ],
  afternoon: [
    'Afternoons get eaten by small tasks. Block the time and protect it.',
    'If your energy dips after lunch, a glass of water and a few minutes outside first will help.',
    "Set a reminder ten minutes before, so it doesn't slip past while you're busy.",
    'Treat it like a meeting with yourself: same importance, same start time.',
  ],
  evening: [
    "Decide now exactly when you'll start, so the evening doesn't decide for you.",
    "If the day has been long, keep it light. Showing up matters more than how hard you go.",
    'Do it before you sit down on the couch. Getting back up is the hard part.',
    'Get it done early in the evening and the rest of the night is free.',
  ],
  night: [
    "Late one. Keep it short and calm so it doesn't cost you sleep.",
    'Make it the last thing before bed, then call the day done.',
    'Keep it simple tonight. A small version still counts.',
  ],
};

function tipFor(habit: Entry, now: Date, seed: string): string {
  const start = new Date(habit.createdAt);
  const end = habit.endsAt ? new Date(habit.endsAt) : start;
  const minutesUntil = Math.round((start.getTime() - now.getTime()) / 60_000);

  if (minutesUntil <= 0) return fill(pick(TIPS_NOW, seed), { end: formatClock(end.toISOString()) });
  if (minutesUntil <= 45) return fill(pick(TIPS_SOON, seed), { wait: formatSpan(minutesUntil) });
  return pick(TIPS_BY_PERIOD[dayPeriod(start)], seed);
}

function writePlan(ahead: Entry[], day: Date, now: Date, isToday: boolean, isPast: boolean, seed: string): RundownSection {
  if (isPast) {
    return { headline: 'This day is behind you', summary: "There's nothing left to plan here. The recap shows what it held.", items: [] };
  }

  if (ahead.length === 0) {
    const period = dayPeriod(isToday ? now : day);
    const options = {
      morning: [
        ["Nothing else on the plan", 'No habits left today. A good day to jot down how things go as they happen.'],
        ['The day is wide open', "Nothing's scheduled. Use the space for whatever needs you most."],
      ],
      afternoon: [
        ['Free for the rest of the day', 'No habits left today. Maybe note down something good that happened so far.'],
        ['Nothing left on the list', 'The plan for today is clear. Enjoy the slack.'],
      ],
      evening: [
        ['The evening is yours', 'Nothing else planned tonight. A good moment to write down how today went.'],
        ['All clear for tonight', 'No habits left. Wind down your way.'],
      ],
      night: [
        ['Time to rest', 'Nothing else is planned. Put the phone away and get some sleep.'],
        ['Nothing left but sleep', 'The plan is done for today. Rest well, tomorrow starts fresh.'],
      ],
    }[period];
    const [headline, summary] = pick(options, `${seed}|empty`)!;
    return { headline: headline!, summary: summary!, items: [] };
  }

  const first = ahead[0]!;
  const last = ahead.at(-1)!;
  const firstStart = new Date(first.createdAt);
  const inProgress = isToday && firstStart <= now;

  const headline =
    ahead.length === 1
      ? fill(pick(['One more: {title}', 'Just {title} left', 'Still to come: {title}'], `${seed}|h1`), { title: first.title })
      : fill(pick(['{count} habits still ahead', '{count} things left on the plan', '{count} more to go today'], `${seed}|hn`), {
          count: String(ahead.length),
        });

  const sentences: string[] = [];
  if (inProgress) {
    sentences.push(`${first.title} is on right now, until ${formatClock(first.endsAt ?? first.createdAt)}.`);
  } else {
    const wait = Math.round((firstStart.getTime() - now.getTime()) / 60_000);
    sentences.push(
      isToday
        ? `Next up is ${first.title} at ${formatClock(first.createdAt)}, in ${formatSpan(wait)}.`
        : `The day starts with ${first.title} at ${formatClock(first.createdAt)}.`,
    );
  }
  if (ahead.length > 1) sentences.push(`The last one wraps up at ${formatClock(last.endsAt ?? last.createdAt)}.`);

  return {
    headline,
    summary: sentences.join(' '),
    items: ahead.map((habit) => ({
      title: habit.title,
      time: timeOf(habit),
      note: tipFor(habit, now, `${seed}|${habit.id}`),
      tone: 'tip' as const,
    })),
  };
}

// ---- Recap: what's happened ---------------------------------------------------------------------

// For a habit whose time passed today, while there's still day left to make it up.
const NUDGES_LATER = [
  "Didn't get to it? There's still time today, and ten minutes later beats zero.",
  'If it slipped by, try a smaller version tonight. Starting is the hard part, and it gets easier once you have.',
  "Missed the slot? Pick a new time for it right now, while it's on your mind.",
  "Not done yet? Tie it to something you'll do anyway later, like right after dinner.",
  "Running behind on this one happens. A quick version before bed still keeps you in the habit.",
];

// For a habit whose day is over (a past day, or late at night).
const NUDGES_NEXT_TIME = [
  'It slipped by this time. Set it up tonight so starting next time is easy.',
  'Not every day goes to plan. Next time, try it a little earlier, before the day fills up.',
  "One missed day doesn't undo a habit. What counts is showing up next time.",
  'Let this one go. Tomorrow is a fresh slot, so make it easy for yourself to start.',
];

const DONE_LINES = [
  "Done. That's one less thing hanging over the day.",
  'Checked off. Nice that you made the time.',
  'Finished. Days like this are how habits stick.',
];

const NOTES_BY_KIND: Record<Exclude<EntryKind, 'habit'>, string[]> = {
  memory: [
    'A moment worth keeping. Good that you wrote it down.',
    "This is the kind of thing that's nice to look back on.",
    'Saved. Future you will be glad to find this.',
  ],
  feeling: [
    'Noticing how you feel is half the work.',
    'Good that you checked in with yourself here.',
    'Written down, so you can see how your days feel over time.',
  ],
  thought: [
    'Out of your head and onto the page.',
    "Written down, so you don't have to keep holding on to it.",
    'Parked here for later. You can come back to it when the time is right.',
  ],
};

function countLogged(logged: Entry[]): string {
  const counts: [EntryKind, string, string][] = [
    ['memory', 'memory', 'memories'],
    ['feeling', 'feeling', 'feelings'],
    ['thought', 'thought', 'thoughts'],
  ];
  return listOf(
    counts
      .map(([kind, one, many]) => [logged.filter((e) => e.kind === kind).length, one, many] as const)
      .filter(([n]) => n > 0)
      .map(([n, one, many]) => plural(n, one, many)),
  );
}

function writeRecap(
  passed: Entry[],
  logged: Entry[],
  isDone: (habit: Entry) => boolean,
  now: Date,
  isToday: boolean,
  isPast: boolean,
  seed: string,
): RundownSection {
  if (!isToday && !isPast) {
    return { headline: 'Nothing yet', summary: "This day hasn't started. Come back once it has.", items: [] };
  }

  const done = passed.filter(isDone);
  const missed = passed.filter((h) => !isDone(h));
  const dayIsOver = isPast || dayPeriod(now) === 'night';
  const feelingTag = [...logged].reverse().find((e) => e.kind === 'feeling' && e.tag)?.tag;

  let headline: string;
  if (passed.length === 0 && logged.length === 0) {
    headline = isPast ? 'A quiet day' : pick(['A blank page so far', 'Quiet so far', 'Nothing written yet'], `${seed}|r0`);
  } else if (feelingTag) {
    headline = fill(pick(['A {tag} kind of day', 'Feeling {tag}', 'Mostly {tag}'], `${seed}|rf`), { tag: feelingTag });
  } else if (missed.length > 0 && done.length === 0 && logged.length === 0) {
    headline = pick(['Some habits slipped by', "Not the plan, and that's fine", 'A day to catch up on'], `${seed}|rm`);
  } else if (logged.length > 0) {
    headline = fill(pick(['{count} written down', 'A day with {count} in it', '{count} on the page'], `${seed}|rl`), {
      count: plural(logged.length, 'moment'),
    });
  } else {
    headline = pick(['Habits on track', 'Steady so far'], `${seed}|rd`);
  }

  const sentences: string[] = [];
  if (logged.length > 0) sentences.push(`${isPast ? 'You wrote down' : "You've written down"} ${countLogged(logged)}.`);
  if (passed.length > 0) {
    if (done.length === passed.length) {
      sentences.push(`All ${plural(passed.length, 'habit')} ${isPast ? 'were' : 'so far are'} done.`);
    } else if (done.length > 0) {
      sentences.push(`You finished ${done.length} of ${plural(passed.length, 'habit')}.`);
    }
    if (missed.length > 0) {
      sentences.push(
        dayIsOver
          ? `${plural(missed.length, 'habit')} slipped by. That's normal, so pick up again next time.`
          : `${plural(missed.length, 'habit')} slipped by, and there's still time to fit ${missed.length === 1 ? 'it' : 'them'} in later.`,
      );
    }
  }
  if (sentences.length === 0) {
    sentences.push(
      isPast
        ? 'Nothing was logged on this day.'
        : 'Nothing logged yet. Add a memory or a feeling when something stands out.',
    );
  }

  const items: RundownItem[] = [...passed, ...logged]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((entry) => {
      const itemSeed = `${seed}|${entry.id}`;
      if (entry.kind === 'habit') {
        if (isDone(entry)) return { title: entry.title, time: timeOf(entry), note: pick(DONE_LINES, itemSeed), tone: 'done' };
        return {
          title: entry.title,
          time: timeOf(entry),
          note: pick(dayIsOver ? NUDGES_NEXT_TIME : NUDGES_LATER, itemSeed),
          tone: 'nudge',
        };
      }
      return { title: entry.title, time: timeOf(entry), note: pick(NOTES_BY_KIND[entry.kind], itemSeed), tone: 'note' };
    });

  return { headline, summary: sentences.join(' '), items };
}

/** The Rundown for `day`, given that day's entries (habit occurrences included, as /today returns them). */
export function writeRundown(entries: Entry[], day: Date, { now = new Date(), isDone = (habit) => habit.done === true }: RundownOptions = {}): Rundown {
  const dateKey = toDateKey(day);
  const todayKey = toDateKey(now);
  const isToday = dateKey === todayKey;
  const isPast = dateKey < todayKey;
  const seed = dateKey;

  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const habits = sorted.filter((e) => e.kind === 'habit');
  const endOf = (e: Entry) => new Date(e.endsAt ?? e.createdAt);

  const ahead = isPast ? [] : habits.filter((h) => !isToday || endOf(h) > now);
  const passed = isPast ? habits : isToday ? habits.filter((h) => endOf(h) <= now) : [];
  const logged = sorted.filter((e) => e.kind !== 'habit' && (isPast || (isToday && new Date(e.createdAt) <= now)));

  return {
    plan: writePlan(ahead, day, now, isToday, isPast, seed),
    recap: writeRecap(passed, logged, isDone, now, isToday, isPast, seed),
  };
}
