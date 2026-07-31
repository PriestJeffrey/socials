# Pulseboard Runbook - Phase 8

## Local bootstrap
1. `docker compose up -d postgres`
2. Copy `.env.example` → `.env`; set `TOKEN_ENCRYPTION_KEY` + `SESSION_SECRET`
3. `npm install`
4. `npx prisma migrate deploy`
5. `npm run db:seed` (demo: `demo@pulseboard.local` / `pulseboard-demo`)
6. `npm run dev`

## Docker (full stack)
1. Copy `.env.example` → `.env` and set **strong** secrets (no placeholders):
   - `SESSION_SECRET` (≥16 chars, random)
   - `TOKEN_ENCRYPTION_KEY` (32-byte base64)
   - `CRON_SECRET` (≥16 chars, random - required for compose; no default)
2. `docker compose up --build` (compose **fails** if secrets are unset)
3. App: http://localhost:3000 - migrate runs on container start

**Do not** commit or reuse compose placeholders like `dev-cron-secret-change-me` or `replace-with-long-random-string-min-32-chars` - the app rejects them.

## Production deploy checklist
1. Provision Postgres (pooled URL for runtime; direct URL for migrate)
2. Set secrets: `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, platform keys or fixtures flags
3. `COOKIE_SECURE=true` and HTTPS/`APP_URL` with `https://`
4. Build: `npm ci && npx prisma generate && npm run build`
5. Migrate: `npx prisma migrate deploy` (direct DB URL)
6. Start: `node .next/standalone/server.js` (or Docker image)
7. Schedule cron: `GET/POST /api/cron` with `Authorization: Bearer $CRON_SECRET` every minute
8. Smoke: `npm run smoke -- https://your-host`

## How to read Health / logs
- In-app: `/settings/health` - platform + AI + DB status
- Structured logs: JSON-ish via `lib/logging/logger` (never tokens/passwords)
- Optional: set `SENTRY_DSN` - stub logs until `@sentry/nextjs` is wired

## Incidents
| Symptom | Action |
|---|---|
| Auth failures spike | Rotate `SESSION_SECRET`; users re-login |
| Token decrypt errors | Do **not** rotate `TOKEN_ENCRYPTION_KEY` blindly - reconnect platforms after planned rotation |
| Sync stuck | Check Health last sync error; re-run Sync; drain `/api/cron` |
| Gemini quota | Set `GEMINI_USE_FIXTURES=true` or upgrade key |
| Bad deploy | Rollback image/commit; re-run migrate only forward |

## Rollback
1. Redeploy previous image/commit
2. Do not reverse migrations unless Human-approved down migration exists
3. Verify `/api/health` and smoke

## Security CI (L7)
- Lint · SAST (`npm run sast`) · tests · `npm audit --omit=dev --audit-level=critical` · gitleaks

## Windows SWC note
If Next prints `next-swc… is not a valid Win32 application`, clear `.next` and reinstall:
`npm install @next/swc-win32-x64-msvc@15.5.22 --force`
