import { z } from 'zod';

/** The four lenses the Today screen can filter by. */
export const EntryKind = z.enum(['memory', 'feeling', 'action', 'scene', 'thought']);
export type EntryKind = z.infer<typeof EntryKind>;

export const Entry = z.object({
  id: z.string(),
  kind: EntryKind,
  title: z.string().min(1),
  /** Short mood/descriptor shown under the title, e.g. "thankful". */
  tag: z.string().optional(),
  /** ISO timestamp. */
  createdAt: z.string(),
  /** Hex color used for the timeline dot and the day ring. */
  color: z.string(),
});
export type Entry = z.infer<typeof Entry>;

export const CreateEntryInput = Entry.pick({ kind: true, title: true, tag: true, color: true });
export type CreateEntryInput = z.infer<typeof CreateEntryInput>;

export const FocusSession = z.object({
  id: z.string(),
  label: z.string(),
  /** ISO timestamp of the most recent (re)start, null while paused. */
  runningSince: z.string().nullable(),
  /** Seconds accumulated before `runningSince`. */
  accumulatedSeconds: z.number().int().nonnegative(),
});
export type FocusSession = z.infer<typeof FocusSession>;

export const MessageOfTheDay = z.object({
  id: z.string(),
  text: z.string(),
  mediaUrl: z.string().optional(),
});
export type MessageOfTheDay = z.infer<typeof MessageOfTheDay>;

export const DaySummary = z.object({
  /** YYYY-MM-DD */
  date: z.string(),
  /** Up to two colors that tint the day bubble. */
  colors: z.array(z.string()).max(2),
});
export type DaySummary = z.infer<typeof DaySummary>;

export const TodayResponse = z.object({
  messageOfTheDay: MessageOfTheDay.nullable(),
  focus: FocusSession.nullable(),
  entries: z.array(Entry),
  week: z.array(DaySummary),
});
export type TodayResponse = z.infer<typeof TodayResponse>;
