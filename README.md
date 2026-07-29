# Pulseboard

Know what's broken, what's working, and what to post next.

**Status:** Phase 0 in progress (Argon2id locked). Phase 1 (Instagram) starts after you sign **S0**.

## Docs (source of truth)

| Doc | Purpose |
|---|---|
| [Complete SDLC](docs/Pulseboard-Complete-SDLC.md) | Full build / security / phase spec |
| [Phase 0 restatement](docs/phase-0-restatement.md) | Build · Security · Tests · Human inputs |
| [Scalability addendum](docs/scalability-addendum.md) | Seams so scaling does not become an issue |
| [Full project needs trace](docs/full-project-needs-trace.md) | Everything needed S0→S7 |
| [Agent roster](docs/agent-roster.md) | Roles + which phases spin multi-agents |
| [UI direction](docs/ui-direction-phase-0.md) | Palette, type, hero, motion |
| [Locked prompts](docs/locked-prompts.md) | Operating rules for AI agents |
| [Threat model](docs/threat-model.md) | Phase 0 ATT&CK seed |
| [Runbook](docs/runbook.md) | Local bootstrap + scale notes |

## Local run (Phase 0)

1. Start **Docker Desktop**, then: `docker compose up -d`
2. Ensure `.env` exists (from `.env.example`) with `TOKEN_ENCRYPTION_KEY` + `SESSION_SECRET`
3. `npm install` (if lockfile/bin links incomplete, re-run until `node_modules/.bin` exists)
4. `npx prisma migrate deploy` (or `npx prisma db push`)
5. `npm run db:seed` — creates the reusable demo login
6. `npm run dev` → http://localhost:3000
7. `npm test` — unit tests (Argon2id, AES-GCM, seams, logger)

### Demo login (local only)

| Field | Value |
|---|---|
| Email | `demo@pulseboard.local` |
| Password | `pulseboard-demo` |

Re-run `npm run db:seed` anytime to reset that password.

## Next Human action

1. **Start Docker Desktop** so Postgres can run (needed for signup/login UAT)
2. After app is up: UAT landing brand/3D, signup→Overview→logout, mobile + reduced-motion
3. Sign S0 in `docs/phase-0-security-exit.md` when happy
4. Create empty GitHub repo when ready to push approved Phase 0
5. **Phase 1 later:** Meta developer app + Instagram account (not needed yet)
