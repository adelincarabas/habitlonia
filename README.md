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

| Env var (API) | Purpose |
| --- | --- |
| `JWT_SECRET` | Signing key for tokens. **Required when `NODE_ENV=production`**; in dev a random one is used, so restarting the API logs everyone out. |
| `DATABASE_PATH` | SQLite file location (default `./data/habitlonia.db`, or `:memory:`). |

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
