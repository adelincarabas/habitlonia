import { randomUUID } from 'node:crypto';
import type { CreateEntryInput, Entry, FocusSession, MessageOfTheDay } from '@habitlonia/shared';

// Everything is stored in memory for now. When we add a real database,
// only this file needs to change.

// Returns an ISO date string for "X days ago at hour:minute"
function makeDate(daysAgo: number, hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const colors = ['#2B4BDB', '#A63D2A', '#8E2E4F', '#E8A23A', '#E86BA0', '#5B4E8C', '#E85A3A'];

const entries: Entry[] = [
  {
    id: randomUUID(),
    kind: 'memory',
    title: 'the walk home after the hike',
    tag: 'thankful',
    createdAt: makeDate(0, 6, 55),
    color: '#2B4BDB',
  },
  {
    id: randomUUID(),
    kind: 'thought',
    title: 'call her back later today',
    createdAt: makeDate(0, 1, 4),
    color: '#A63D2A',
  },
  {
    id: randomUUID(),
    kind: 'feeling',
    title: 'calm after coffee',
    tag: 'calm',
    createdAt: makeDate(0, 8, 10),
    color: '#E86BA0',
  },
  {
    id: randomUUID(),
    kind: 'action',
    title: 'stretched for 10 minutes',
    createdAt: makeDate(0, 7, 30),
    color: '#E8A23A',
  },
  {
    id: randomUUID(),
    kind: 'scene',
    title: 'fog over the river',
    createdAt: makeDate(0, 6, 20),
    color: '#5B4E8C',
  },
];

// Add two fake memories for each of the last 6 days so the week strip has some color
for (let day = 1; day <= 6; day++) {
  entries.push({
    id: randomUUID(),
    kind: 'memory',
    title: `earlier memory from ${day} days ago`,
    createdAt: makeDate(day, 9, 0),
    color: colors[day % colors.length]!,
  });
  entries.push({
    id: randomUUID(),
    kind: 'memory',
    title: `another memory from ${day} days ago`,
    createdAt: makeDate(day, 10, 0),
    color: colors[(day + 3) % colors.length]!,
  });
}

let focus: FocusSession = {
  id: 'focus-1',
  label: 'coding laniday',
  runningSince: new Date().toISOString(),
  accumulatedSeconds: 3 * 3600 + 45 * 60 + 39, // 3:45:39
};

const messageOfTheDay: MessageOfTheDay = {
  id: 'motd-1',
  text: 'the plants moved like my own fingers in the wind',
};

export function getAllEntries(): Entry[] {
  return entries;
}

export function addEntry(input: CreateEntryInput): Entry {
  const newEntry: Entry = {
    id: randomUUID(),
    kind: input.kind,
    title: input.title,
    tag: input.tag,
    color: input.color,
    createdAt: new Date().toISOString(),
  };
  entries.push(newEntry);
  return newEntry;
}

export function getFocus(): FocusSession {
  return focus;
}

// Pauses the focus timer if it's running, starts it again if it's paused
export function toggleFocus(id: string): FocusSession | null {
  if (focus.id !== id) {
    return null;
  }

  const now = new Date();

  if (focus.runningSince) {
    // Pause: save the time that passed since it was started
    const startedAt = new Date(focus.runningSince);
    const secondsPassed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    focus = {
      id: focus.id,
      label: focus.label,
      runningSince: null,
      accumulatedSeconds: focus.accumulatedSeconds + secondsPassed,
    };
  } else {
    // Resume
    focus = {
      id: focus.id,
      label: focus.label,
      runningSince: now.toISOString(),
      accumulatedSeconds: focus.accumulatedSeconds,
    };
  }

  return focus;
}

export function getMessageOfTheDay(): MessageOfTheDay {
  return messageOfTheDay;
}
