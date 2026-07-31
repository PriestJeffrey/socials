# Pulseboard - gstack harden pass (phase-18 tip)

**Date:** 2026-07-30  
**Branch:** `harden/gstack-sec-phase18`  
**Review:** Security Review subagent vs gstack residual

## Findings fixed (code)

| Sev | Finding | Fix |
|---|---|---|
| Medium | Predictable `CRON_SECRET` compose default | Compose requires env; runtime rejects placeholders |
| Medium | Predictable `SESSION_SECRET` compose default | Compose requires env; OAuth state uses `requireStrongSecret` |
| Medium | AI draft body in redirect query string | Encrypted httpOnly flash cookie (`lib/flash/draft-suggest.ts`) |

## Already solid (verified)

Timing-safe cron compare · anonymous health liveness · OAuth HMAC state + session bind · Wave B L9 redact · AES tokens · tenancy on sync/disconnect/publish · live publish refuse when fixtures off

## Human / residual (unchanged)

CSP `unsafe-inline`/`unsafe-eval` · TLS/host · real Sentry SDK · shared Redis rate-limit · prod cron schedule
