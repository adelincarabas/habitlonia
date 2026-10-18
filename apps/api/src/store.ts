import type { FocusSession, MessageOfTheDay } from '@habitlonia/shared';

// Focus and the message of the day still live in memory and are shared by everyone.
// Entries are per user and stored in SQLite (see entries.ts).

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
