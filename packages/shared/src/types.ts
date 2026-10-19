import { z } from 'zod';

/** What an entry is. The Today screen's tabs filter by these. */
export const EntryKind = z.enum(['memory', 'feeling', 'habit', 'thought']);
export type EntryKind = z.infer<typeof EntryKind>;

export const Entry = z.object({
  id: z.string(),
  kind: EntryKind,
  title: z.string().min(1),
  /** Longer free text, written on the entry's detail screen. */
  description: z.string().optional(),
  /** Short mood/descriptor shown under the title, e.g. "thankful". */
  tag: z.string().optional(),
  /** ISO timestamp of when it happened; the start time for habits. */
  createdAt: z.string(),
  /** ISO timestamp a habit ended. Only habits have one. */
  endsAt: z.string().optional(),
  /** Hex color used for the timeline dot and the day ring. */
  color: z.string(),
  /** Set when this entry is one day's occurrence of a repeating habit. */
  habitId: z.string().optional(),
  /** Whether a habit was checked off. Only habits have one; absent means not done. */
  done: z.boolean().optional(),
});
export type Entry = z.infer<typeof Entry>;

/** The longer "what happened?" text. Trimmed; an empty one means none. */
const EntryDescription = z.string().trim().max(5000);

/** Memories, feelings and thoughts happen at one moment; habits span a start-to-end range. */
export const CreateEntryInput = Entry.pick({ kind: true, title: true, tag: true, color: true })
  .extend({
    description: EntryDescription.optional(),
    createdAt: z.iso.datetime(),
    endsAt: z.iso.datetime().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.kind !== 'habit') {
      if (input.endsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Only habits have an end time' });
      return;
    }
    if (!input.endsAt) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Habits need an end time' });
    } else if (Date.parse(input.endsAt) <= Date.parse(input.createdAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'A habit must end after it starts' });
    }
  });
export type CreateEntryInput = z.infer<typeof CreateEntryInput>;

/** 0 = Sunday … 6 = Saturday, as in `Date.getDay()`. */
export const Weekday = z.number().int().min(0).max(6);

/** How often a habit comes back. Weekly repeats can skip every other week and pick several days. */
export const HabitRepeat = z.discriminatedUnion('every', [
  z.object({ every: z.literal('day') }),
  z.object({
    every: z.literal('week'),
    interval: z.union([z.literal(1), z.literal(2)]),
    weekdays: z.array(Weekday).min(1, 'Pick at least one day'),
  }),
]);
export type HabitRepeat = z.infer<typeof HabitRepeat>;

const ClockMinutes = z.number().int().min(0).max(24 * 60 - 1);

/** A repeating habit. Each day it lands on shows up as an entry with `habitId` set. */
export const Habit = z.object({
  id: z.string(),
  title: z.string().min(1),
  tag: z.string().optional(),
  color: z.string(),
  /** YYYY-MM-DD of the first day it can happen; biweekly repeats count weeks from here. */
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Local clock times as minutes since midnight. An end before the start runs past midnight. */
  startMinutes: ClockMinutes,
  endMinutes: ClockMinutes,
  repeat: HabitRepeat,
});
export type Habit = z.infer<typeof Habit>;

export const CreateHabitInput = Habit.omit({ id: true }).refine((h) => h.startMinutes !== h.endMinutes, {
  path: ['endMinutes'],
  message: 'A habit must end after it starts',
});
export type CreateHabitInput = z.infer<typeof CreateHabitInput>;
/** Edits made on the detail screen. An empty description clears it. `done` is ignored for anything but habits. */
export const UpdateEntryInput = z.object({
  title: z.string().trim().min(1, 'Give it a title').max(200).optional(),
  description: EntryDescription.optional(),
  done: z.boolean().optional(),
});
export type UpdateEntryInput = z.infer<typeof UpdateEntryInput>;

export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
/** Largest photo the API accepts, after decoding. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_ENTRY = 12;

export const EntryPhoto = z.object({
  id: z.string(),
  /** Path on the API, e.g. "/photos/<id>"; the client turns it into a full URL. */
  path: z.string(),
  createdAt: z.string(),
});
export type EntryPhoto = z.infer<typeof EntryPhoto>;

