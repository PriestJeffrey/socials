# Pulseboard — Phase 1 exit (draft)

**Status:** Implementation complete — awaiting Human UAT + S1 sign.  
**Date:** 2026-07-29

## Delivered

- Meta OAuth start/callback (+ `META_USE_FIXTURES` local path)
- `SocialConnection` tokens AES-256-GCM at rest
- Sync jobs → `Post` + `MetricSnapshot`; Overview from snapshots only
- Settings Connect / Disconnect / Sync now
- Health phase 1 + Instagram subsystem
- Tests: `tests/integration/phase1-instagram.test.ts`

## Security residual (accept at S1)

- ATT&CK: Credential Access (stolen session → connect abuse) mitigated by session hash + OAuth state
- Fixture mode must stay off in production (`META_USE_FIXTURES≠true`)

## gstack

- Restatement: `docs/phase-1-restatement.md`
- Pre-sign: `/review` notes below; `/qa` optional after Human connects Meta or fixtures

### /review notes (AI)

- Tenancy on connectionId checks in actions + sync
- Callback redacts token-ish words from error redirects
- Overview never calls Graph
- Open follow-ups: rate-limit OAuth start; cron for pending jobs in prod

## Human UAT checklist

1. `META_USE_FIXTURES=true` → Settings → Connect Instagram → Overview shows cards
2. Health shows Instagram ok
3. Disconnect clears connection; Overview empty again (after cache TTL or new sync)
4. (Optional) Real Meta app: set APP_ID/SECRET, redirect URI, fixtures off
