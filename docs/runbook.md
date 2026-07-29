# Pulseboard Runbook (stub) — Phase 0

## Local bootstrap
1. `docker compose up -d`
2. Copy `.env.example` → `.env` and set `TOKEN_ENCRYPTION_KEY` + `SESSION_SECRET`
3. `npm install`
4. `npx prisma migrate dev --name init`
5. `npm run dev`

## Read path vs sync path
- Overview reads DB snapshots only (empty in Phase 0).
- Never call platform APIs from Overview RSC.
- Sync belongs in `JobQueue` workers (Phase 1+).

## Connection exhaustion (later)
- Prefer pooled `DATABASE_POOL_URL` at deploy; keep `DATABASE_URL`/`DIRECT_URL` for migrations.

## When to enable Redis
- Multi-instance rate-limit bypass or hot Overview cache misses after S6.

## Migrate vs runtime URL
- Runtime: pooled. Migrate: direct. Never migrate from request path.
