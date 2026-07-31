# Pulseboard

Know what's broken, what's working, and what to post next.

**Status:** V1 core on branch `v1-core` (IG · FB · LinkedIn · X copy-only). Engineering close-out done; Human UAT signs **S2–S6** next — see [docs/v1-core-ready-for-uat.md](docs/v1-core-ready-for-uat.md).

## Docs (source of truth)

| Doc | Purpose |
|---|---|
| [Live accounts setup](docs/live-accounts-setup.md) | Real Meta / LinkedIn OAuth + publish |
| [V1 ready for UAT](docs/v1-core-ready-for-uat.md) | Demo login + sign order |
| [V1 ship pack](docs/v1-core-ship.md) | S2–S6 checklists |
| [Complete SDLC](docs/Pulseboard-Complete-SDLC.md) | Full build / security / phase spec |
| [Scope freeze](docs/scope-freeze-v1-core.md) | Wave B paused |
| [Runbook](docs/runbook.md) | Local + Docker bootstrap |
| [Threat model](docs/threat-model.md) | ATT&CK + residuals |

## Local run (dev + Postgres)

1. Start **Docker Desktop**, then Postgres only: `docker compose up -d postgres`
2. Copy `.env.example` → `.env` with strong `TOKEN_ENCRYPTION_KEY` + `SESSION_SECRET` (and `CRON_SECRET` if you exercise cron)
3. `npm install`
4. `npx prisma migrate deploy` (or `npx prisma db push`)
5. `npm run db:seed` - creates the reusable demo login
6. `npm run dev` → http://localhost:3000
7. `npm test`

Do **not** use bare `docker compose up -d` for this path — that also starts the production `app` image on `127.0.0.1:3000` and requires `CRON_SECRET`, conflicting with `npm run dev`.

### Full Docker stack (optional)

With all secrets set in `.env`: `docker compose up -d --build` → http://localhost:3000 (loopback). Details: [docs/runbook.md](docs/runbook.md).

### Demo login (local only)

| Field | Value |
|---|---|
| Email | `demo@pulseboard.local` |
| Password | `pulseboard-demo` |

Re-run `npm run db:seed` anytime to reset that password.

## Next Human action

1. Fixture UAT per [docs/v1-core-ship.md](docs/v1-core-ship.md)
2. Reply `S2 signed` … `S6 signed` when green
3. Wave B only when you **name a platform + go**