export const AddPhotoInput = z.object({
  mimeType: z.enum(PHOTO_MIME_TYPES),
  /** The image bytes, base64-encoded (no data: prefix). */
  data: z.base64().min(1),
});
export type AddPhotoInput = z.infer<typeof AddPhotoInput>;

/** One entry with everything its detail screen shows. */
export const EntryDetail = Entry.extend({ photos: z.array(EntryPhoto) });
export type EntryDetail = z.infer<typeof EntryDetail>;

/** What a DELETE answers. */
export const OkResponse = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponse>;

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

/** One day of habit check-offs, for the profile chart and the calendar. */
export const HabitDay = z.object({
  /** YYYY-MM-DD */
  date: z.string(),
  /** Habits checked off. */
  done: z.number().int().nonnegative(),
  /** Habits whose time ended without being checked off. */
  missed: z.number().int().nonnegative(),
});
export type HabitDay = z.infer<typeof HabitDay>;

export const HabitHistoryResponse = z.object({ days: z.array(HabitDay) });
export type HabitHistoryResponse = z.infer<typeof HabitHistoryResponse>;

/** Words for a health score, from kindest-sounding to best. None of them reads as failing. */
export const HabitHealthBand = z.enum(['resting', 'growing', 'steady', 'thriving']);
export type HabitHealthBand = z.infer<typeof HabitHealthBand>;

/** How habits have gone lately: a recency-weighted done rate, so one bad day fades instead of breaking anything. */
export const HabitHealth = z.object({
  /** 0–100. */
  score: z.number().int().min(0).max(100),
  band: HabitHealthBand,
  /** The last two weeks compared with the two before. */
  trend: z.enum(['up', 'down', 'level']),
});
export type HabitHealth = z.infer<typeof HabitHealth>;

/** Levels only ever go up: they count check-offs, never misses. */
export const HabitLevel = z.object({
  level: z.number().int().min(1),
  /** Every habit ever checked off. */
  totalDone: z.number().int().nonnegative(),
  /** Check-offs at which this level and the next one start. */
  levelStartsAt: z.number().int().nonnegative(),
  nextLevelAt: z.number().int().positive(),
});
export type HabitLevel = z.infer<typeof HabitLevel>;

export const MilestoneKey = z.enum([
  'first-step',
  'full-day',
  'good-week',
  'comeback',
  'steady-month',
  'done-25',
  'done-100',
  'done-365',
]);
export type MilestoneKey = z.infer<typeof MilestoneKey>;

export const Milestone = z.object({
  key: MilestoneKey,
  title: z.string(),
  description: z.string(),
  /** YYYY-MM-DD it was first reached, or null while it's still ahead. */
  earnedOn: z.string().nullable(),
});
export type Milestone = z.infer<typeof Milestone>;

export const ProgressResponse = z.object({
  /** Null until there's enough history to say anything. */
  health: HabitHealth.nullable(),
  level: HabitLevel,
  milestones: z.array(Milestone),
});
export type ProgressResponse = z.infer<typeof ProgressResponse>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});
export type User = z.infer<typeof User>;

export const RegisterInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  // bcrypt-style limits don't apply (we use scrypt), but cap length so hashing can't be abused.
  password: z.string().min(8, 'Use at least 8 characters').max(128),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ForgotPasswordInput = LoginInput.pick({ email: true });
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>;

