# ADR-0001: Authentication & Session Model

## Status

Accepted

## Context

The realtime collaborative editor needs authenticated users, secure password storage, and a clear pattern for the SPA (`apps/web`) to call the API (`apps/api`) and later the realtime service (`apps/realtime`).

Requirements:

- Stateless API scaling (no server-side session store in Phase 1).
- Mitigate XSS exposure for long-lived credentials.
- Support access expiry without forcing full login on every short TTL.
- Separate **credentials** (email, password hash) from **public profile** fields (name, username).

## Decision

1. **Passwords**  
   - Stored only on the **`User`** collection, field `password`, **bcrypt**-hashed, **`select: false`** in Mongoose.

2. **Profile**  
   - **`Profile`** collection keyed by `userId` → `User._id`, with `username`, `firstName`, `lastName` (extensible).

3. **Tokens**  
   - **Access:** JWT (`HS256`), short TTL (default **15m**), claim `type: "access"`.  
     Sent by the client as **`Authorization: Bearer <access>`** and kept **in memory** on the frontend (not localStorage for the access token).
   - **Refresh:** JWT (`HS256`), longer TTL (default **7d**), claim `type: "refresh"`.  
     Delivered only via **`Set-Cookie`**: httpOnly cookie named **`token`**, `sameSite` **lax** (dev) / **strict** (prod), **`secure`** in production.

4. **Secrets**  
   - Separate env vars: **`JWT_ACCESS_SECRET`** and **`JWT_REFRESH_SECRET`** (distinct values in production).

5. **Endpoints** (base path **`/api/auth`**)  
   - `POST /register` — creates `User` + `Profile` (transaction when MongoDB supports it).  
   - `POST /login`  
   - `POST /logout` — clears refresh cookie.  
   - `POST /refresh` — reads refresh cookie, returns new **access** in JSON, rotates refresh cookie.  
   - `GET /me` — **requires** valid access token (`requireAuth`).

6. **Registration / MongoDB**  
   - Multi-document registration uses **`withTransaction`** when the deployment is a **replica set** (e.g. Atlas). Standalone MongoDB does not support transactions; use Atlas or a local replica set for that path.

## Consequences

- **Positive:** Refresh token not readable by JS (httpOnly); access can be dropped from memory on tab close; clear separation of User vs Profile data.
- **Tradeoffs:** Client must implement **refresh-on-401** (or proactive refresh); cross-origin setups need careful **CORS** + **`credentials: true`** alignment.
- **Follow-up:** WebSocket auth should validate **access** (or a dedicated ticket) per document room; rate limiting on `/auth/*` recommended before production.

## References

- Plan: [realtime-editor-execution-plan.md](../realtime-editor-execution-plan.md)
