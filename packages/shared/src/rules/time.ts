import type { FocusSession } from '../types';

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "2026-10-18" -> local midnight of that day, or null if it isn't a YYYY-MM-DD date. */
export function fromDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  return toDateKey(date) === key ? date : null;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** "9:05" or "09:05" -> minutes since midnight, or null if it isn't a 24-hour time. */
export function parseClock(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes since midnight -> "09:05". */
export function clockText(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The moment `minutes` past midnight on `day`. */
export function atClock(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
}

/**
 * Places a start/end clock time on `day`. An end before the start is read as the next day,
 * so 22:00–02:00 spans midnight. Returns null for a zero-length range.
 */
export function clockRangeOn(day: Date, startMinutes: number, endMinutes: number): { start: Date; end: Date } | null {
  if (startMinutes === endMinutes) return null;
  const start = atClock(day, startMinutes);
  const end = atClock(endMinutes < startMinutes ? addDays(day, 1) : day, endMinutes);
  return { start, end };
}

/** 270 -> "4h 30m", 60 -> "1h", 45 -> "45m" */
export function formatSpan(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** The Sunday-to-Saturday week containing `date`. */
export function weekOf(date: Date): Date[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  return Array.from(
    { length: 7 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/** Local-time part of the day: night runs 22:00-04:59. */
export function dayPeriod(date: Date): DayPeriod {
  const h = date.getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  if (h < 22) return 'evening';
  return 'night';
}

/** True from evening until morning, when the sky is dark. */
export const isDarkOut = (date: Date) => {
  const period = dayPeriod(date);
  return period === 'evening' || period === 'night';
};

const GREETINGS: Record<DayPeriod, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
};

export function greetingFor(date: Date): string {
  return GREETINGS[dayPeriod(date)];
}

/** 13419 -> "3:43:39" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const seconds = String(s % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/** "6:55" style clock time, 12-hour without am/pm, as in the timeline. */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "10:00–2:00", for habits on the timeline. */
export function formatClockRange(startIso: string, endIso: string): string {
  return `${formatClock(startIso)}–${formatClock(endIso)}`;
}

export function focusElapsedSeconds(session: FocusSession, now: Date = new Date()): number {
  if (!session.runningSince) return session.accumulatedSeconds;
  const running = (now.getTime() - new Date(session.runningSince).getTime()) / 1000;
  return session.accumulatedSeconds + Math.max(0, running);
}