export const ResetPasswordInput = RegisterInput.pick({ email: true, password: true }).extend({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from the email'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;

/** Same answer whether or not the email has an account, so the endpoint can't be used to probe for users. */
export const ForgotPasswordResponse = z.object({ ok: z.literal(true) });
export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponse>;

export const AuthResponse = z.object({
  token: z.string(),
  user: User,
});
export type AuthResponse = z.infer<typeof AuthResponse>;

export const TodayResponse = z.object({
  messageOfTheDay: MessageOfTheDay.nullable(),
  focus: FocusSession.nullable(),
  entries: z.array(Entry),
  week: z.array(DaySummary),
});
export type TodayResponse = z.infer<typeof TodayResponse>;

/** How much of the song each try unlocks, in seconds. A wrong guess or a skip moves to the next one. */
export const SONGLESS_CLIP_SECONDS = [0.1, 0.5, 1, 2, 4, 8] as const;

/** A song from the player's Spotify playlist that has a preview to play. */
export const SonglessSong = z.object({
  /** Spotify track id. */
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  /** The 30s preview: a full URL, or a path on the API (e.g. "/songless/preview/<id>") that redirects to one. */
  previewUrl: z.string(),
});
export type SonglessSong = z.infer<typeof SonglessSong>;

export const SonglessPlaylist = z.object({
  /** Spotify playlist id. */
  id: z.string(),
  /** The link it was added with. */
  link: z.string(),
  name: z.string(),
  songs: z.array(SonglessSong),
  /** Playlist tracks that had no preview anywhere and were left out. */
  skipped: z.number().int().nonnegative(),
});
export type SonglessPlaylist = z.infer<typeof SonglessPlaylist>;

/** A playlist the user has added before, listed on the Songless screen to switch back to. */
export const SavedSonglessPlaylist = SonglessPlaylist.pick({ id: true, link: true, name: true }).extend({
  songCount: z.number().int().nonnegative(),
  /** Its song of the day has already been played (won or lost). */
  playedToday: z.boolean(),
});
export type SavedSonglessPlaylist = z.infer<typeof SavedSonglessPlaylist>;

/** A try that didn't get the song: a skip, or a wrong pick from the playlist. */
export const SonglessAttempt = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('skip') }),
  z.object({ kind: z.literal('wrong'), song: SonglessSong }),
]);
export type SonglessAttempt = z.infer<typeof SonglessAttempt>;

export const SonglessRoundStatus = z.enum(['guessing', 'won', 'lost']);
export type SonglessRoundStatus = z.infer<typeof SonglessRoundStatus>;

/** A playlist's song of the day. Each playlist gets one round per day. */
export const SonglessRound = z.object({
  playlistId: z.string(),
  /** YYYY-MM-DD */
  date: z.string(),
  /** The song's 30s preview, same shape as SonglessSong.previewUrl. */
  previewUrl: z.string(),
  /** The answer, kept back until the round is over. */
  song: SonglessSong.nullable(),
  attempts: z.array(SonglessAttempt),
  status: SonglessRoundStatus,
  /** The memory written about the song once the round was over, if any. */
  memoryId: z.string().nullable(),
});
export type SonglessRound = z.infer<typeof SonglessRound>;

export const SonglessResponse = z.object({
  /** The playlist being played, or null before one is added. */
  playlist: SonglessPlaylist.nullable(),
  /** Every playlist the user has added, the one being played first. */
  playlists: z.array(SavedSonglessPlaylist),
  /** Today's round for `playlist`. */
  round: SonglessRound.nullable(),
});
export type SonglessResponse = z.infer<typeof SonglessResponse>;

/** One try in a round: a song picked from the playlist, or null to skip to a longer clip. */
export const SonglessTryInput = z.object({ songId: z.string().min(1).nullable() });
export type SonglessTryInput = z.infer<typeof SonglessTryInput>;

/** How the song made the user feel, saved as a memory after the round. */
export const SonglessMemoryInput = z.object({
  feeling: z.string().trim().min(1, 'Write a few words about it').max(5000),
});
export type SonglessMemoryInput = z.infer<typeof SonglessMemoryInput>;

/**
 * The id in a Spotify playlist link, as copied from the app's Share menu:
 * https://open.spotify.com/playlist/<id>?si=…, the /intl-xx/ variant, or spotify:playlist:<id>.
 */
export function parseSpotifyPlaylistId(link: string): string | null {
  const match = link.trim().match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?playlist\/|spotify:playlist:)([A-Za-z0-9]{22})/);
  return match ? match[1]! : null;
}

/** A playlist link pasted into the app. Anyone can paste one: no Spotify login is needed. */
export const ImportSonglessPlaylistInput = z.object({
  link: z.string().trim().max(500).refine((link) => parseSpotifyPlaylistId(link) !== null, {
    message: "That doesn't look like a Spotify playlist link",
  }),
});
export type ImportSonglessPlaylistInput = z.infer<typeof ImportSonglessPlaylistInput>;
