# Realtime Collaborative Editor

A MERN-based real-time collaborative editor built with React, Node.js, MongoDB, WebSockets, and Yjs (CRDT).  
The project targets Google Docs-like collaboration: multi-user editing, live cursor presence, conflict-free sync, and version history.

## Tech Stack

- **Frontend:** React + Vite + Tailwind
- **API:** Node.js + Express + JWT auth + document/collaborator ACL (`apps/api`)
- **Realtime:** Node.js + WebSocket + Yjs (planned)
- **Database:** MongoDB ([Atlas](https://www.mongodb.com/atlas) recommended)
- **Cache/PubSub:** Redis (for scale-out; optional locally)
- **Monorepo:** pnpm workspaces + Turborepo

## Monorepo Structure

```text
apps/
  web/        # React client
  api/        # REST API (auth, documents, collaborators)
  realtime/   # WebSocket/Yjs server
packages/
  shared/     # Shared types/contracts
docs/
  realtime-editor-execution-plan.md
  adr/
    0001-authentication.md
infra/
  docker-compose.yml
```

## Prerequisites

- Node.js (recommended: 20 LTS)
- pnpm
- Docker (for Redis; optional local Mongo via compose profile)

## Environment Variables

Copy `.env.example` to `.env` at the repo root and set:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string. For Atlas use `mongodb+srv://.../dbname?...` — database name must be in the **path** (`/dbname`), not as a lone query param. |
| `JWT_ACCESS_SECRET` | Secret for signing **access** JWTs |
| `JWT_REFRESH_SECRET` | Secret for signing **refresh** JWTs |
| `PORT` | API listen port (defaults to **4000** in `apps/api` if unset) |
| `API_PORT` | Documented convention / tooling; align with `PORT` for local runs |
| `RT_PORT` | Realtime port |
| `WEB_PORT` | Vite dev port |
| `REDIS_URL` | Redis (when used) |
| `NODE_ENV` | `development` / `production` |

## Auth API (`/api/auth`)

Base URL: `http://localhost:<PORT>/api/auth` (default port **4000**).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | — | Creates **User** + **Profile**; returns `{ profile }` (no tokens — client typically logs in next) |
| `POST` | `/login` | — | Returns `{ accessToken, profile }`; sets refresh **httpOnly** cookie `token` |
| `POST` | `/logout` | — | Clears refresh cookie |
| `POST` | `/refresh` | Refresh cookie | Returns new `{ accessToken }`, rotates refresh cookie |
| `GET` | `/me` | `Authorization: Bearer <access>` | Loads **Profile** for the current user |

**JWT payload (access & refresh):** `sub` (User id), `email`, `profileId` (**Profile** id for ACL on documents/collaborators). Use **`profileId`** when comparing to `Document.ownerId` and collaborator rows.

**Frontend:** keep **access** in memory; send **`Authorization: Bearer`** on protected routes; use **`credentials: 'include'`** for cookie-based routes (`login`, `logout`, `refresh`). On **401**, call **`/refresh`** then retry.

Architecture: [docs/adr/0001-authentication.md](docs/adr/0001-authentication.md).

## Documents API (`/api/documents`)

All routes require **`Authorization: Bearer <access>`** (`requireAuth`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Lists documents the user **owns** or **collaborates** on; each item includes a `permissions` summary |
| `GET` | `/:id` | Single document (read: owner or collaborator) |
| `POST` | `/` | Create document (caller becomes **owner** via `ownerId` = JWT `profileId`) |
| `PUT` | `/:id` | Update title/content (**owner** or **editor** collaborator) |
| `DELETE` | `/:id` | Delete document (**owner** only) |

**Models:** `Document` (`ownerId` → Profile); collaborator memberships live in the **Collaborator** collection (see below).

## Collaborators API (`/api/documents/:documentId/collaborators`)

Mounted with **`mergeParams`** so `documentId` is available on nested routes. All routes require **Bearer** auth.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List collaborators for the document (+ owner in enriched payload) — **reader** or above |
| `GET` | `/:id` | Single membership row — `:id` is the **Collaborator** document `_id` |
| `POST` | `/` | Add collaborator (**owner** only); body includes `profileId`, `role` (`editor` \| `viewer`) |
| `PUT` | `/:id` | Update role — `:id` = Collaborator `_id` (**owner** only) |
| `DELETE` | `/:id` | Remove collaborator — `:id` = Collaborator `_id` (**owner** only) |

ACL checks live in **`apps/api/src/utils/documentAcl.ts`** (throws structured failures; controllers use **`catchAcl`** to respond with **403** / **404**).

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Start infra:

- **MongoDB:** [Atlas](https://www.mongodb.com/atlas) (`MONGO_URI` in `.env`), **or** local Mongo:

```bash
docker compose -f infra/docker-compose.yml --profile local-mongo up -d
```

- **Redis** (optional until features need it):

```bash
docker compose -f infra/docker-compose.yml up -d
```

3. Start all apps from repo root:

```bash
pnpm dev:all
```

### Service URLs

- Web: `http://localhost:5173` (or the port in `apps/web` dev script)
- API health: `http://localhost:4000/health` (or your `PORT`)
- Realtime WS: `ws://localhost:4001` (when `apps/realtime` is running)

## Root Scripts

- `pnpm dev:all` - Run all app `dev` tasks through Turbo
- `pnpm build:all` - Build all packages/apps
- `pnpm lint:all` - Lint all packages/apps
- `pnpm typecheck:all` - Run TypeScript checks across workspace

## Current Status

- **Phase 1 — Auth:** User + Profile, JWT access + refresh cookie, `profileId` on tokens, `/api/auth/*`.
- **Phase 2 — Documents + ACL (API):** `Document` + `Collaborator` models; document CRUD; nested collaborator routes; owner / editor / viewer rules via `documentAcl` + `catchAcl`.
- **Next:** Phase 3 — Realtime (WebSocket auth, rooms, presence).

## Roadmap

1. ~~Auth foundation~~
2. ~~Document CRUD + ACL (REST)~~
3. Realtime room auth + presence events
4. Yjs collaborative sync + cursor awareness
5. Snapshot persistence + version history restore
6. Production hardening (Redis scale-out, security, tests, observability)

Detailed plan: [docs/realtime-editor-execution-plan.md](docs/realtime-editor-execution-plan.md).
