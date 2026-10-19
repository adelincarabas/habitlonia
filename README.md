# habitlonia

Habit tracker for iOS, Android and web. One TypeScript monorepo (pnpm workspaces + Turborepo).

```
apps/
  mobile/     Expo SDK 58 + Expo Router + NativeWind. Screens are thin; they compose shared hooks.
  api/        Hono on Node. Validates with the same zod schemas the app uses.
packages/
  shared/     Types (zod), business rules, typed API client, React Query hooks.
```

## Getting started

```sh
pnpm install
pnpm dev:api       # http://localhost:4000
pnpm dev:mobile    # then press i / a / w for iOS, Android, web
```

On a physical device, copy `apps/mobile/.env.example` to `apps/mobile/.env` and point
`EXPO_PUBLIC_API_URL` at your computer's LAN IP.

## Accounts

The API has register/login (`/auth/register`, `/auth/login`, `/auth/me`) backed by SQLite
(`apps/api/data/habitlonia.db`, created on first run, git-ignored). Passwords are never stored,
only a salted scrypt hash. A login returns a signed JWT (30 days) that the app keeps in the device
keychain and sends as `Authorization: Bearer ...`. `/today`, `/entries` and `/focus/*` require it.

Entries (memories, thoughts, feelings, actions) live in the same SQLite file, one row per entry,
owned by the user who saved it. A new account starts with none, and `/today` only ever returns
the logged-in user's own entries. Focus and the message of the day are still in-memory placeholders.

Forgot password: `/auth/forgot-password` emails a 6-digit code (valid 15 minutes, 5 tries, one new code
per minute) and `/auth/reset-password` trades it plus a new password for a session. Codes are sent with
Resend when `RESEND_API_KEY` is set; without it, dev prints them in the `pnpm dev:api` terminal and
production refuses to start a reset.

Rundown: the Rundown screen (the "Rundown" button on Today) shows a plan for the rest of the day and a recap
of what's happened. It's written by hand-made rules, no AI (`packages/shared/src/rules/rundown.ts`): tips for
upcoming habits, a note per logged memory/feeling/thought, and a nudge for each habit whose time passed
without being checked off.

Habits are checked off with the circle next to them on Today (or on their detail screen). A repeating
habit's occurrence is saved as an entry the first time it's checked, like when it's edited. The profile
shows a chart of habits done vs. missed (last week, month or 3 months), and its calendar button opens a
year view where days with a habit done are blue; tapping a day opens that day's Rundown. Both read
`/history?from=…&to=…`.

Put API secrets in `apps/api/.env` (git-ignored; see `.env.example`). `pnpm dev:api` loads it.

| Env var (API) | Purpose |
| --- | --- |
| `JWT_SECRET` | Signing key for tokens. **Required when `NODE_ENV=production`**; in dev a random one is used, so restarting the API logs everyone out. |
| `DATABASE_PATH` | SQLite file location (default `./data/habitlonia.db`, or `:memory:`). |
| `RESEND_API_KEY`, `MAIL_FROM` | Sending password reset emails. |

Requires Node 22.13+ (uses the built-in `node:sqlite`).

## Where code goes

| What | Where |
| --- | --- |
| Data shapes, request/response contracts | `packages/shared/src/types.ts` |
| Pure rules (dates, streaks, filtering) | `packages/shared/src/rules/` (unit-tested with vitest) |
| HTTP calls | `packages/shared/src/api/client.ts` |
| React hooks (queries, mutations, timers) | `packages/shared/src/hooks/` (import from `@habitlonia/shared/hooks`) |
| Presentational components | `apps/mobile/src/components/` |
| Routes / screens | `apps/mobile/src/app/` |
| HTTP routes, persistence | `apps/api/src/` |

## Scripts

`pnpm typecheck`, `pnpm test`, `pnpm build` run across every workspace via Turborepo.
