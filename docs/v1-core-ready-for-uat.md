# Pulseboard - V1 core ready for Human UAT

**Branch:** `v1-core`  
**Date:** 2026-07-31  
**Status:** Engineering close-out finishing (push before UAT if local ahead of origin) · **S2–S6 await Human sign** · Wave B frozen

## What’s in V1

Instagram · Facebook · LinkedIn (OAuth + fixtures + analytics) · X (compose + copy only).  
Auth, Overview, Create/calendar/publish (fixture-honest), AI paths, approvals, Health, analytics hub. Health phase **8**.

## What’s deferred

Live Meta/LinkedIn Graph publish · Wave B platforms · hosting/TLS/Sentry go-live · Redis rate-limit / CSP tighten (accepted residuals).

## Demo login (local)

`demo@pulseboard.local` / `pulseboard-demo` → http://localhost:3000/login  
(`npm run db:seed` if missing.) Fixtures on; rebuild: `docker compose up -d --build --force-recreate app`.

## Sign order

Reply when green: `S2 signed` → `S3 signed` → `S4 signed` → `S5 signed` → `S6 signed`.  
Checklists: **[docs/v1-core-ship.md](v1-core-ship.md)**. Do not `/ship` until all five are signed.

## Freeze

No Wave B without Human **names a platform + go**. Scope: [docs/scope-freeze-v1-core.md](scope-freeze-v1-core.md).
