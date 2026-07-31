# Pulseboard - Security review (v1-core)

**Date:** 2026-07-31  
**Branch:** `v1-core`  
**gstack:** `/cso` / security-review subagent  
**Mode:** Report initially; mediums closed in `docs/gstack-fix-pass-v1-core.md`

## Verdict

No critical or high auth-bypass / cross-tenant issues found. Core controls look sound. **Prior mediums addressed** in the fix pass (see below). Several accepted residuals remain.

## Findings (original) → status

| Severity | Location | Finding | Status |
|---|---|---|---|
| Medium | `app/actions/create.ts` | AI draft body in redirect URL `body=…` | **Fixed** - `setDraftSuggestFlash` + `/create?suggested=1&platform=` only |
| Medium | `docker-compose.yml` | Postgres on `5432` with default creds | **Fixed** - `127.0.0.1:5432` bind; `POSTGRES_*` overridable |
| Medium (ops) | `lib/ai/providers/gemini.ts` | API key in `?key=` URL | **Fixed** - `x-goog-api-key` header |

## Sound (no medium+ issue)

Auth/sessions (Argon2id, hashed cookies) · AES-GCM tokens · OAuth HMAC state + session bind · `userId` tenancy · publish fixture gate · cron fail-closed · L9 AI redact · account delete confirm · public `/api/health` liveness-only · compose requires strong `SESSION_SECRET` / `TOKEN_ENCRYPTION_KEY` / `CRON_SECRET`

## Accepted residual (post-V1 / harden backlog)

| Item | Notes |
|---|---|
| CSP `unsafe-inline` / `unsafe-eval` | No XSS sink demonstrated; tighten later |
| In-memory rate limit | Multi-instance bypass - Redis later |
| Live Meta Graph publish | Deferred until credentials |
| Demo seed user | Local only - never seed prod |
| Default local Postgres password | Loopback-only; set strong `POSTGRES_PASSWORD` off-local |

## Human next

UAT S2–S6 per `docs/v1-core-ship.md`. Re-run Security Review on uncommitted fix-pass diff before commit/push if shipping.
