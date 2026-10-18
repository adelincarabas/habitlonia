import { z } from 'zod';

/** What an entry is. The Today screen's tabs filter by these. */
export const EntryKind = z.enum(['memory', 'feeling', 'action', 'thought']);
export type EntryKind = z.infer<typeof EntryKind>;

export const Entry = z.object({
  id: z.string(),
  kind: EntryKind,
  title: z.string().min(1),
  /** Longer free text, written on the entry's detail screen. */
  description: z.string().optional(),
  /** Short mood/descriptor shown under the title, e.g. "thankful". */
  tag: z.string().optional(),
  /** ISO timestamp of when it happened; the start time for actions. */
  createdAt: z.string(),
  /** ISO timestamp an action ended. Only actions have one. */
  endsAt: z.string().optional(),
  /** Hex color used for the timeline dot and the day ring. */
  color: z.string(),
});
export type Entry = z.infer<typeof Entry>;

/** The longer "what happened?" text. Trimmed; an empty one means none. */
const EntryDescription = z.string().trim().max(5000);

/** Memories, feelings and thoughts happen at one moment; actions span a start-to-end range. */
export const CreateEntryInput = Entry.pick({ kind: true, title: true, tag: true, color: true })
  .extend({
    description: EntryDescription.optional(),
    createdAt: z.iso.datetime(),
    endsAt: z.iso.datetime().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.kind !== 'action') {
      if (input.endsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Only actions have an end time' });
      return;
    }
    if (!input.endsAt) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Actions need an end time' });
    } else if (Date.parse(input.endsAt) <= Date.parse(input.createdAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'An action must end after it starts' });
    }
  });
export type CreateEntryInput = z.infer<typeof CreateEntryInput>;

/** Edits made on the detail screen. An empty description clears it. */
export const UpdateEntryInput = z.object({
  title: z.string().trim().min(1, 'Give it a title').max(200).optional(),
  description: EntryDescription.optional(),
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
